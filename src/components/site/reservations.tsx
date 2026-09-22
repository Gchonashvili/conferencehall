"use client";

import { Printer } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PlaceholderArt } from "@/components/ui/placeholder-art";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { formatGel } from "@/lib/money";

export type ReservationStatus = "pending" | "accepted" | "paid" | "declined" | "expired" | "cancelled" | "completed";

export type Reservation = {
  id: string;
  hallName: string;
  bookingUnder: string;
  phone: string;
  eventType: string;
  date: string;
  timeOfDay: string;
  guests: number;
  area: string;
  /** Integer tetri: the deposit due (accepted) or paid. Omit when there is no amount yet. */
  amountTetri?: number;
  status: ReservationStatus;
  /** Where the organizer pays the deposit. Set once online payment is live. */
  payHref?: string;
  art?: "theatre" | "banquet" | "stage";
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-coral-strong">{label}</dt>
      <dd className="text-base">{value}</dd>
    </div>
  );
}

export function ReservationCard({ r }: { r: Reservation }) {
  const t = useTranslations("reservations");
  const locale = useLocale();
  const paid = r.status === "paid";

  return (
    <li className="grid gap-4 rounded-card bg-blush p-3 shadow-card md:grid-cols-[200px_1fr]">
      <div className="aspect-[4/3] overflow-hidden rounded-image md:aspect-auto">
        <PlaceholderArt variant={r.art ?? "theatre"} alt="" />
      </div>
      <div className="flex flex-col gap-4 p-1 md:p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">{r.hallName}</h3>
          <Chip>{t(`status.${r.status}`)}</Chip>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
          <Field label={t("bookingUnder")} value={`${r.bookingUnder} · ${r.phone}`} />
          <Field label={t("eventType")} value={r.eventType} />
          <Field label={t("date")} value={r.date} />
          <Field label={t("time")} value={r.timeOfDay} />
          <Field label={t("guests")} value={String(r.guests)} />
          <Field label={t("area")} value={r.area} />
          {r.amountTetri != null ? (
            <Field label={paid ? t("amountPaid") : t("depositDue")} value={formatGel(r.amountTetri, locale)} />
          ) : null}
        </dl>
        <div className="flex justify-end gap-2">
          {r.status === "accepted" && r.payHref ? (
            <Button asChild>
              <Link href={r.payHref}>{t("payDeposit")}</Link>
            </Button>
          ) : null}
          {paid ? (
            <Button>
              <Printer aria-hidden className="size-4" />
              {t("printReceipt")}
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function EmptyList() {
  const t = useTranslations("reservations2");
  return (
    <div className="rounded-card bg-blush p-8 text-center shadow-card">
      <p>{t("empty")}</p>
      <Button asChild className="mt-4">
        <Link href="/halls">{t("browse")}</Link>
      </Button>
    </div>
  );
}

/** "My reservations" with Upcoming / History tabs, as in the reference. */
export function Reservations({ upcoming, history }: { upcoming: Reservation[]; history: Reservation[] }) {
  const t = useTranslations("reservations");
  return (
    <section aria-labelledby="res-title">
      <h1 id="res-title" className="mb-4 text-2xl">
        {t("title")}
      </h1>
      <Tabs defaultValue="upcoming">
        <TabsList aria-label={t("title")}>
          <TabsTrigger value="upcoming">{t("upcoming")}</TabsTrigger>
          <TabsTrigger value="history">{t("history")}</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          {upcoming.length === 0 ? <EmptyList /> : <ul className="flex flex-col gap-4">{upcoming.map((r) => <ReservationCard key={r.id} r={r} />)}</ul>}
        </TabsContent>
        <TabsContent value="history">
          {history.length === 0 ? <EmptyList /> : <ul className="flex flex-col gap-4">{history.map((r) => <ReservationCard key={r.id} r={r} />)}</ul>}
        </TabsContent>
      </Tabs>
    </section>
  );
}
