import { env } from "@/env";

export type Email = { to: string; subject: string; text: string; html: string };

/**
 * Sends one email through Mailgun's HTTP API.
 * - Not configured, development: logs the message and succeeds.
 * - Not configured, production: throws, so the outbox retries and the gap is
 *   visible instead of silently dropping mail.
 */
export async function sendEmail(email: Email): Promise<void> {
  const { MAILGUN_API_KEY: key, MAILGUN_DOMAIN: domain } = env;
  if (!key || !domain) {
    if (env.NODE_ENV === "production") throw new Error("Mailgun is not configured");
    console.info(`[mail:dev] to=${email.to} subject="${email.subject}"\n${email.text}\n`);
    return;
  }

  const base = env.MAILGUN_REGION === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
  const res = await fetch(`${base}/v3/${domain}/messages`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`api:${key}`).toString("base64")}` },
    body: new URLSearchParams({
      from: env.MAIL_FROM,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Mailgun ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
