import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { parseImageHosts } from "./src/lib/image-hosts";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Baseline security headers. A strict Content-Security-Policy is deliberately
 * not here yet: it needs nonces for Next's inline scripts and an allowance for
 * Cloudflare Turnstile, and is best written and tested as its own step.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" }, // no one may embed the site (clickjacking)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Production runs behind HTTPS on Railway; tell browsers to insist on it.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Native/WASM database drivers must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  images: {
    // Hosts hall photos may be served from: object storage (Cloudflare R2) once
    // uploads exist, and meanwhile wherever the team hosts photos it pastes into
    // the admin panel. Comma-separated; named hosts only, never a wildcard, so
    // the image optimizer can't be pointed at arbitrary URLs. `src/lib/image-hosts.ts`
    // checks the same list on input and at render.
    remotePatterns: parseImageHosts(process.env.NEXT_PUBLIC_IMAGE_HOST).map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
};

export default withNextIntl(nextConfig);
