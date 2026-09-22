"use server";

import { APIError } from "better-auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { getDb } from "@/db";
import { user } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { getAuth } from "@/lib/auth";
import { echoValues, type FormState } from "@/lib/form-state";
import { normalizePhone } from "@/lib/phone";
import { homeFor } from "@/lib/roles";
import { verifyTurnstile } from "@/lib/turnstile";
import { fieldErrors } from "@/domain/booking-input";

const localeOf = (v: string | undefined) => (v === "en" ? "en" : "ka");
const password = z.string().min(8, { error: "password_short" }).max(128, { error: "password_short" });
const email = z.string().trim().max(254, { error: "invalid_email" }).pipe(z.email({ error: "invalid_email" })).transform((v) => v.toLowerCase());

const signUpSchema = z
  .object({
    name: z.string().trim().min(2, { error: "name_required" }).max(120, { error: "name_required" }),
    email,
    phone: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().transform((v, ctx) => {
        const p = normalizePhone(v);
        if (!p) ctx.addIssue({ code: "custom", message: "invalid_phone" });
        return p ?? "";
      }).optional(),
    ),
    password,
    confirmPassword: z.string(),
    role: z.enum(["organizer", "venue"], { error: "generic" }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], error: "password_mismatch" });

/**
 * Creates an account. It always answers "check your email", whether or not
 * the address was already registered, so the form can't be used to find out
 * who has an account. `role` may only ever be organizer or venue; a venue
 * account can see nothing until the team links it to a venue.
 */
export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const locale = localeOf(values.locale);
  if (String(formData.get("website") ?? "") !== "") return { status: "success" };
  if (!(await verifyTurnstile(String(formData.get("cf-turnstile-response") ?? "")))) {
    return { status: "error", formError: "spam", values };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  const { name, email: addr, phone, password: pw, role } = parsed.data;

  try {
    const res = await (await getAuth()).api.signUpEmail({
      body: { name, email: addr, password: pw, phone, callbackURL: `/${locale}/login?verified=1` },
      headers: await headers(),
    });
    if (role === "venue") {
      // Keyed by the id we were just given, so this can never touch someone else's existing account.
      await (await getDb()).update(user).set({ role: "venue" }).where(eq(user.id, res.user.id));
    }
  } catch (err) {
    if (!(err instanceof APIError)) {
      console.error("[auth] sign-up failed", err);
      return { status: "error", formError: "generic", values };
    }
    // Known API errors (e.g. address already registered) look identical to success.
  }
  return { status: "success" };
}

const CODE_MAP: Record<string, string> = { EMAIL_NOT_VERIFIED: "email_not_verified" };

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const locale = localeOf(values.locale);
  const parsed = z.object({ email, password: z.string().min(1, { error: "invalid_credentials" }) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", formError: "invalid_credentials", values };

  let role: string;
  try {
    const res = await (await getAuth()).api.signInEmail({ body: parsed.data, headers: await headers() });
    role = (res.user as { role?: string }).role ?? "organizer";
  } catch (err) {
    if (err instanceof APIError) {
      const code = String((err.body as { code?: string } | undefined)?.code ?? "");
      return { status: "error", formError: CODE_MAP[code] ?? "invalid_credentials", values };
    }
    console.error("[auth] sign-in failed", err);
    return { status: "error", formError: "generic", values };
  }
  return redirect({ href: homeFor(role), locale });
}

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = localeOf(String(formData.get("locale") ?? ""));
  await (await getAuth()).api.signOut({ headers: await headers() });
  return redirect({ href: "/", locale });
}

/** Always reports success, so it can't be used to test which addresses exist. */
export async function forgotPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const locale = localeOf(values.locale);
  if (String(formData.get("website") ?? "") !== "") return { status: "success" };
  if (!(await verifyTurnstile(String(formData.get("cf-turnstile-response") ?? "")))) {
    return { status: "error", formError: "spam", values };
  }
  const parsed = email.safeParse(values.email);
  if (!parsed.success) return { status: "error", fieldErrors: { email: "invalid_email" }, values };

  try {
    await (await getAuth()).api.requestPasswordReset({ body: { email: parsed.data, redirectTo: `/${locale}/reset-password` }, headers: await headers() });
  } catch (err) {
    console.error("[auth] password reset request failed", err);
  }
  return { status: "success" };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const token = String(formData.get("token") ?? "");
  const pw = password.safeParse(formData.get("password"));
  if (!pw.success) return { status: "error", fieldErrors: { password: "password_short" }, values };
  if (pw.data !== formData.get("confirmPassword")) {
    return { status: "error", fieldErrors: { confirmPassword: "password_mismatch" }, values };
  }
  try {
    await (await getAuth()).api.resetPassword({ body: { newPassword: pw.data, token } });
  } catch (err) {
    if (err instanceof APIError) return { status: "error", formError: "invalid_token", values };
    console.error("[auth] password reset failed", err);
    return { status: "error", formError: "generic", values };
  }
  return { status: "success" };
}
