import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Small building blocks shared by the admin pages, so lists, filters and
 * status labels look the same everywhere. Colors come from the tokens in
 * globals.css / admin-theme.css; nothing here hardcodes a hex value.
 */

// ---------------------------------------------------------------- headers
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** A section title inside a page. */
export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold">{children}</h2>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function Panel({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-card bg-blush p-5 shadow-card", className)} {...props} />;
}

// ---------------------------------------------------------------- status
export type Tone = "ok" | "warn" | "danger" | "info" | "neutral";

const TONE: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  neutral: "bg-peach text-muted",
};

/** A small colored label for a status or stage. The words carry the meaning; color is a hint. */
export function StatusPill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", TONE[tone], className)}>
      {children}
    </span>
  );
}

const toneOf = (map: Record<string, Tone>) => (key: string): Tone => map[key] ?? "neutral";

export const leadTone = toneOf({ new: "info", contacted: "neutral", offered: "warn", won: "ok", lost: "danger" });
export const requestTone = toneOf({
  pending: "warn",
  accepted: "info",
  paid: "ok",
  completed: "ok",
  declined: "danger",
  expired: "neutral",
  cancelled: "neutral",
});
export const publishTone = toneOf({ active: "ok", published: "ok", draft: "neutral", suspended: "danger" });

/** Up/down/flat arrow comparing this period with the last (the small green pill on the reference stat cards). */
export function Trend({ current, previous, goodWhen = "up" }: { current: number; previous: number; goodWhen?: "up" | "down" }) {
  const diff = current - previous;
  const Icon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus;
  const good = diff === 0 ? null : (diff > 0) === (goodWhen === "up");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
        good === null ? TONE.neutral : good ? TONE.ok : TONE.danger,
      )}
    >
      <Icon aria-hidden className="size-3" />
      {Math.abs(diff)}
    </span>
  );
}

export function StatCard({ label, value, trend, hint }: { label: string; value: ReactNode; trend?: ReactNode; hint?: string }) {
  return (
    <div className="rounded-card bg-blush p-4 shadow-card">
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-3xl leading-none font-semibold">{value}</p>
        {trend}
      </div>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

// --------------------------------------------------------------- filters
export type FilterTab = { label: string; href: string; active: boolean; count?: number };

/** Pill-shaped filter links (All / New / Contacted ...): the current one is filled dark. */
export function FilterTabs({ tabs, label }: { tabs: FilterTab[]; label?: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            tab.active ? "border-coral-strong bg-coral-strong text-white" : "border-line text-muted hover:bg-peach hover:text-brown",
          )}
        >
          {tab.label}
          {tab.count !== undefined ? <span className={cn("ml-1.5", tab.active ? "opacity-80" : "opacity-70")}>{tab.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------- tables
/** Bordered, horizontally scrollable table with a light-gray header row. */
export function Table({ children, minWidth = 720 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-card bg-blush shadow-card">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return <th scope="col" className={cn("bg-peach px-4 py-3 text-xs font-semibold tracking-wide text-muted first:rounded-tl-card last:rounded-tr-card", className)} {...props} />;
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("border-t border-line align-top transition-colors hover:bg-peach/50", className)} {...props} />;
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-3", className)} {...props} />;
}

/** The main link in a row: bold, and underlined on hover. */
export function RowLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link className={cn("font-semibold underline-offset-4 hover:underline", className)} {...props} />;
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="rounded-card bg-blush p-8 text-center text-sm text-muted shadow-card">{children}</p>;
}
