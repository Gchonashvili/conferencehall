"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/site/states";

/** Shown in place of a page that threw while rendering, inside the normal header and footer. */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app] render error", error);
  }, [error]);

  return (
    <div className="px-5 py-20">
      <ErrorState onRetry={reset} />
    </div>
  );
}
