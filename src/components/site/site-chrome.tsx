"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * The public header and footer, except in the admin panel, which has its own
 * shell (see admin/layout.tsx). `usePathname` here is locale-free ("/admin/leads").
 */
export function SiteChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return <>{children}</>;
  return (
    <>
      {header}
      {children}
      {footer}
    </>
  );
}
