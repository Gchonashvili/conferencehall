import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryDb, type Database } from "@/db";
import { loginAttempts } from "@/db/schema";
import {
  clearFailedLogins,
  isLoginBlocked,
  LOGIN_WINDOW_MS,
  MAX_FAILED_PER_EMAIL,
  MAX_FAILED_PER_IP,
  recordFailedLogin,
} from "./login-throttle";

let db: Database;
const NOW = new Date("2026-09-30T10:00:00Z");
const later = (ms: number) => new Date(NOW.getTime() + ms);

beforeEach(async () => {
  db = await createMemoryDb();
});

async function fail(times: number, who: { email: string; ip?: string }, at = NOW) {
  for (let i = 0; i < times; i++) await recordFailedLogin(db, who, at);
}

describe("login throttle", () => {
  it("allows a few wrong passwords, then blocks that account", async () => {
    const who = { email: "nino@example.ge" };
    await fail(MAX_FAILED_PER_EMAIL - 1, who);
    expect(await isLoginBlocked(db, who, NOW)).toBe(false);
    await fail(1, who);
    expect(await isLoginBlocked(db, who, NOW)).toBe(true);
  });

  it("stays blocked for the whole window, then lets the person back in", async () => {
    const who = { email: "nino@example.ge" };
    await fail(MAX_FAILED_PER_EMAIL, who);
    expect(await isLoginBlocked(db, who, later(LOGIN_WINDOW_MS - 1000))).toBe(true);
    expect(await isLoginBlocked(db, who, later(LOGIN_WINDOW_MS + 1000))).toBe(false);
  });

  it("only blocks the account that was guessed at", async () => {
    await fail(MAX_FAILED_PER_EMAIL, { email: "nino@example.ge" });
    expect(await isLoginBlocked(db, { email: "other@example.ge" }, NOW)).toBe(false);
  });

  it("blocks one address that tries many different accounts", async () => {
    for (let i = 0; i < MAX_FAILED_PER_IP; i++) await recordFailedLogin(db, { email: `user${i}@example.ge`, ip: "203.0.113.7" }, NOW);
    expect(await isLoginBlocked(db, { email: "fresh@example.ge", ip: "203.0.113.7" }, NOW)).toBe(true);
    expect(await isLoginBlocked(db, { email: "fresh@example.ge", ip: "203.0.113.8" }, NOW)).toBe(false);
  });

  it("a successful sign-in clears the account's failures", async () => {
    const who = { email: "nino@example.ge" };
    await fail(MAX_FAILED_PER_EMAIL, who);
    await clearFailedLogins(db, who.email);
    expect(await isLoginBlocked(db, who, NOW)).toBe(false);
  });

  it("trims failures older than the window", async () => {
    await fail(3, { email: "old@example.ge" });
    await recordFailedLogin(db, { email: "new@example.ge" }, later(LOGIN_WINDOW_MS + 1000));
    const rows = await db.select().from(loginAttempts);
    expect(rows.map((r) => r.email)).toEqual(["new@example.ge"]);
  });
});
