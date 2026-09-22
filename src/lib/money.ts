/**
 * Money is stored and passed around as integer tetri (1 GEL = 100 tetri) so
 * we never do floating-point arithmetic on prices. Only format at the edge.
 */
export const TETRI_PER_GEL = 100;

export function gelToTetri(gel: number): number {
  return Math.round(gel * TETRI_PER_GEL);
}

/** "2,500 ₾" (whole lari) or "2,500.50 ₾" when there are tetri. */
export function formatGel(tetri: number, locale: string = "en"): string {
  if (!Number.isInteger(tetri)) {
    throw new Error(`Money must be integer tetri, got ${tetri}`);
  }
  const whole = tetri % TETRI_PER_GEL === 0;
  const formatted = new Intl.NumberFormat(locale === "ka" ? "ka-GE" : "en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(tetri / TETRI_PER_GEL);
  return `${formatted} ₾`;
}

/** Deposit amount for a booking, rounded down to whole tetri. */
export function depositTetri(totalTetri: number, percent: number): number {
  return Math.floor((totalTetri * percent) / 100);
}

/**
 * Parses a price typed by a person into tetri: "1800", "1 800", "1,800.50",
 * "1800,5". Returns null for anything that is not a positive amount with at
 * most two decimals.
 */
export function parseGel(input: string): number | null {
  let v = input.trim().replace(/[\s\u00a0]/g, "").replace(/₾|gel/gi, "");
  if (v.includes(",") && v.includes(".")) v = v.replace(/,/g, ""); // "1,800.50"
  else if ((v.match(/,/g) ?? []).length === 1 && /,\d{1,2}$/.test(v)) v = v.replace(",", "."); // "1800,5"
  else v = v.replace(/,/g, ""); // "1,800"
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  const tetri = Math.round(Number(v) * TETRI_PER_GEL);
  return tetri > 0 ? tetri : null;
}
