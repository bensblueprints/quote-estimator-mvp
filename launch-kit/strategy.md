# Launch Strategy — Quotewell

## Positioning
"You don't need a document-automation SaaS to make a quote with a total at the bottom." Quotewell is the anti-platform: a $29 pay-once desktop quote builder vs PandaDoc/Proposify quoting gated behind $19+/user/mo.

## Target communities (rules-aware angles)

- **r/Contractor / r/Construction** — no naked self-promo; lead with a genuine question thread: "How long does an estimate take you, start to PDF?" Share the tool in comments when asked, be upfront it's your product. Contractors quoting from the truck are the perfect offline-first users.
- **r/smallbusiness** — allows tools discussion when framed as cost-cutting. Angle: "We cut $228/yr of quoting SaaS with a one-time $29 app" — show the math, link in comments.
- **r/freelance** — angle: professional quotes win jobs; catalog + duplicate-last-quote means a proposal in 5 minutes. Avoid link-dropping; answer quoting-workflow questions first.
- **r/Entrepreneur** — build-in-public post: "I'm shipping 50 pay-once replacements for subscription software. #16 is a quote builder." Story first, product second.
- **r/selfhosted / r/degoogle** — privacy angle: quotes are sensitive business data; Quotewell keeps them in a local SQLite file. MIT source is the credibility pass for these subs.
- **Facebook trade groups (electricians, landscapers, painters)** — screenshots of a finished branded PDF do the selling; post as "made this for my own estimates, sharing it."

## Hacker News — Show HN draft

**Title:** Show HN: Quotewell — a $29 pay-once desktop quote builder (Electron + SQLite)

**Body:**
I run a small service business on the side and refused to pay $19/user/mo for what amounts to line items and a total. Quotewell is my answer: an MIT-licensed Electron app with a saved price catalog, per-line flat/% discounts, tax, optional/alternate lines, branded printToPDF export, and won/lost history — all in a local SQLite file.

Technical bits HN might enjoy: all money is integer cents end-to-end (storage, math, rendering) with Math.round only at percent boundaries, so totals are exact and testable; business logic is plain Node modules smoke-tested without Electron; better-sqlite3 is vendored for both the Node and Electron ABIs so tests and the app share one native module.

Source is on GitHub — build it yourself for free. The $29 is for the packaged installer (and for wanting tools like this to keep existing). Happy to answer anything about the pay-once model or the cents math.

## SEO keywords (10)

1. free quote builder software
2. contractor estimate app offline
3. service business quoting tool
4. quote generator desktop no subscription
5. estimate software one time purchase
6. PandaDoc alternative one time payment
7. Proposify alternative for contractors
8. quote template with price catalog
9. small business quote maker PDF
10. offline estimating software for trades

## AppSumo / PitchGround pitch

Quotewell is a desktop quote & estimate builder for the 30M+ service businesses that quote weekly but will never pay $19/user/mo for a "document automation platform." Users build a price catalog once, then produce branded, tax-correct PDF quotes in minutes — with per-line discounts, optional upsell lines, and won/lost pipeline tracking — all stored in a local SQLite file they own. It's MIT-licensed, works fully offline, and sells at a flat $29 lifetime price with zero infrastructure cost per customer, making it a natural high-margin LTD: your audience gets a genuinely lifetime deal (there's no server to sunset), and the "pays for itself in 1.5 months vs PandaDoc" math writes the campaign copy itself.

## Pricing math

- Quotewell: **$29 one-time**
- PandaDoc Essentials: $19/user/mo → $228/yr; Proposify: $49/user/mo
- **Payback: ~1.5 months** vs the cheapest competitor tier; 3-year savings ≥ $655 per seat.
- Launch promo option: $19 first-week price ("less than one month of PandaDoc").
