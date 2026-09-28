import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import { adminNotes, bookingRequests, inquiries, subscriptionPayments, user, venues } from "@/db/schema";
import type { LeadUpdate, PaymentInput } from "./crm-input";

/** Expected failures, with codes the UI can translate. */
export class CrmError extends Error {
  constructor(public readonly code: "not_found" | "invalid_owner") {
    super(code);
  }
}

type NoteEntity = (typeof adminNotes.$inferInsert)["entityType"];
type NoteKind = NonNullable<(typeof adminNotes.$inferInsert)["kind"]>;

/**
 * Saves a lead's stage, owner, follow-up date and lost reason. Each actual
 * change is also written as an automatic note, in the same transaction, so
 * the lead's timeline shows who moved it and when.
 */
export async function updateLead(
  db: Database,
  id: string,
  input: LeadUpdate,
  opts: { actorUserId: string; now?: Date },
): Promise<void> {
  const now = opts.now ?? new Date();

  await db.transaction(async (tx) => {
    const [lead] = await tx.select().from(inquiries).where(eq(inquiries.id, id)).for("update");
    if (!lead) throw new CrmError("not_found");

    // Only team members can own a lead. The owner's name is kept in the note,
    // so the timeline still reads correctly if they later leave the team.
    let ownerName = "";
    if (input.ownerUserId) {
      const [owner] = await tx.select({ name: user.name, role: user.role }).from(user).where(eq(user.id, input.ownerUserId));
      if (!owner || owner.role !== "admin") throw new CrmError("invalid_owner");
      ownerName = owner.name;
    }

    const changes: { kind: NoteKind; body: string }[] = [];
    if (lead.status !== input.status) changes.push({ kind: "stage", body: input.status });
    if (lead.ownerUserId !== input.ownerUserId) changes.push({ kind: "owner", body: ownerName });
    if (lead.followUpOn !== input.followUpOn) changes.push({ kind: "follow_up", body: input.followUpOn ?? "" });

    await tx
      .update(inquiries)
      .set({
        status: input.status,
        ownerUserId: input.ownerUserId,
        followUpOn: input.followUpOn,
        lostReason: input.status === "lost" ? input.lostReason : null,
        updatedAt: now,
      })
      .where(eq(inquiries.id, id));

    if (changes.length > 0) {
      await tx.insert(adminNotes).values(
        changes.map((c) => ({ ...c, entityType: "inquiry" as const, entityId: id, authorUserId: opts.actorUserId, createdAt: now })),
      );
    }
  });
}

/**
 * Logs a subscription payment and, in the same transaction, extends the
 * venue's paid-until date to the end of the period it covers. A payment for
 * an earlier period (entered late) never shortens it.
 */
export async function logSubscriptionPayment(
  db: Database,
  venueId: string,
  input: PaymentInput,
  opts: { actorUserId: string; now?: Date },
): Promise<void> {
  const now = opts.now ?? new Date();

  await db.transaction(async (tx) => {
    const [venue] = await tx
      .select({ until: venues.subscriptionUntil })
      .from(venues)
      .where(eq(venues.id, venueId))
      .for("update");
    if (!venue) throw new CrmError("not_found");

    await tx.insert(subscriptionPayments).values({
      venueId,
      amountTetri: input.amount,
      paidOn: input.paidOn,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      invoiceNo: input.invoiceNo,
      note: input.note,
      recordedByUserId: opts.actorUserId,
      createdAt: now,
    });

    const until = venue.until && venue.until > input.periodEnd ? venue.until : input.periodEnd;
    await tx.update(venues).set({ subscriptionUntil: until, subscriptionStatus: "active", updatedAt: now }).where(eq(venues.id, venueId));
  });
}

const ENTITY_TABLES ={ inquiry: inquiries, booking_request: bookingRequests, venue: venues } as const;

/** Adds a free-text note to a lead, booking request or venue. */
export async function addNote(
  db: Database,
  input: { entityType: NoteEntity; entityId: string; body: string; authorUserId: string },
  opts: { now?: Date } = {},
): Promise<void> {
  const table = ENTITY_TABLES[input.entityType];
  const [exists] = await db.select({ id: table.id }).from(table).where(eq(table.id, input.entityId));
  if (!exists) throw new CrmError("not_found");

  await db.insert(adminNotes).values({
    entityType: input.entityType,
    entityId: input.entityId,
    kind: "note",
    body: input.body,
    authorUserId: input.authorUserId,
    createdAt: opts.now ?? new Date(),
  });
}
