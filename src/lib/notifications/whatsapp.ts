import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/env";

export type WhatsAppMessage = {
  to: string;
  kind: string;
  locale: string;
  text: string;
  template?: { template: string; params: string[] };
  data: Record<string, unknown>;
};

/** HMAC-SHA256 over `${timestamp}.${body}`; the timestamp blocks replays. */
export function signPayload(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

/** For the receiving side (and tests): constant-time signature check. */
export function verifySignature(secret: string, timestamp: string, body: string, signature: string): boolean {
  const expected = Buffer.from(signPayload(secret, timestamp, body));
  const given = Buffer.from(signature.replace(/^sha256=/, ""));
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Hands a WhatsApp message to the n8n workflow, which owns the WhatsApp
 * Business API call. The request is HMAC-signed so n8n can reject forgeries.
 * Same dev/production behaviour as email when unconfigured.
 */
export async function sendWhatsApp(msg: WhatsAppMessage): Promise<void> {
  const { N8N_WEBHOOK_URL: url, N8N_WEBHOOK_SECRET: secret } = env;
  if (!url || !secret) {
    if (env.NODE_ENV === "production") throw new Error("n8n webhook is not configured");
    console.info(`[whatsapp:dev] to=${msg.to} kind=${msg.kind}`);
    return;
  }

  const body = JSON.stringify(msg);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-conferencehall-timestamp": timestamp,
      "x-conferencehall-signature": `sha256=${signPayload(secret, timestamp, body)}`,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`n8n webhook ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
