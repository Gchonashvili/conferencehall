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
    env: { OPS_EMAIL: "ops@example.ge", DEFAULT_DEPOSIT_PERCENT: "30", REQUEST_EXPIRY_HOURS: "48" },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
