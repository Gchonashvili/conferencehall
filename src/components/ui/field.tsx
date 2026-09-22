"use client";

import { RadioGroup } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label className={cn("mb-1 block text-sm font-semibold", className)} {...props} />
  );
}

const fieldClass =
  "w-full rounded-lg border border-transparent bg-field px-3.5 py-2.5 text-base text-brown focus:border-brown focus:outline-none";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClass, "min-h-24", className)} {...props} />;
}

function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={id} className="mt-1 text-sm font-semibold text-coral-strong">
      {error}
    </p>
  ) : null;
}

/** Label + input + error, wired for screen readers (aria-invalid / describedby). */
export function TextField({
  id,
  label,
  error,
  className,
  ...props
}: ComponentProps<"input"> & { id: string; label: string; error?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

export function TextareaField({
  id,
  label,
  error,
  className,
  ...props
}: ComponentProps<"textarea"> & { id: string; label: string; error?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** Native <select>: best mobile UX for short forms, and works without JavaScript. */
export function SelectField({
  id,
  label,
  error,
  options,
  placeholder,
  className,
  ...props
}: Omit<ComponentProps<"select">, "children"> & {
  id: string;
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(fieldClass, "cursor-pointer")}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** A row of checkboxes sharing one `name` (event types, amenities). */
export function CheckboxGroup({
  legend,
  name,
  options,
  defaultValue = [],
  className,
}: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string[];
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-1.5 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((o) => {
          const id = `${name}-${o.value}`;
          return (
            <label key={o.value} htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                id={id}
                name={name}
                value={o.value}
                defaultChecked={defaultValue.includes(o.value)}
                className="size-4 rounded border-brown accent-brown"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Georgian + English text inputs side by side under one label, for bilingual fields. */
export function BilingualTextField({
  legend,
  name,
  ka,
  en,
  errorKa,
  errorEn,
  textarea,
  className,
}: {
  legend: string;
  name: string;
  ka?: string;
  en?: string;
  errorKa?: string;
  errorEn?: string;
  textarea?: boolean;
  className?: string;
}) {
  const Field = textarea ? TextareaField : TextField;
  return (
    <fieldset className={className}>
      <legend className="mb-1.5 text-sm font-semibold">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${name}-ka`} name={`${name}.ka`} label="ქართული" defaultValue={ka} error={errorKa} />
        <Field id={`${name}-en`} name={`${name}.en`} label="English" defaultValue={en} error={errorEn} />
      </div>
    </fieldset>
  );
}

export type RadioOption = { value: string; label: string; hint?: string };

/** Radio group as used for event type, time of day and area in the reference. */
export function RadioField({
  legend,
  name,
  options,
  defaultValue,
  error,
  className,
}: {
  legend: string;
  name: string;
  options: RadioOption[];
  defaultValue?: string;
  error?: string;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-1.5 text-sm font-semibold text-coral-strong">
        {legend}
      </legend>
      <RadioGroup.Root
        name={name}
        defaultValue={defaultValue}
        className="flex flex-col gap-1.5"
      >
        {options.map((o) => {
          const id = `${name}-${o.value}`;
          return (
            <div key={o.value} className="flex items-center gap-2.5">
              <RadioGroup.Item
                id={id}
                value={o.value}
                className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full border-2 border-coral-strong bg-panel"
              >
                <RadioGroup.Indicator className="size-2.5 rounded-full bg-coral-strong" />
              </RadioGroup.Item>
              <label htmlFor={id} className="cursor-pointer text-sm">
                {o.label}
                {o.hint ? (
                  <span className="ml-1.5 text-xs opacity-80">{o.hint}</span>
                ) : null}
              </label>
            </div>
          );
        })}
      </RadioGroup.Root>
      <FieldError id={`${name}-error`} error={error} />
    </fieldset>
  );
}
