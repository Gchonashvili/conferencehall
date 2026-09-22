export type Role = "organizer" | "venue" | "admin";

/** Where each kind of user lands after signing in. */
export function homeFor(role: string): string {
  return role === "admin" ? "/admin" : role === "venue" ? "/dashboard" : "/account/reservations";
}
