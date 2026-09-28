import { z } from "zod";

/**
 * Validation for the admin panel's lightweight CRM (lead pipeline and notes).
 * Same style as `admin-input.ts`: stable error *codes*, translated by the UI.
 */
export const LEAD_STAGES = ["new", "contacted", "offered", "won", "lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

/** Stages where the lead is finished, so a follow-up date no longer counts as overdue. */
export const CLOSED_STAGES: readonly LeadStage[] = ["won", "lost"];

const blankToNull = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);

export const leadUpdateSchema = z
  .object({
    status: z.enum(LEAD_STAGES, { error: "invalid_state" }),
    ownerUserId: z.preprocess(blankToNull, z.string().max(100).nullable()),
    followUpOn: z.preprocess(blankToNull, z.iso.date({ error: "invalid_date" }).nullable()),
    lostReason: z.preprocess(blankToNull, z.string().trim().max(1000, { error: "message_too_long" }).nullable()),
  })
  .refine((v) => v.status !== "lost" || !!v.lostReason, { error: "lost_reason_required", path: ["lostReason"] });
export type LeadUpdate = z.infer<typeof leadUpdateSchema>;

export const noteSchema = z.object({
  body: z.string().trim().min(1, { error: "required" }).max(1000, { error: "message_too_long" }),
});
