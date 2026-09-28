import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { LEAD_STAGES, type LeadStage } from "@/domain/crm-input";
import type { Database } from "../index";
import { adminNotes, inquiries, user } from "../schema";

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
  status: LeadStage;
  ownerUserId: string | null;
  ownerName: string | null;
  followUpOn: string | null;
  lostReason: string | null;
  createdAt: Date;
};

export type LeadFilters = {
  status?: LeadStage;
  /** "mine" needs `userId`. */
  owner?: "mine" | "unassigned";
  userId?: string;
  /** Matches name, email or phone. */
  q?: string;
  page?: number;
};

export const LEADS_PAGE_SIZE = 20;

const columns = {
  id: inquiries.id,
  kind: inquiries.kind,
  name: inquiries.name,
  phone: inquiries.phone,
  email: inquiries.email,
  message: inquiries.message,
  citySlug: inquiries.citySlug,
  eventType: inquiries.eventType,
  guests: inquiries.guests,
  eventDate: inquiries.eventDate,
  status: inquiries.status,
  ownerUserId: inquiries.ownerUserId,
  ownerName: user.name,
  followUpOn: inquiries.followUpOn,
  lostReason: inquiries.lostReason,
  createdAt: inquiries.createdAt,
};

/** Every filter except the stage, which the stage tabs apply (and count) separately. */
function baseWhere(f: LeadFilters): SQL[] {
  const where: SQL[] = [];
  if (f.owner === "mine" && f.userId) where.push(eq(inquiries.ownerUserId, f.userId));
  if (f.owner === "unassigned") where.push(isNull(inquiries.ownerUserId));
  const q = f.q?.trim();
  if (q) {
    // Escape LIKE wildcards so a search for "50%" means the literal text.
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(or(ilike(inquiries.name, pattern), ilike(inquiries.email, pattern), ilike(inquiries.phone, pattern))!);
  }
  return where;
}

/** Contact form, "tell us your brief" and "list your hall" leads, newest first, one page at a time. */
export async function listInquiries(
  db: Database,
  f: LeadFilters = {},
): Promise<{ items: InquiryRow[]; total: number; page: number; pages: number }> {
  const where = [...baseWhere(f), ...(f.status ? [eq(inquiries.status, f.status)] : [])];
  const condition = where.length ? and(...where) : undefined;

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(inquiries).where(condition);
  const pages = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE));
  const page = Math.min(Math.max(1, f.page ?? 1), pages);

  const items = await db
    .select(columns)
    .from(inquiries)
    .leftJoin(user, eq(user.id, inquiries.ownerUserId))
    .where(condition)
    .orderBy(desc(inquiries.createdAt))
    .limit(LEADS_PAGE_SIZE)
    .offset((page - 1) * LEADS_PAGE_SIZE);

  return { items, total, page, pages };
}

/** How many leads are in each stage, under the same owner/search filters as the list. */
export async function countInquiriesByStage(db: Database, f: LeadFilters = {}): Promise<Record<LeadStage, number>> {
  const where = baseWhere(f);
  const rows = await db
    .select({ status: inquiries.status, n: sql<number>`count(*)::int` })
    .from(inquiries)
    .where(where.length ? and(...where) : undefined)
    .groupBy(inquiries.status);
  const counts = Object.fromEntries(LEAD_STAGES.map((s) => [s, 0])) as Record<LeadStage, number>;
  for (const r of rows) counts[r.status] = r.n;
  return counts;
}

export async function getInquiry(db: Database, id: string): Promise<InquiryRow | null> {
  const [row] = await db
    .select(columns)
    .from(inquiries)
    .leftJoin(user, eq(user.id, inquiries.ownerUserId))
    .where(eq(inquiries.id, id));
  return row ?? null;
}

export async function countNewInquiries(db: Database): Promise<number> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(inquiries).where(eq(inquiries.status, "new"));
  return n;
}

export type NoteRow = {
  id: string;
  kind: "note" | "stage" | "owner" | "follow_up";
  body: string;
  authorName: string | null;
  createdAt: Date;
};

/** A record's timeline: free-text notes and automatic change entries, newest first. */
export async function listNotes(
  db: Database,
  entityType: "inquiry" | "booking_request" | "venue",
  entityId: string,
): Promise<NoteRow[]> {
  return db
    .select({ id: adminNotes.id, kind: adminNotes.kind, body: adminNotes.body, authorName: user.name, createdAt: adminNotes.createdAt })
    .from(adminNotes)
    .leftJoin(user, eq(user.id, adminNotes.authorUserId))
    .where(and(eq(adminNotes.entityType, entityType), eq(adminNotes.entityId, entityId)))
    .orderBy(desc(adminNotes.createdAt));
}

/** Team members who can own leads. */
export async function listAdminUsers(db: Database): Promise<{ id: string; name: string }[]> {
  return db.select({ id: user.id, name: user.name }).from(user).where(eq(user.role, "admin")).orderBy(asc(user.name));
}
