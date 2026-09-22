import { readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

// Dev-only: serves the reference images from /research to the /design page.
// They are third-party mockups, so they must never ship in production.
const TYPES: Record<string, string> = { ".webp": "image/webp", ".png": "image/png" };

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });

  const name = basename((await params).file);
  const type = TYPES[extname(name)];
  if (!type) return new Response("Not found", { status: 404 });

  for (const dir of ["research", "research/crops"]) {
    try {
      const data = await readFile(join(process.cwd(), dir, name));
      return new Response(new Uint8Array(data), { headers: { "Content-Type": type } });
    } catch {
      // try next directory
    }
  }
  return new Response("Not found", { status: 404 });
}
