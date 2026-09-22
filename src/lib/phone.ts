/**
 * Normalises a phone number to E.164 ("+995555123456"). Bare Georgian numbers
 * (9 digits, or 10 with a leading 0) get the +995 prefix. Returns null when
 * the input can't be a phone number.
 */
export function normalizePhone(input: string): string | null {
  const cleaned = input.trim().replace(/[\s().-]/g, "");
  let digits: string;
  if (cleaned.startsWith("+")) digits = cleaned.slice(1);
  else if (cleaned.startsWith("00")) digits = cleaned.slice(2);
  else if (/^0\d{9}$/.test(cleaned)) digits = "995" + cleaned.slice(1);
  else if (/^\d{9}$/.test(cleaned)) digits = "995" + cleaned;
  else return null;
  return /^\d{8,15}$/.test(digits) ? "+" + digits : null;
}
