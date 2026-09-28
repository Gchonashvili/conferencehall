import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createMemoryDb, type Database } from "@/db";
import { countInquiriesByStage, getInquiry, listInquiries, listNotes } from "@/db/queries/inquiries";
import { inquiries, user } from "@/db/schema";
import { leadUpdateSchema } from "./crm-input";
import { addNote, CrmError, updateLead } from "./crm-service";
import { createInquiry } from "./inquiry-service";

let db: Database;
const NOW = new Date("2026-09-28T10:00:00Z");
const LATER = new Date("2026-09-28T11:00:00Z");

async function makeUser(id: string, role: string) {
  await db.insert(user).values({ id, name: id === "nino" ? "Nino" : id, email: `${id}@example.ge`, emailVerified: true, role });
}

async function newLead(email: string, kind: "contact" | "brief" = "contact") {
  const base = { name: "Giorgi", email, phone: "555123456", message: "We need a hall" };
  return (await createInquiry(db, kind === "brief" ? { kind, ...base, citySlug: "tbilisi", guests: 80 } : { kind, ...base }, { locale: "en", now: NOW })).id;
}

const update = (v: Record<string, unknown>) => leadUpdateSchema.parse({ ownerUserId: "", followUpOn: "", lostReason: "", ...v });

beforeAll(async () => {
  db = await createMemoryDb();
  await makeUser("nino", "admin");
  await makeUser("organizer1", "organizer");
});

describe("leadUpdateSchema", () => {
  it("requires a reason only when the lead is lost", () => {
    expect(leadUpdateSchema.safeParse({ status: "contacted", lostReason: "" }).success).toBe(true);
    const lost = leadUpdateSchema.safeParse({ status: "lost", lostReason: "  " });
    expect(lost.success).toBe(false);
    expect(lost.error?.issues[0]).toMatchObject({ path: ["lostReason"], message: "lost_reason_required" });
  });

  it("rejects an unknown stage and a malformed date", () => {
    expect(leadUpdateSchema.safeParse({ status: "handled" }).success).toBe(false);
    expect(leadUpdateSchema.safeParse({ status: "new", followUpOn: "01/10/2026" }).success).toBe(false);
  });
});

describe("updateLead", () => {
  it("saves the changes and records each one in the timeline", async () => {
    const id = await newLead("pipeline@example.ge");
    await updateLead(db, id, update({ status: "contacted", ownerUserId: "nino", followUpOn: "2026-10-01" }), { actorUserId: "nino", now: NOW });

    const lead = await getInquiry(db, id);
    expect(lead).toMatchObject({ status: "contacted", ownerUserId: "nino", ownerName: "Nino", followUpOn: "2026-10-01" });

    const notes = await listNotes(db, "inquiry", id);
    expect(notes.map((n) => [n.kind, n.body]).sort()).toEqual([
      ["follow_up", "2026-10-01"],
      ["owner", "Nino"],
      ["stage", "contacted"],
    ]);
    expect(notes.every((n) => n.authorName === "Nino")).toBe(true);
  });

  it("writes no timeline entry when nothing changed", async () => {
    const id = await newLead("nochange@example.ge");
    await updateLead(db, id, update({ status: "new" }), { actorUserId: "nino", now: NOW });
    expect(await listNotes(db, "inquiry", id)).toEqual([]);
  });

  it("keeps the lost reason only while the lead is lost", async () => {
    const id = await newLead("lost@example.ge");
    await updateLead(db, id, update({ status: "lost", lostReason: "Date taken" }), { actorUserId: "nino", now: NOW });
    expect((await getInquiry(db, id))?.lostReason).toBe("Date taken");

    await updateLead(db, id, update({ status: "contacted", lostReason: "Date taken" }), { actorUserId: "nino", now: LATER });
    expect((await getInquiry(db, id))?.lostReason).toBeNull();
  });

  it("only lets a team member (admin) own a lead", async () => {
    const id = await newLead("owner@example.ge");
    await expect(updateLead(db, id, update({ status: "new", ownerUserId: "organizer1" }), { actorUserId: "nino" })).rejects.toMatchObject({
      code: "invalid_owner",
    });
    await expect(updateLead(db, id, update({ status: "new", ownerUserId: "ghost" }), { actorUserId: "nino" })).rejects.toBeInstanceOf(CrmError);
  });

  it("reports a missing lead", async () => {
    await expect(
      updateLead(db, "00000000-0000-4000-8000-000000000000", update({ status: "new" }), { actorUserId: "nino" }),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("addNote", () => {
  it("adds a free-text note to an existing lead only", async () => {
    const id = await newLead("note@example.ge");
    await addNote(db, { entityType: "inquiry", entityId: id, body: "Called, wants Batumi", authorUserId: "nino" }, { now: NOW });
    expect((await listNotes(db, "inquiry", id))[0]).toMatchObject({ kind: "note", body: "Called, wants Batumi", authorName: "Nino" });

    await expect(
      addNote(db, { entityType: "inquiry", entityId: "00000000-0000-4000-8000-000000000000", body: "x", authorUserId: "nino" }),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("lead list filters", () => {
  it("filters by owner and search, and counts per stage under the same filters", async () => {
    const mine = await newLead("filter-mine@example.ge");
    await updateLead(db, mine, update({ status: "offered", ownerUserId: "nino" }), { actorUserId: "nino", now: NOW });

    const minePage = await listInquiries(db, { owner: "mine", userId: "nino" });
    expect(minePage.items.every((r) => r.ownerUserId === "nino")).toBe(true);
    expect(minePage.items.map((r) => r.id)).toContain(mine);

    const unassigned = await listInquiries(db, { owner: "unassigned" });
    expect(unassigned.items.every((r) => r.ownerUserId === null)).toBe(true);

    const found = await listInquiries(db, { q: "FILTER-MINE" });
    expect(found.items.map((r) => r.id)).toEqual([mine]);

    // A literal "%" must not act as a wildcard.
    expect((await listInquiries(db, { q: "%" })).total).toBe(0);

    const counts = await countInquiriesByStage(db, { owner: "mine", userId: "nino" });
    expect(counts.offered).toBeGreaterThanOrEqual(1);
    expect(counts.new).toBe(0);
  });

  it("pages through results", async () => {
    const all = await db.select({ id: inquiries.id }).from(inquiries).where(eq(inquiries.kind, "contact"));
    const first = await listInquiries(db, { page: 1 });
    expect(first.total).toBeGreaterThanOrEqual(all.length);
    expect(first.page).toBe(1);
    // Asking past the end clamps to the last page instead of returning nothing.
    const beyond = await listInquiries(db, { page: 999 });
    expect(beyond.page).toBe(beyond.pages);
  });
});
