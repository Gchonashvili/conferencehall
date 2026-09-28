/**
 * Team operations that intentionally have no public endpoint.
 *
 *   pnpm admin promote <email>              make a user an admin
 *   pnpm admin link-venue <email> <slug>    let a user manage a venue (sets role to venue)
 *   pnpm admin verify <email>               mark an email as verified (when a link never arrives)
 *   pnpm admin set-password <email>         set a new password (prompted, hidden) when a reset email can't be sent
 *
 * Runs against DATABASE_URL (Neon), or the local PGlite database in development.
 */
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { getDb } from "./index";
import { account, session, user, venues } from "./schema";

/** Reads a line from the terminal without echoing it, so the password never lands in scrollback. */
function promptHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) throw new Error("Run this in an interactive terminal so the password can be typed hidden.");
  process.stdout.write(question);
  const muted = new Writable({ write: (_chunk, _enc, done) => done() });
  const rl = createInterface({ input: process.stdin, output: muted, terminal: true });
  return new Promise((resolve) =>
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    }),
  );
}

async function main() {
  const [cmd, email, slug] = process.argv.slice(2);
  const db = await getDb();

  const [u] = email ? await db.select().from(user).where(eq(user.email, email.toLowerCase())) : [];
  if (!u) throw new Error(`Usage: pnpm admin <promote|link-venue|verify|set-password> <email> [venue-slug]. No user with email "${email ?? ""}".`);

  if (cmd === "promote") {
    await db.update(user).set({ role: "admin" }).where(eq(user.id, u.id));
    console.log(`${u.email} is now an admin.`);
  } else if (cmd === "verify") {
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, u.id));
    console.log(`${u.email} is marked as verified.`);
  } else if (cmd === "link-venue") {
    if (!slug) throw new Error("Give the venue slug: pnpm admin link-venue <email> <slug>");
    const [v] = await db.select({ id: venues.id }).from(venues).where(eq(venues.slug, slug));
    if (!v) throw new Error(`No venue with slug "${slug}".`);
    await db.update(venues).set({ ownerUserId: u.id }).where(eq(venues.id, v.id));
    if (u.role !== "admin") await db.update(user).set({ role: "venue" }).where(eq(user.id, u.id));
    console.log(`${u.email} now manages ${slug}.`);
  } else if (cmd === "set-password") {
    const password = await promptHidden("New password (min 8 characters): ");
    if (password.length < 8) throw new Error("Use at least 8 characters.");
    if ((await promptHidden("Repeat it: ")) !== password) throw new Error("The passwords don't match.");
    const updated = await db
      .update(account)
      .set({ password: await hashPassword(password), updatedAt: new Date() })
      .where(and(eq(account.userId, u.id), eq(account.providerId, "credential")))
      .returning({ id: account.id });
    if (updated.length === 0) throw new Error(`${u.email} has no email/password login.`);
    // Same as a normal reset (revokeSessionsOnPasswordReset): sign out everywhere.
    await db.delete(session).where(eq(session.userId, u.id));
    console.log(`Password updated for ${u.email}. Existing sessions were signed out.`);
  } else {
    throw new Error(`Unknown command "${cmd}".`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
