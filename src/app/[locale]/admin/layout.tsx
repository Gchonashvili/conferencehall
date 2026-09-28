import { getTranslations } from "next-intl/server";
import { AdminShell, type AdminNavItem } from "@/components/admin/admin-shell";
import { getDb } from "@/db";
import { countNewInquiries } from "@/db/queries/inquiries";
import { countPendingRequests } from "@/db/queries/requests";
import { resolveLocale } from "@/i18n/locale";
import { requireUser } from "@/lib/session";
import "./admin-theme.css";

/**
 * The admin panel's frame (sidebar + content). Every page and Server Action
 * still checks the admin role itself; this also keeps the frame from ever
 * rendering for anyone else.
 */
export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const me = await requireUser(locale, ["admin"]);
  const [t, tNav, tAuth, db] = await Promise.all([
    getTranslations("admin.nav"),
    getTranslations("nav"),
    getTranslations("authPages"),
    getDb(),
  ]);
  // The badges refresh after any admin action (they revalidate this layout) and on a reload.
  const [newLeads, pendingRequests] = await Promise.all([countNewInquiries(db), countPendingRequests(db)]);

  const items: AdminNavItem[] = [
    { href: "/admin", label: t("dashboard"), icon: "dashboard" },
    { href: "/admin/leads", label: t("leads"), icon: "leads", badge: newLeads },
    { href: "/admin/requests", label: t("requests"), icon: "requests", badge: pendingRequests },
    { href: "/admin/subscriptions", label: t("subscriptions"), icon: "subscriptions" },
    { href: "/admin/venues", label: t("venues"), icon: "venues" },
    { href: "/admin/halls", label: t("halls"), icon: "halls" },
  ];

  return (
    <AdminShell
      locale={locale}
      items={items}
      user={{ name: me.name, email: me.email }}
      labels={{ menu: tNav("menu"), closeMenu: tNav("closeMenu"), viewSite: t("viewSite"), logout: tAuth("logout"), admin: tAuth("admin") }}
    >
      {children}
    </AdminShell>
  );
}
