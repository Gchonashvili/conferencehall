"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Honeypot } from "@/components/ui/honeypot";
import { Notice } from "@/components/ui/notice";
import { Turnstile } from "@/components/ui/turnstile";
import { Link } from "@/i18n/navigation";
import { IDLE, type FormState } from "@/lib/form-state";
import { useErrorText } from "@/lib/use-error-text";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/** White card shared by every account form, as in the reference sign-up screen. */
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl rounded-card bg-panel p-6 shadow-card md:p-8">
      <h1 className="mb-6 text-2xl">{title}</h1>
      {children}
    </div>
  );
}

function useFormErrors(state: FormState) {
  const errorText = useErrorText();
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  return {
    values,
    err: (f: string) => errorText(errors[f]),
    banner: state.status === "error" && state.formError ? errorText(state.formError) : undefined,
  };
}

function CheckEmail({ title, body }: { title: string; body: string }) {
  return (
    <div role="status" className="mx-auto w-full max-w-xl rounded-card bg-blush p-8 text-center shadow-card">
      <CircleCheck aria-hidden className="mx-auto mb-3 size-10 text-coral-strong" />
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2">{body}</p>
    </div>
  );
}

/**
 * Sign-up from the reference: one form, two submit buttons that pick the
 * account type (customer/vendor there, organizer/venue here).
 */
export function AuthCard({ action, locale }: { action: Action; locale: string }) {
  const t = useTranslations("auth");
  const tp = useTranslations("authPages");
  const [state, formAction, pending] = useActionState(action, IDLE);
  const { values, err, banner } = useFormErrors(state);

  if (state.status === "success") return <CheckEmail title={tp("checkEmailTitle")} body={tp("checkEmailBody")} />;

  return (
    <Card title={t("welcome", { brand: "Conferencehall" })}>
      <form action={formAction} className="relative">
        {banner ? <Notice tone="error" className="mb-4">{banner}</Notice> : null}
        <input type="hidden" name="locale" value={locale} />
        <Honeypot />
        <div className="flex flex-col gap-3">
          <TextField id="au-name" name="name" label={t("fullName")} autoComplete="name" required defaultValue={values.name} error={err("name")} />
          <TextField id="au-email" name="email" type="email" label={t("email")} autoComplete="email" required defaultValue={values.email} error={err("email")} />
          <TextField id="au-phone" name="phone" type="tel" label={t("phone")} autoComplete="tel" defaultValue={values.phone} error={err("phone")} />
          <TextField id="au-pass" name="password" type="password" label={t("password")} autoComplete="new-password" required minLength={8} error={err("password")} />
          <TextField id="au-pass2" name="confirmPassword" type="password" label={t("confirmPassword")} autoComplete="new-password" required minLength={8} error={err("confirmPassword")} />
        </div>
        <div className="mt-4">
          <Turnstile />
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button type="submit" name="role" value="organizer" disabled={pending} className="flex-1">
            {t("signupOrganizer")}
          </Button>
          <Button type="submit" name="role" value="venue" disabled={pending} className="flex-1">
            {t("signupVenue")}
          </Button>
        </div>
        <p className="mt-5 text-center text-sm">
          {tp("haveAccount")}{" "}
          <Link href="/login" className="font-semibold underline underline-offset-4">
            {tp("loginLink")}
          </Link>
        </p>
      </form>
    </Card>
  );
}

export function LoginForm({ action, locale, verified }: { action: Action; locale: string; verified?: boolean }) {
  const t = useTranslations("auth");
  const tp = useTranslations("authPages");
  const [state, formAction, pending] = useActionState(action, IDLE);
  const { values, banner } = useFormErrors(state);

  return (
    <Card title={tp("loginTitle")}>
      <form action={formAction}>
        {verified && state.status !== "error" ? <Notice tone="success" className="mb-4">{tp("verified")}</Notice> : null}
        {banner ? <Notice tone="error" className="mb-4">{banner}</Notice> : null}
        <input type="hidden" name="locale" value={locale} />
        <div className="flex flex-col gap-3">
          <TextField id="li-email" name="email" type="email" label={t("email")} autoComplete="email" required defaultValue={values.email} />
          <TextField id="li-pass" name="password" type="password" label={t("password")} autoComplete="current-password" required />
        </div>
        <Button type="submit" size="lg" disabled={pending} className="mt-6 w-full">
          {tp("loginCta")}
        </Button>
        <p className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
          <Link href="/forgot-password" className="underline underline-offset-4">
            {tp("forgot")}
          </Link>
          <span>
            {tp("noAccount")}{" "}
            <Link href="/signup" className="font-semibold underline underline-offset-4">
              {tp("signupLink")}
            </Link>
          </span>
        </p>
      </form>
    </Card>
  );
}

export function ForgotForm({ action, locale }: { action: Action; locale: string }) {
  const t = useTranslations("auth");
  const tp = useTranslations("authPages");
  const [state, formAction, pending] = useActionState(action, IDLE);
  const { values, err, banner } = useFormErrors(state);

  if (state.status === "success") return <CheckEmail title={tp("checkEmailTitle")} body={tp("checkEmailBody")} />;

  return (
    <Card title={tp("forgotTitle")}>
      <p className="mb-4">{tp("forgotBody")}</p>
      <form action={formAction} className="relative">
        {banner ? <Notice tone="error" className="mb-4">{banner}</Notice> : null}
        <input type="hidden" name="locale" value={locale} />
        <Honeypot />
        <TextField id="fp-email" name="email" type="email" label={t("email")} autoComplete="email" required defaultValue={values.email} error={err("email")} />
        <div className="mt-4">
          <Turnstile />
        </div>
        <Button type="submit" size="lg" disabled={pending} className="mt-6 w-full">
          {tp("forgotCta")}
        </Button>
      </form>
    </Card>
  );
}

export function ResetForm({ action, token }: { action: Action; token: string }) {
  const t = useTranslations("auth");
  const tp = useTranslations("authPages");
  const [state, formAction, pending] = useActionState(action, IDLE);
  const { err, banner } = useFormErrors(state);

  if (state.status === "success") {
    return (
      <Card title={tp("resetTitle")}>
        <Notice tone="success">{tp("resetDone")}</Notice>
        <Button asChild size="lg" className="mt-6 w-full">
          <Link href="/login">{tp("loginCta")}</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card title={tp("resetTitle")}>
      <form action={formAction}>
        {banner ? <Notice tone="error" className="mb-4">{banner}</Notice> : null}
        <input type="hidden" name="token" value={token} />
        <div className="flex flex-col gap-3">
          <TextField id="rp-pass" name="password" type="password" label={tp("newPassword")} autoComplete="new-password" required minLength={8} error={err("password")} />
          <TextField id="rp-pass2" name="confirmPassword" type="password" label={t("confirmPassword")} autoComplete="new-password" required minLength={8} error={err("confirmPassword")} />
        </div>
        <Button type="submit" size="lg" disabled={pending} className="mt-6 w-full">
          {tp("resetCta")}
        </Button>
      </form>
    </Card>
  );
}
