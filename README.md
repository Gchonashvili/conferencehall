# Conferencehall

Conference hall aggregator for Georgia. Hotels and venues list halls; organizations search, send one request, get a confirmation from the venue, and pay a deposit. Product brief: [PRD.md](PRD.md). Research: [research/](research/).

Stack: Next.js 16 (App Router) · TypeScript · Tailwind v4 · next-intl (`/ka`, `/en`) · Drizzle + Postgres (Neon in production) · Better Auth · Mailgun · n8n (WhatsApp) · Railway.

## Run it locally

No external services are needed. In development the database is PGlite (real Postgres, in-process) and emails and WhatsApp messages are printed to the terminal.

```bash
pnpm install
pnpm db:seed:sample        # cities, event types, amenities + fictional sample venues
pnpm dev                   # http://localhost:3000  (redirects to /ka)
```

- `/en/design` is the design-system review page (development only; 404 in production).
- Verification and password-reset links appear in the terminal as `[mail:dev]`.
- **Only one process may use the local database.** Stop the dev server before `pnpm admin ...` or `pnpm db:seed`. A lock file enforces this and explains itself if you forget. Stop both `next dev` and its child `next-server`.

## Team commands

```bash
pnpm admin promote you@example.ge                 # make a user an admin
pnpm admin link-venue manager@hotel.ge <slug>     # let a user manage a venue
pnpm admin verify user@example.ge                 # mark an email verified
```

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## How a booking request flows

1. Organizer submits the form on a hall page. The server validates it, then in **one transaction** stores the request and queues notifications (the *outbox*).
2. Notifications go out immediately after the response; if that fails, the cron worker retries with backoff (8 attempts, then `dead`). A WhatsApp or email outage never loses a request.
3. The venue answers in `/dashboard`. Accepting sets the price and deposit and emails the organizer, who sees it under `/account/reservations`.
4. Requests the venue never answers expire after `REQUEST_EXPIRY_HOURS` (default 48).

## Environment

See [.env.example](.env.example). Required in production: `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ chars), `NEXT_PUBLIC_SITE_URL`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`, `CRON_SECRET`. Without Mailgun/n8n configured, production **fails loudly** (queued messages stay `failed` and are retried) instead of silently dropping them.

## Deploy (Railway)

- **web**: `pnpm build`, start `pnpm start`, pre-deploy command `pnpm db:migrate`.
- **cron** (every minute): `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" $SITE_URL/api/cron/outbox`
- **n8n**: separate service. It receives signed webhooks; verify `x-conferencehall-signature` = `sha256=HMAC(secret, "<timestamp>.<raw body>")` and reject old timestamps. See `src/lib/notifications/whatsapp.ts`.

## Not built yet

Online deposit payment (gateway not chosen), admin panel for halls/venues (use seed + `pnpm admin` meanwhile), photo upload (Cloudflare R2), map view, reviews, a strict CSP.
