import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb, type Database } from "@/db";
import { account, session, user, verification } from "@/db/schema";
import { env } from "@/env";
import { drainOutboxSoon } from "./drain";
import { enqueueNotifications } from "./outbox";

/** Sessions and tokens are signed with this. A real secret is mandatory in production. */
function authSecret(): string {
  if (env.BETTER_AUTH_SECRET) return env.BETTER_AUTH_SECRET;
  if (env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET is required in production");
  return "development-only-secret-do-not-use-in-production";
}

/** Emails carry a callback URL; reuse its language prefix so the message matches the site the user was on. */
export function localeFromUrl(url: string): "ka" | "en" {
  return /\/en(\/|\?|$|%2F)/.test(decodeURIComponent(url)) ? "en" : "ka";
}

async function queueAuthEmail(kind: "auth.verify_email" | "auth.reset_password", to: { id: string; email: string; name: string }, url: string) {
  await enqueueNotifications(await getDb(), [
    {
      kind,
      channel: "email",
      recipient: to.email,
      locale: localeFromUrl(url),
      payload: { name: to.name, url },
      dedupeKey: `${kind}:${to.id}:${crypto.randomUUID()}`,
    },
  ]);
  // Not awaited: the response must not reveal how long sending took.
  void drainOutboxSoon();
}

function createAuth(db: Database) {
  return betterAuth({
    baseURL: env.NEXT_PUBLIC_SITE_URL,
    secret: authSecret(),
    database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      // Unverified addresses can't sign in, so nobody can claim someone else's email.
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user: u, url }) => queueAuthEmail("auth.reset_password", u, url),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user: u, url }) => queueAuthEmail("auth.verify_email", u, url),
    },

    user: {
      additionalFields: {
        // input:false = clients can never set this, so nobody can sign up as admin.
        role: { type: "string", required: false, defaultValue: "organizer", input: false },
        phone: { type: "string", required: false, input: true },
      },
    },

    plugins: [nextCookies()],
  });
}

const globalForAuth = globalThis as unknown as { __conferencehallAuth?: Promise<ReturnType<typeof createAuth>> };

/**
 * The auth instance, created on first use. It must not be built at import
 * time: Next also loads server modules in short-lived worker processes, and
 * opening the database there would fight the real server for it.
 */
export function getAuth() {
  globalForAuth.__conferencehallAuth ??= getDb().then(createAuth);
  return globalForAuth.__conferencehallAuth;
}

export type Session = Awaited<ReturnType<typeof getAuth>>["$Infer"]["Session"];

