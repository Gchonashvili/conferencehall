import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../index";
import { inquiries } from "../schema";

export type InquiryRow = {
  id: string;
  kind: "contact" | "brief" | "venue";
  name: string;
  phone: string | null;
  email: string;
  message: string | null;
  citySlug: string | null;
  eventType: string | null;
  guests: number | null;
  eventDate: string | null;
  status: "new" | "handled";
  createdAt: Date;
};

/** Contact form, "tell us your brief" and "list your hall" leads, for the admin panel. */
export async function listInquiries(
  db: Database,
  filters: { status?: "new" | "handled"; kind?: "contact" | "brief" | "venue" } = {},
): Promise<InquiryRow[]> {
  const where = [
    filters.status ? eq(inquiries.status, filters.status) : undefined,
    filters.kind ? eq(inquiries.kind, filters.kind) : undefined,
  ].filter((c) => c !== undefined);

  return db
    .select()
    .from(inquiries)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(inquiries.createdAt));
}

export async function getInquiry(db: Database, id: string): Promise<InquiryRow | null> {
  const [row] = await db.select().from(inquiries).where(eq(inquiries.id, id));
  return row ?? null;
}

export async function countNewInquiries(db: Database): Promise<number> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(inquiries).where(eq(inquiries.status, "new"));
  return n;
}
