/** Parses "min-max" URL values such as "50-150", "300-" (open-ended) or "-500". */
export type Range = { min?: number; max?: number };

export function parseRange(value: string | undefined): Range | null {
  if (!value) return null;
  const m = /^(\d{1,7})?-(\d{1,7})?$/.exec(value);
  if (!m || (m[1] === undefined && m[2] === undefined)) return null;
  const min = m[1] !== undefined ? Number(m[1]) : undefined;
  const max = m[2] !== undefined ? Number(m[2]) : undefined;
  if (min !== undefined && max !== undefined && min > max) return null;
  return { min, max };
}
