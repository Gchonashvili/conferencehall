import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db";
import { notificationEvents, user } from "@/db/schema";
import { getAuth, localeFromUrl } from "./auth";

async function verificationUrlFor(email: string): Promise<string> {
  const rows = await (await getDb()).select().from(notificationEvents).where(eq(notificationEvents.recipient, email));
  const row = rows.find((r) => r.kind === "auth.verify_email");
  if (!row) throw new Error("no verification email queued");
  return String(row.payload.url);
}

let auth: Awaited<ReturnType<typeof getAuth>>;
beforeAll(async () => {
  await getDb();
  auth = await getAuth();
});

describe("localeFromUrl", () => {
  it("reads the language prefix from a callback URL", () => {
    expect(localeFromUrl("https://x.ge/api/auth/verify-email?token=1&callbackURL=%2Fen%2Flogin")).toBe("en");
    expect(localeFromUrl("https://x.ge/api/auth/verify-email?token=1&callbackURL=%2Fka%2Flogin")).toBe("ka");
    expect(localeFromUrl("https://x.ge/whatever")).toBe("ka");
  });
});

describe("email + password accounts", () => {
  const email = "nino@example.ge";

  it("signs up as an organizer and queues a verification email", async () => {
    const res = await auth.api.signUpEmail({
      body: { name: "Nino Beridze", email, password: "correct-horse-battery", callbackURL: "/en/login" },
    });
    expect(res.user.email).toBe(email);

    const [u] = await (await getDb()).select().from(user).where(eq(user.email, email));
    expect(u.role).toBe("organizer");
    expect(u.emailVerified).toBe(false);
    expect(await verificationUrlFor(email)).toContain("/api/auth/verify-email?token=");
  });

  it("refuses to sign in until the email is verified", async () => {
    await expect(auth.api.signInEmail({ body: { email, password: "correct-horse-battery" } })).rejects.toMatchObject({
      status: "FORBIDDEN",
    });
  });

  it("signs in after verification, and rejects a wrong password", async () => {
    const token = new URL(await verificationUrlFor(email)).searchParams.get("token")!;
    await auth.api.verifyEmail({ query: { token } });

    const ok = await auth.api.signInEmail({ body: { email, password: "correct-horse-battery" } });
    expect(ok.user.email).toBe(email);
    expect(ok.token).toBeTruthy();

    await expect(auth.api.signInEmail({ body: { email, password: "wrong-password-123" } })).rejects.toMatchObject({
      status: "UNAUTHORIZED",
    });
  });

  it("enforces the minimum password length", async () => {
    await expect(
      auth.api.signUpEmail({ body: { name: "Short", email: "short@example.ge", password: "short" } }),
    ).rejects.toBeDefined();
  });

  it("cannot be used to grant yourself admin by sending a role", async () => {
    // `role` isn't a declared input, so it is cast in to simulate a hostile client.
    const hostile = { name: "Mallory", email: "mallory@example.ge", password: "correct-horse-battery", role: "admin" };
    await auth.api.signUpEmail({ body: hostile as NonNullable<Parameters<typeof auth.api.signUpEmail>[0]>["body"] });
    const [u] = await (await getDb()).select().from(user).where(eq(user.email, "mallory@example.ge"));
    expect(u.role).toBe("organizer");
  });
});
