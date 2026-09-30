"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Last resort for an error in the root layout itself, where translations
 * aren't available, so it carries both languages. It imports the global
 * stylesheet itself because the layout that normally does is what failed.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app] fatal render error", error);
  }, [error]);

  return (
    <html lang="ka">
      <body>
        <main className="grid min-h-dvh place-items-center p-6 text-center">
          <div>
            <h1 className="mb-2 text-2xl font-semibold">რაღაც შეცდომა მოხდა · Something went wrong</h1>
            <p className="mb-5">გთხოვთ, სცადოთ თავიდან · Please try again.</p>
            <button type="button" onClick={reset} className="cursor-pointer rounded-lg bg-brown px-5 py-2.5 text-white">
              სცადეთ თავიდან · Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
