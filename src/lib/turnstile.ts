import { env } from "@/env";

/**
 * Verifies a Cloudflare Turnstile token. When TURNSTILE_SECRET is not set
 * (local development) the check is skipped, so forms still work.
 */
export async function verifyTurnstile(token: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token }),
      signal: AbortSignal.timeout(5_000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false; // fail closed: an outage of the checker must not open the door to spam
  }
}
