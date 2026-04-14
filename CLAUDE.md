Benchmark — Project Context
This file is read automatically by Claude Code at the start of every session. It is the durable description of how Benchmark works, what the rules are, and what should never be done casually. Project-specific work plans live in docs/. This file changes rarely.
What Benchmark is
Benchmark is a men's premium athleisure discovery app. It scrapes product data from a curated list of brands, stores it in a database, and serves it to a React Native mobile app. Users browse new drops, sale items, and (eventually) bestsellers across all brands in one place. Tagline: "For men who set the bar."
The app is in TestFlight with under 10 active testers. Public release is planned but not imminent. Decisions should favor reliability and simplicity over scale-readiness.
Stack
Backend — Next.js 15 (App Router) on Railway, Prisma 7 with PostgreSQL on Neon, node-cron for scheduling, Anthropic API for vision-based product classification.
Mobile — Expo SDK 55 / React Native 0.83, Expo Router, Supabase for auth and user preferences, PostHog for analytics, distributed via TestFlight.
Two repos — charjoco/benchmarkbackend and charjoco/benchmarkmobie.
Where data lives

Neon Postgres — all scraped product data. Tables: Product, ScrapeLog. Connected via DATABASE_URL.
Supabase — user accounts, auth, preferences (sizes, favorite brands, color preferences), and user-saved/watched products. The mobile app reads/writes Supabase directly; the backend is not involved in user data.

Keep this separation strict. Product data never goes in Supabase. User data never goes in Postgres.
The brand list (18 brands)
BYLT, ASRV, Buck Mason, Reigning Champ, Todd Snyder, Rhone, Mack Weldon, Vuori, Public Rec, Ten Thousand, Faherty, Holderness & Bourne, Linksoul, Paka, Taylor Stitch, TravisMathew, Greyson, Johnnie-O.
Lululemon was previously included and has been intentionally removed. Do not re-add it without an explicit decision from Jason. Nordstrom and REI retailer enrichment scrapers were also removed.
Ingestion architecture (the rules)
These rules are the core of what makes Benchmark trustworthy. Violating them is what made the previous system unreliable.
1. Shopify products.json is the only acquisition method. Every brand is on Shopify and exposes a public /products.json endpoint. This is the sole source of product data. Do not introduce HTML scraping, headless browsers, or email parsing. If a brand stops being on Shopify, that's a conversation, not a code change.
2. Email-triggered scrapes do not exist. The previous Mailgun + Gmail polling path has been deleted. Do not reintroduce it. Scraping happens on a schedule, full stop.
3. Scrapes run hourly for all brands, on a flat schedule. Not tiered, not event-driven, not triggered by external signals. One cron, every hour, all 18 brands sequentially.
4. Categorization is tiered: rules → vision → drop. Rule-based category matching runs first. If rules return no confident match, the product image is sent to Claude for vision-based categorization. If vision is unavailable or also returns no confident match, the product is held in a retry queue, not silently dropped. Only after repeated failures is a product abandoned. False positives (a vest in the shorts tab) are worse than false negatives (a product missing for an hour).
5. New and Sale are mutually exclusive, with one exception. A product currently in a brand's sale collection cannot be flagged isNew — UNLESS the product is brand-new to the database within the last 14 days, in which case "born on sale" applies and the product appears in both New Drops and Sale tabs simultaneously for its first 14 days.
6. "New" includes new colorways of existing products. When a brand adds a new color variant to an existing product, that colorway is tracked with its own firstSeenAt timestamp and surfaces as a new drop, even though the parent product itself is not new. Per-colorway newness tracking is a first-class feature, not an afterthought.
7. Bestsellers are computed from app analytics, not brand collections. The popularHandle and isBestseller fields populated from brand-supplied data are not trusted. The Best Sellers tab is hidden in the UI until there is enough user save/view data to compute popularity from PostHog analytics. TODO: revisit when active user count exceeds ~100 or when daily product views exceed ~1000.
8. The Restock feature has been removed. No restockedAt, no Restock tab, no inStock-comparison logic. Do not reintroduce without explicit direction.
9. Brands without a sale collection do not show a Sale tab. Per-brand UI configuration. The tab is hidden, not empty.
10. Vision screening fails into a retry queue, not into the live catalog. When the Anthropic API is unavailable or returns an unparseable response during categorization, the affected product goes into a holding state and is retried on the next scrape. It does not appear in the app until classification succeeds. (This is a deliberate change from the previous fail-open behavior, which allowed unscreened products into the catalog.)
Monitoring
A daily summary email is sent to mohrjd@gmail.com once per day, summarizing all 24 hourly scrapes from the prior day: total products, new drops detected, errors, brands with anomalous behavior. Failures during the day do not generate per-incident emails — only the daily digest, plus a single immediate alert if a brand fails 3 hourly scrapes in a row.
Jason does not check scrape logs manually. If a problem is not surfaced via the daily email, it does not exist as far as the operator is concerned. Build accordingly.
Conventions

Brand keys are lowercase, hyphenated: buck-mason, holderness-bourne, travis-mathew. Mobile lib/constants.ts keys must exactly match backend brandKey values.
Categories are one of: shirts, polos, longsleeve, hoodies, sweaters, zips, shorts, pants, jackets. Polos includes short-sleeve collared shirts. No other categories without an explicit decision.
Product exclusions (men's only, no exceptions): women's, children's, footwear, accessories, equipment, gift cards, socks, underwear.
Color buckets are the 13 defined in lib/normalize/color.ts. Navy must be matched before Grey in the priority order (heather-navy edge case).

What to do when something seems broken

Check the daily summary email first.
Check ScrapeLog records for the affected brand via /api/scrape-logs.
Manually trigger a single-brand scrape: POST /api/scrape with { "brand": "vuori" } and the x-scrape-secret header.
If a product is missing, check whether it was filtered by gender, dropped by category resolution, or held in the retry queue. Each has a different fix.

What never to do without asking

Add a brand outside the 18-brand list.
Reintroduce email-triggered scraping.
Reintroduce Lululemon, Nordstrom, REI, or Playwright.
Change the new/sale mutual exclusivity logic.
Allow vision-screening failures to write products to the live catalog.
Touch Supabase from the backend or Postgres from the mobile app.