import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Read once by src/env.ts, so set here rather than with vi.stubEnv.
    // TZ is pinned because the product's calendar days are Georgian days: it
    // keeps date tests meaningful on CI, which would otherwise run in UTC and
    // hide timezone bugs that only appear east of Greenwich.
    env: { OPS_EMAIL: "ops@example.ge", DEFAULT_DEPOSIT_PERCENT: "30", REQUEST_EXPIRY_HOURS: "48", TZ: "Asia/Tbilisi" },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
