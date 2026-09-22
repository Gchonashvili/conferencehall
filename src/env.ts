import { z } from "zod";

/** Treat empty strings (e.g. `KEY=` in .env) as "not set". */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

/**
 * Validated environment. Optional values enable integrations as their
 * credentials arrive; features that need them degrade to a logged no-op in
 * development and fail loudly in production (see lib/notifications).
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  /**
   * Comma-separated hosts that hall photos may be served from, mirrored into
   * `images.remotePatterns` (next.config.ts) and checked by lib/image-hosts.ts.
   * Unset means no remote images: uploads fall back to the placeholder art.
   */
  NEXT_PUBLIC_IMAGE_HOST: optional(z.string()),

  // Database: Neon in production. Without it, dev/test use in-process PGlite.
  DATABASE_URL: optional(z.string().min(1)),
  /** Allows PGlite in a production build for local smoke tests only. */
  LOCAL_DB: optional(z.enum(["pglite"])),

  // Business rules (assumptions from the PRD, adjustable without a deploy)
  DEFAULT_DEPOSIT_PERCENT: z.coerce.number().int().min(1).max(100).default(30),
  REQUEST_EXPIRY_HOURS: z.coerce.number().int().min(1).default(48),

  /** Signs sessions and tokens. Required in production (`openssl rand -base64 32`). */
  BETTER_AUTH_SECRET: optional(z.string().min(32)),

  // Notifications
  MAILGUN_API_KEY: optional(z.string()),
  MAILGUN_DOMAIN: optional(z.string()),
  MAILGUN_REGION: z.enum(["us", "eu"]).default("eu"),
  MAIL_FROM: z.string().default("Conferencehall <no-reply@localhost>"),
  N8N_WEBHOOK_URL: optional(z.url()),
  N8N_WEBHOOK_SECRET: optional(z.string().min(16)),
  /** Shared secret for the cron endpoint that drains the outbox. */
  CRON_SECRET: optional(z.string().min(16)),
  /** Where new inquiries and contact-form messages are sent (the team). */
  OPS_EMAIL: optional(z.email()),
  OPS_WHATSAPP: optional(z.string()),

  // Cloudflare Turnstile (spam protection). Unset = checks are skipped.
  TURNSTILE_SECRET: optional(z.string()),
});

export const env = schema.parse(process.env);
