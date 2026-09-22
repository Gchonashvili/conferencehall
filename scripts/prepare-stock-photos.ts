/**
 * Turns the raw Unsplash downloads into site-ready files.
 *
 *   1. Download the photos from Unsplash into ./stock-originals (any names).
 *   2. pnpm photos:prepare            (or: pnpm photos:prepare <other-folder>)
 *
 * Each file is matched by its Unsplash photo id, resized to at most 2400px
 * wide, saved to public/images/stock/<slot>.jpg, and its size plus a tiny blur
 * preview are recorded in src/lib/stock-photos.data.json.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { matchStockFile, STOCK_MANIFEST } from "../src/lib/stock-photos";

const inputDir = process.argv[2] ?? "stock-originals";
const outDir = "public/images/stock";
const dataFile = "src/lib/stock-photos.data.json";
const MIN_WIDTH = 1600; // below this a full-width hero looks soft

async function main() {
  if (!existsSync(inputDir)) throw new Error(`Folder "${inputDir}" does not exist. Create it and put the downloaded photos in it.`);
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(inputDir);
  const data: Record<string, unknown> = existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, "utf8")) : {};
  const missing: string[] = [];
  const soft: string[] = [];

  for (const entry of STOCK_MANIFEST) {
    const file = matchStockFile(files, entry);
    if (!file) {
      missing.push(`${entry.key} (${entry.unsplashId})`);
      continue;
    }

    const source = sharp(join(inputDir, file)).rotate(); // honour camera orientation
    const meta = await source.metadata();
    if ((meta.width ?? 0) < MIN_WIDTH) soft.push(`${entry.key}: only ${meta.width}px wide`);

    const target = join(outDir, `${entry.key}.jpg`);
    const info = await source
      .clone()
      .resize({ width: 2400, withoutEnlargement: true })
      .jpeg({ quality: 78, progressive: true, mozjpeg: true })
      .toFile(target);
    const blur = (await source.clone().resize({ width: 16 }).jpeg({ quality: 50 }).toBuffer()).toString("base64");

    data[entry.key] = { src: `/images/stock/${entry.key}.jpg`, width: info.width, height: info.height, blur: `data:image/jpeg;base64,${blur}` };
    console.log(`✓ ${entry.key.padEnd(18)} ${String(info.width).padStart(4)}×${String(info.height).padEnd(4)} ${Math.round(statSync(target).size / 1024)} KB  ← ${file}`);
  }

  writeFileSync(dataFile, JSON.stringify(data, null, 2) + "\n");
  if (soft.length) console.warn(`\nLow resolution (may look soft when stretched):\n  ${soft.join("\n  ")}`);
  if (missing.length) console.log(`\nNot found in "${inputDir}" (those slots keep the illustration):\n  ${missing.join("\n  ")}`);
  console.log(`\n${Object.keys(data).length} of ${STOCK_MANIFEST.length} photos prepared.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
