/**
 * What a form Server Action returns. Errors are stable codes the UI
 * translates. `values` echoes what was submitted: React clears uncontrolled
 * fields after every action, so without it a validation error would wipe
 * everything the user typed.
 */
export type FormState =
  | { status: "idle" }
  | { status: "success"; reference?: string; email?: string }
  | {
      status: "error";
      fieldErrors?: Record<string, string>;
      formError?: string;
      values?: Record<string, string>;
    };

export const IDLE: FormState = { status: "idle" };

/** Submitted string fields, safe to echo back (files, honeypot and passwords are never echoed). */
export function echoValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string" && !k.startsWith("$") && k !== "website" && !/password/i.test(k)) out[k] = v;
  return out;
}
