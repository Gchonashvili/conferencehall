import { CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Inline banner for form feedback. Toasts can be added when forms go live. */
export function Notice({
  tone,
  children,
  className,
}: {
  tone: "success" | "error";
  children: ReactNode;
  className?: string;
}) {
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm",
        tone === "success"
          ? "border-peach bg-blush"
          : "border-coral-strong bg-blush",
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-coral-strong" />
      <p>{children}</p>
    </div>
  );
}
