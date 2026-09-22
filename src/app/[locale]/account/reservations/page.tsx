import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Reservations, type Reservation } from "@/components/site/reservations";
import { getDb } from "@/db";
import { listOrganizerRequests } from "@/db/queries/requests";
import { resolveLocale } from "@/i18n/locale";
import { todayInTbilisi } from "@/lib/dates";
import { formatDate } from "@/lib/format-date";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My reservations", robots: { index: false } };

const ART = ["theatre", "banquet", "stage"] as const;
const OPEN = new Set(["pending", "accepted", "paid"]);

export default async function ReservationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const user = await requireUser(locale);
  const [tBooking, rows] = await Promise.all([
    getTranslations("booking"),
    getDb().then((db) => listOrganizerRequests(db, { id: user.id, email: user.email, emailVerified: user.emailVerified }, locale)),
  ]);

  const times = { morning: tBooking("times.morning"), afternoon: tBooking("times.afternoon"), evening: tBooking("times.evening"), full_day: tBooking("times.fullDay") };
  const today = todayInTbilisi();

  const all: (Reservation & { open: boolean })[] = rows.map((r, i) => ({
    id: r.id,
    hallName: r.hallName,
    bookingUnder: r.contactName,
    phone: r.contactPhone,
    eventType: r.eventTypeName,
    date: formatDate(r.eventDate, locale),
    timeOfDay: times[r.timeOfDay],
    guests: r.guests,
    area: r.areaName ?? "–",
    amountTetri: (r.status === "accepted" || r.status === "paid") && r.depositTetri != null ? r.depositTetri : undefined,
    status: r.status,
    art: ART[i % ART.length],
    open: OPEN.has(r.status) && r.eventDate >= today,
  }));

  return (
    <div className="px-5 py-10 md:px-12">
      <Reservations upcoming={all.filter((r) => r.open)} history={all.filter((r) => !r.open)} />
    </div>
  );
}
