"use client";

import { CreditCard } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { formatGel } from "@/lib/money";

export type SummaryLine = { label: string; tetri: number; strong?: boolean };

/**
 * Price breakdown with dotted leaders, total, and a payment method picker,
 * from the reference's booking summary page. Money is integer tetri.
 */
export function BookingSummary({ lines, totalTetri }: { lines: SummaryLine[]; totalTetri: number }) {
  const t = useTranslations("payment");
  const locale = useLocale();
  const money = (v: number) => <span className="tabular-nums">{formatGel(v, locale)}</span>;

  return (
    <section aria-labelledby="sum-title" className="rounded-card bg-blush p-5 shadow-card">
      <h2 id="sum-title" className="mb-4 text-xl font-semibold">
        {t("title")}
      </h2>

      <dl className="flex flex-col gap-2">
        {lines.map((l) => (
          <div key={l.label} className="flex items-baseline gap-2">
            <dt className={l.strong ? "font-bold" : ""}>{l.label}</dt>
            <span aria-hidden className="flex-1 border-b border-dotted border-brown/40" />
            <dd className={l.strong ? "font-bold" : ""}>{money(l.tetri)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-baseline justify-between border-t border-peach pt-4 text-xl font-bold">
        <span>{t("total")}</span>
        {money(totalTetri)}
      </div>

      <h3 className="mt-6 mb-2 text-sm font-semibold text-coral-strong">{t("method")}</h3>
      <RadioGroup.Root name="method" defaultValue="card" className="flex flex-col gap-2">
        <RadioGroup.Item
          value="card"
          className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-transparent bg-panel px-4 py-3 text-left data-[state=checked]:border-brown"
        >
          <CreditCard aria-hidden className="size-5 text-coral-strong" />
          <span>
            <span className="block font-semibold">{t("card")}</span>
            <span className="block text-xs">{t("cardHint")}</span>
          </span>
        </RadioGroup.Item>
      </RadioGroup.Root>

      <Button className="mt-5 w-full">{t("pay")}</Button>
    </section>
  );
}
