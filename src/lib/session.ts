import { headers } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { getAuth } from "./auth";
import type { Role } from "./roles";

export { homeFor } from "./roles";

export async function getSession() {
  return (await getAuth()).api.getSession({ headers: await headers() });
}

/**
 * Guard for pages and Server Actions. Proxy/middleware checks are only a
 * convenience; every protected page and action must call this itself.
 */
export async function requireUser(locale: "ka" | "en", roles?: Role[]) {
  const session = await getSession();
  if (!session) return redirect({ href: "/login", locale });
  if (roles && !roles.includes(session.user.role as Role)) return redirect({ href: "/", locale });
  return session.user;
}
