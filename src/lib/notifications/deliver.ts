import type { notificationEvents } from "@/db/schema";
import { sendEmail } from "./mailgun";
import { renderNotification } from "./templates";
import { sendWhatsApp } from "./whatsapp";

export type OutboxRow = typeof notificationEvents.$inferSelect;
export type Deliver = (row: OutboxRow) => Promise<void>;

/** Renders an outbox row and sends it on its channel. Throws on failure. */
export const deliver: Deliver = async (row) => {
  const rendered = renderNotification(row.kind, row.locale, row.payload);

  if (row.channel === "email") {
    await sendEmail({ to: row.recipient, subject: rendered.subject, text: rendered.text, html: rendered.html });
    return;
  }

  await sendWhatsApp({
    to: row.recipient,
    kind: row.kind,
    locale: row.locale,
    text: rendered.text,
    template: rendered.whatsapp,
    data: row.payload,
  });
};
