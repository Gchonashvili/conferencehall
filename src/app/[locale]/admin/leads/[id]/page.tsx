import { Mail, MessageCircle, Phone, Search } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { addLeadNoteAction, updateLeadAction } from "@/app/actions/admin";
import { LeadForm } from "@/components/admin/lead-form";
import { StatusPill, leadTone } from "@/components/admin/ui";
import { NoteForm } from "@/components/admin/note-form";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { listCities, listEventTypes } from "@/db/queries/halls";
import { getInquiry, listAdminUsers, listNotes, type NoteRow } from "@/db/queries/inquiries";
import { CLOSED_STAGES } from "@/domain/crm-input";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { todayInTbilisi } from "@/lib/dates";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { normalizePhone } from "@/lib/phone";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lead", robots: { index: false } };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="text-base break-words whitespace-pre-line">{children}</dd>
    </div>
  );
}

export default async function AdminLeadPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  await requireUser(locale, ["admin"]);
  const [t, db] = await Promise.all([getTranslations("admin.leads"), getDb()]);

  const lead = /^[0-9a-f-]{36}$/i.test(id) ? await getInquiry(db, id) : null;
  if (!lead) notFound();

  const [notes, owners, cities, eventTypes] = await Promise.all([
    listNotes(db, "inquiry", lead.id),
    listAdminUsers(db),
    listCities(db, locale),
    listEventTypes(db, locale),
  ]);
  const cityName = cities.find((c) => c.slug === lead.citySlug)?.name ?? lead.citySlug;
  const eventTypeName = eventTypes.find((e) => e.slug === lead.eventType)?.name ?? lead.eventType;

  const whatsapp = lead.phone ? normalizePhone(lead.phone) : null;
  const overdue = !!lead.followUpOn && lead.followUpOn <= todayInTbilisi() && !CLOSED_STAGES.includes(lead.status);

  // Pre-filtered hall search, so the team can build an offer from the brief.
  const hallQuery = new URLSearchParams();
  if (lead.citySlug) hallQuery.set("city", lead.citySlug);
  if (lead.eventType) hallQuery.set("eventType", lead.eventType);
  if (lead.guests) hallQuery.set("guests", `${lead.guests}-${lead.guests}`);

  function describe(n: NoteRow): string {
    switch (n.kind) {
      case "stage":
        return t("log_stage", { stage: t(`stage_${n.body as "new"}`) });
      case "owner":
        return n.body ? t("log_owner", { name: n.body }) : t("log_ownerNone");
      case "follow_up":
        return n.body ? t("log_followUp", { date: formatDate(n.body, locale) }) : t("log_followUpNone");
      default:
        return "";
    }
  }

  return (
    <section className="px-5 py-6 md:px-8 md:py-8">
      <Link href="/admin/leads" className="text-sm text-coral underline underline-offset-4">
        ← {t("back")}
      </Link>

      <div className="mt-4 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold md:text-3xl">{lead.name}</h1>
        <StatusPill tone="neutral">{t(`kind_${lead.kind}`)}</StatusPill>
        <StatusPill tone={leadTone(lead.status)}>{t(`stage_${lead.status}`)}</StatusPill>
        {overdue ? <StatusPill tone="danger">{t("overdue")}</StatusPill> : null}
      </div>

      {/* Quick contact: the team talks to leads by phone, WhatsApp or email, outside the app. */}
      <div className="mb-8 flex flex-wrap gap-3">
        {lead.phone ? (
          <Button asChild variant="outline" size="sm">
            <a href={`tel:${lead.phone}`}>
              <Phone aria-hidden className="size-4" /> {t("call")}
            </a>
          </Button>
        ) : null}
        {whatsapp ? (
          <Button asChild variant="outline" size="sm">
            <a href={`https://wa.me/${whatsapp.slice(1)}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden className="size-4" /> {t("whatsapp")}
            </a>
          </Button>
        ) : null}
        <Button asChild variant="outline" size="sm">
          <a href={`mailto:${lead.email}`}>
            <Mail aria-hidden className="size-4" /> {t("email")}
          </a>
        </Button>
        <Button asChild size="sm">
          <Link href={`/halls${hallQuery.size ? `?${hallQuery}` : ""}`} target="_blank">
            <Search aria-hidden className="size-4" /> {t("findHalls")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-8">
          <dl className="grid gap-x-8 gap-y-4 rounded-card bg-blush p-6 shadow-card sm:grid-cols-2">
            <Row label={t("contact")}>
              {lead.email}
              {lead.phone ? (
                <>
                  <br />
                  {lead.phone}
                </>
              ) : null}
            </Row>
            <Row label={t("received")}>{formatDateTime(lead.createdAt, locale)}</Row>
            {cityName ? <Row label={t("city")}>{cityName}</Row> : null}
            {eventTypeName ? <Row label={t("eventType")}>{eventTypeName}</Row> : null}
            {lead.guests ? <Row label={t("guestsLabel")}>{lead.guests}</Row> : null}
            {lead.eventDate ? <Row label={t("eventDate")}>{formatDate(lead.eventDate, locale)}</Row> : null}
            {lead.message ? (
              <div className="sm:col-span-2">
                <Row label={t("message")}>{lead.message}</Row>
              </div>
            ) : null}
            {lead.status === "lost" && lead.lostReason ? (
              <div className="sm:col-span-2">
                <Row label={t("lostReason")}>{lead.lostReason}</Row>
              </div>
            ) : null}
          </dl>

          <section aria-labelledby="notes-title">
            <h2 id="notes-title" className="mb-3 text-lg font-semibold">
              {t("notes")}
            </h2>
            <NoteForm locale={locale} leadId={lead.id} action={addLeadNoteAction} />
            {notes.length === 0 ? <p className="mt-4 text-sm text-muted">{t("noNotes")}</p> : null}
            <ol className="mt-5 flex flex-col gap-3">
              {notes.map((n) => (
                <li key={n.id} className={cn("text-sm", n.kind === "note" && "rounded-card bg-blush p-4 shadow-card")}>
                  <p className={cn(n.kind !== "note" && "text-muted")}>
                    <span className="font-semibold">{n.authorName ?? t("someone")}</span>
                    {n.kind === "note" ? null : <> {describe(n)}</>}
                    <span className="text-muted"> · {formatDateTime(n.createdAt, locale)}</span>
                  </p>
                  {n.kind === "note" ? <p className="mt-1 whitespace-pre-line">{n.body}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside>
          <LeadForm
            locale={locale}
            lead={{
              id: lead.id,
              status: lead.status,
              ownerUserId: lead.ownerUserId,
              followUpOn: lead.followUpOn,
              lostReason: lead.lostReason,
            }}
            owners={owners}
            action={updateLeadAction}
          />
        </aside>
      </div>
    </section>
  );
}
