# Quotewell

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Pay once. Own it forever. No subscription.**

Quotewell is a fast, local desktop quote & estimate builder for service businesses — contractors, freelancers, agencies, trades. Build a price catalog once, then turn out branded, professional PDF quotes in minutes. Everything lives in a local SQLite file on your machine: no accounts, no cloud, no per-seat pricing, no "document automation platform" between you and a total at the bottom of a page.

![Quotewell screenshot](docs/screenshot.png)

## Features

- **Price catalog** — save your services and materials with default price, unit, and description. Build it once, quote fast forever.
- **Line-item quote builder** — pull items from the catalog or add one-offs; quantities (fractional too), per-line discounts (flat $ or %), quote-level discount, tax rate, live auto-totals.
- **Optional / alternate lines** — show upsells and alternates on the quote, priced but excluded from the total.
- **Exact money math** — every amount is stored and computed in integer cents. No floating-point drift, ever.
- **Templates & branding** — cover note + terms boilerplate saved per business, logo, accent color. Selectable per quote.
- **Client info, valid-until date, notes** — everything a real quote needs.
- **Branded PDF export** — one click, via the built-in renderer. No watermarks.
- **Quote history** — duplicate a past quote for a similar job in one click; track **won / lost / sent / draft** status and see your open pipeline at a glance.
- **100% local & private** — SQLite on your disk. Works offline. No telemetry.

## Quick start

```bash
npm i
npm run build
npm start
```

`npm i` also vendors native SQLite bindings for both Node and Electron (see `scripts/setup-native.js`). `npm test` runs the full smoke suite. `npm run dist` packages a Windows installer.

## Tech stack

- **Electron** — desktop shell, PDF export via `printToPDF`
- **React + Vite + Tailwind CSS v4** — renderer UI (dark mode, Framer Motion, Lucide icons)
- **better-sqlite3** — local SQLite storage, WAL mode
- Pure-Node business logic in `src/` (money math, CRUD, quote HTML) — fully testable without Electron

## Quotewell vs. the subscription

| | **Quotewell** | PandaDoc / Proposify |
|---|---|---|
| Price | **$29 once** | $19–$49 /user/mo, forever |
| Cost after 1 year | $29 | $228+ |
| Cost after 3 years | still $29 | $684+ |
| Your data | local SQLite file you own | their cloud |
| Works offline | ✅ | ❌ |
| Per-seat pricing | none | yes |
| Quote with a total at the bottom | ✅ | ✅ (plus a sales-enablement platform you didn't ask for) |

At $19/mo, Quotewell pays for itself in about **1.5 months** — then it's free for life.

## ☕ Skip the setup

Want the 1-click Windows installer instead of building from source? Grab the packaged version:

**[Get Quotewell on Whop → https://whop.com/benjisaiempire/quotewell](https://whop.com/benjisaiempire/quotewell)**

Same MIT-licensed code, zero setup, plus you're buying the next tool in the suite into existence.

## License

MIT — see [LICENSE](LICENSE). Part of the [OneTime Suite](https://github.com/bensblueprints): 50 pay-once replacements for subscription software.

## macOS build

See [MAC-BUILD.md](MAC-BUILD.md). Quickest path: GitHub **Actions** tab -> run the **Mac Build** (`mac-build.yml`) workflow to get a downloadable `.dmg` (unsigned - right-click -> Open on first launch).
