# booking.com reference (2026-09-22)

Captured live via Chrome to re-sample `src/app/globals.css`'s design tokens away from
the earlier Lumière Events reference — see [[feedback-follow-design-reference]] in
memory and `git log` around this date for why. `homepage.jpg` is the homepage at
1503px width, logged out, en-US/GEL.

## Sampled values (via `getComputedStyle`, not guessed)

- Header/hero background: `rgb(0, 59, 149)` = `#003b95` → `--color-brown` (kept the old
  token name; it's navy now, not brown).
- Body/page background: `rgb(255, 255, 255)` = white → `--color-page` / `--color-panel`.
- Body text: `rgb(26, 26, 26)`.
- Base font: system-ui stack (`-apple-system, "Segoe UI", Roboto, Helvetica, Arial,
  sans-serif`); headings use a licensed font ("Avenir Next") we can't ship, so
  `--font-sans` uses Inter (Latin) + Noto Sans Georgian instead — see `src/app/[locale]/layout.tsx`.
- Search button border-radius: `4px` → shape tokens (`--radius-card` etc.) shrunk from
  the old large rounded corners toward this.
- Booking's well-known accent/link blue (`#0071c2`) was not reliably extractable via
  computed styles (rendered through a nested component), so it's used from documented
  brand knowledge rather than a live sample → `--color-coral`. `--color-coral-strong`
  (`#005ea6`) is a darker shade of the same hue for guaranteed AA text contrast.

## What we did not copy
- Density/information architecture (search-first, many small property cards) — out of
  scope for this pass, which only changed color/type/shape tokens plus removing the
  boxed `max-w-[1280px]` page frame (`src/app/[locale]/layout.tsx`) so the site is
  edge-to-edge like booking.com and the earlier Lumière reference both are.
- Booking's two-blue system for cards vs. buttons in detail — Conferencehall keeps a
  single accent hue (`coral`/`coral-strong`) rather than introducing a second blue.
