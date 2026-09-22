/** `pnpm db:seed` = reference data. `pnpm db:seed:sample` adds fictional venues (dev only). */
import { getDb } from "./index";
import { seedReference, seedSample } from "./seed";

async function main() {
  const db = await getDb();
  await seedReference(db);
  console.log("Reference data seeded.");
  if (process.argv.includes("--sample")) {
    await seedSample(db);
    console.log("Sample venues seeded.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
