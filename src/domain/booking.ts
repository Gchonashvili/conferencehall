import { randomInt } from "node:crypto";

export type BookingStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "paid"
  | "completed"
  | "cancelled";

/**
 * The booking lifecycle. Every status change goes through `assertTransition`,
 * so an impossible move (e.g. paying a declined request) fails loudly.
 */
const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ["accepted", "declined", "expired", "cancelled"],
  accepted: ["paid", "cancelled", "expired"],
  paid: ["completed", "cancelled"],
  declined: [],
  expired: [],
  completed: [],
  cancelled: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: BookingStatus,
    public readonly to: BookingStatus,
  ) {
    super(`Cannot move a booking from "${from}" to "${to}"`);
  }
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

export const isTerminal = (s: BookingStatus) => TRANSITIONS[s].length === 0;

// No 0/O/1/I so codes survive being read over the phone.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Human-friendly booking reference, e.g. "CH-7K3Q9". */
export function generateReference(pick: (max: number) => number = (n) => randomInt(n)): string {
  let code = "";
  for (let i = 0; i < 5; i++) code += ALPHABET[pick(ALPHABET.length)];
  return `CH-${code}`;
}

/** When a pending request lapses if the venue hasn't answered. */
export function requestExpiry(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}
