/**
 * Team operations that intentionally have no public endpoint.
 *
 *   pnpm admin promote <email>              make a user an admin
 *   pnpm admin link-venue <email> <slug>    let a user manage a venue (sets role to venue)
 *   pnpm admin verify <email>               mark an email as verified (when a link never arrives)
 *
 * Runs against DATABASE_URL (Neon), or the local PGlite database in development.
 */
import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { user, venues } from "./schema";

async function main() {
  const [cmd, email, slug] = process.argv.slice(2);
  const db = await getDb();

  const [u] = email ? await db.select().from(user).where(eq(user.email, email.toLowerCase())) : [];
  if (!u) throw new Error(`Usage: pnpm admin <promote|link-venue|verify> <email> [venue-slug]. No user with email "${email ?? ""}".`);

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
  } else {
    throw new Error(`Unknown command "${cmd}".`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
