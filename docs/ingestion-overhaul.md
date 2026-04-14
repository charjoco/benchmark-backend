Benchmark Ingestion Overhaul
Status: Planning complete, ready for implementation
Owner: Jason
Drafted: April 2026
Why this document exists
Benchmark's data ingestion has been inconsistent in ways that undermine the core promise of the app: that when a brand drops something new, it shows up here, correctly categorized, in the right tab. The current system has the right bones — most brands hit Shopify's /products.json endpoint, gender filtering is reasonable, the database schema is sound — but the signal logic layered on top of those bones has bugs that cause sale items to appear in New Drops, products to be silently dropped at categorization, and entire features (Restock) to never have worked at all.
This document defines the rebuild. It is intentionally specific. When Claude Code reads this alongside CLAUDE.md, it should have everything it needs to plan the work, ask the right clarifying questions, and execute changes in the right order without guessing.
What's actually wrong (the diagnosis)
1. The isNew flag treats "first seen in DB" as equivalent to "new drop." Today, a product is flagged isNew if it appears in a brand's new-arrivals collection, OR has a "new" tag, OR was first seen in the database within the last 14 days. That third condition catches too much. Sale items the scraper picked up for the first time get flagged new. Products that existed for months but only got noticed recently get flagged new. There is no rule preventing a sale item from being simultaneously flagged new.
2. Categorization silently drops products. The category resolution logic in lib/normalize/category.ts requires both a product type/tag match AND a title keyword match (when titleContains is defined). Products that match the type but not any title keyword fall through every category and are silently excluded. The skipped counter tracks them; nobody reads it. A meaningful fraction of "missing products" complaints are probably this, not actual scraper failures.
3. isBestseller is populated from brand-supplied data that can't be trusted. Each brand's bestseller collection often includes sale items, end-of-season clearance, and items the brand wants to push rather than items that are actually selling well. These leak into the Best Sellers tab.
4. The Restock feature has never worked. The upsert logic compares existing.inStock to a new inStock value, but there is no top-level inStock field on the Product model — only per-size availability inside the sizes array. The comparison silently never triggers.
5. Email-triggered scrapes are a major source of bug surface. Mailgun ingestion, Gmail polling, and email parsing are each a separate failure mode for what is fundamentally an optional optimization (faster reaction time to drops). For a TestFlight app with under 10 users, the optimization is not worth the complexity cost.
6. The system has no operator feedback loop. ScrapeLog records exist but are never read by a human. There is no daily summary, no failure alerting, nothing that surfaces problems before they're noticed in the app. Silent failures are the default state.
7. Lululemon is on a separate code path (Playwright). It's the only non-Shopify brand and accounts for a meaningful chunk of code complexity for a single brand whose anti-scraping measures make it unreliable anyway.
The new architecture
Acquisition. All 18 brands are scraped via Shopify's public /products.json endpoint. No HTML scraping, no headless browsers, no email parsing. Scrapes run on a flat hourly schedule via node-cron. One cron job, every hour, all brands sequentially.
Filtering. The existing isMensProduct gender-filtering pipeline stays as-is. It's working correctly and the brand-specific configurations are sound. Stale-deletion stays as-is.
Categorization (rebuilt as a tiered pipeline). Three tiers, in order:

Rule-based matching. The current resolveCategory logic, kept mostly as-is, but with the silent-drop behavior changed. If a product fails to match any category at the rule layer, it does not get dropped — it falls through to tier 2.
Vision-based fallback. Products that fall through tier 1 have their primary image sent to Claude (claude-haiku-4-5) with a prompt asking it to classify the image into one of the 9 categories or return "uncertain." A confident category response is accepted. An "uncertain" response, an unparseable response, or an API failure sends the product to tier 3.
Retry queue. Products that fail both tiers go into a pending_classification state in the database. They are not visible in the app. Each subsequent hourly scrape retries classification. After 5 consecutive failed classification attempts, the product is marked classification_failed and excluded permanently (still not deleted, so it can be inspected later).

This tiered approach preserves Jason's "false positives bother me more than false negatives" preference: nothing gets a guessed category. It also recovers products the current system silently loses.
New drop detection (rebuilt). A product is isNew if and only if all of the following are true:

The product was first seen in the database within the last 14 days, OR a colorway of the product was first seen in the last 14 days
The product is not currently in the brand's sale collection — UNLESS the product was also first seen within the last 14 days, in which case "born on sale" applies and isNew and onSale can both be true
The product is not in a "restocking" state (this check stays even though the Restock feature is removed, because the existing logic correctly distinguishes restocks from new arrivals at the upsert layer)

Per-colorway newness tracking. This is new logic. The colorways JSON field on each Product gets a firstSeenAt timestamp per colorway. When a scrape detects a colorway that wasn't in yesterday's data, that colorway's firstSeenAt is set to now. The product surfaces in New Drops if any colorway is within the 14-day window. The mobile app's product card should show the new colorway as the primary image when newness is colorway-driven (not product-driven).
Sale tab. Defined as: any product where compareAtPrice > price OR the product is in the brand's sale collection (forceSale). No time decay, no "discounted recently" filter. Anything currently discounted is in the Sale tab. Brands without a configured saleHandle and no products with compareAtPrice simply have an empty Sale state — and those brands have their Sale tab hidden in the mobile UI entirely.
Bestsellers. The isBestseller field and popularHandle configuration are removed from the scraper. The Best Sellers tab in the mobile app is hidden behind a feature flag, defaulted off. TODO (revisit when active user count exceeds ~100 or daily product views exceed ~1000): implement a backend job that queries PostHog event data nightly to compute per-brand bestsellers from actual user save and view behavior, write the results to a BestsellerRanking table, and re-enable the tab.
Restock feature. Removed entirely. Strip the restockedAt field, the inStock comparison logic, and the Restock tab from the mobile app. If restock detection becomes a real product priority later, it gets designed properly — not patched onto a half-built foundation.
What gets deleted
This is the cleanup pass. All of these can be removed in a single PR before any new functionality is built.

lib/scrapers/playwright.ts and the entire Lululemon scraper
The playwright and playwright-core npm dependencies
The Lululemon entry in lib/config/brands.ts
The Lululemon button in lib/constants.ts on the mobile side
Gmail polling cron and all Gmail API integration code
GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN env vars on Railway
Email-parsing logic for promotional emails
Mailgun webhook handler (if present)
The Nordstrom retailer scraper
The REI retailer scraper
The restockedAt field on the Product model and the Restock tab in the mobile app
The popularHandle field from all brand configurations and the isBestseller write logic from the scraper
All popularHandle Shopify collection URLs from each brand config

The sellers JSON field on the Product model stays in the schema even though no scraper currently writes to it. Future-proofing for retailer enrichment.
What gets built
In rough order of dependency:
1. The cleanup PR — everything in the "what gets deleted" section above. This is non-negotiable to do first; trying to build on top of dead code makes everything else harder. Should be a single mechanical PR with no behavior changes beyond removal.
2. Hourly scrape scheduling — replace the current 10am/4pm cron with a single hourly cron. Update instrumentation.ts. Make sure the sequential brand execution still completes well within an hour (current full scrape time is the relevant metric — if it takes 45 minutes today across 19 brands, it'll take ~42 minutes across 18, comfortably within the hour).
3. New/sale mutual exclusivity fix — the smallest, highest-value change. Modify upsertProduct so that isNew is set to false whenever the product is in the sale collection AND firstSeenAt is older than 14 days. Born-on-sale items (in the sale collection AND firstSeenAt within 14 days) keep both flags. This single fix should resolve the most visible user-facing bug.
4. Per-colorway newness tracking — extend the colorway data model to include firstSeenAt per colorway. Update the colorway diff logic in groupVariantsByColor and upsertProduct to detect new colorways. Update isNew computation to fire on either product-level OR colorway-level newness within 14 days.
5. Tiered categorization pipeline — the biggest piece of new code. Refactor resolveCategory to return a result object: { status: "matched", category }, { status: "no_match" }, or { status: "ambiguous" }. In the scraper, products with no_match get sent to a new classifyWithVision function that calls Claude with the product image and a categorization prompt. Add a classificationStatus field to the Product model with values: classified, pending, failed. Products in pending are excluded from app queries via a Prisma where clause. Each scrape retries pending products; after 5 attempts, they move to failed.
6. Daily monitoring email — a new cron job that runs once daily (suggest 7:00 AM Central). Queries the ScrapeLog table for the prior 24 hours, computes summary stats per brand (products scraped, new drops, sale items, errors, classification failures), and sends an email to mohrjd@gmail.com via SendGrid or Resend (Resend is simpler — one env var, one API call). The email is plain and short: brand-by-brand summary table, anything anomalous flagged at the top, total counts at the bottom.
7. Failure alerting — separate from the daily summary. When a brand's scrape fails 3 hourly attempts in a row, send a one-time alert email to the same address. After the alert fires, suppress further alerts for that brand for 24 hours to prevent inbox flooding.
8. Per-brand sanity checks — after each scrape, compare the new product count against the trailing 7-day average for that brand. If today's count is more than 50% lower, log an anomaly (which the daily email will surface). This catches the "Vuori suddenly returns zero shirts" silent regression.
9. Sale tab visibility — add a hasSaleCollection: boolean field to brand configurations. Mobile app reads this and hides the Sale tab for brands where it's false.
How to roll this out
Do not try to ship all of this in one PR. The right order:

Cleanup PR (deletions only). Verify the app still works with 18 brands and no Lululemon, no email path, no Restock tab. This should be uneventful.
Hourly scheduling + new/sale mutual exclusivity fix. These are small changes that immediately improve the app. Ship them together. After this lands, sale items should stop appearing in New Drops, and the system should be polling at the right cadence. Live with it for 2-3 days. See what users notice.
Pick one brand and build the full new pipeline end-to-end for it. Recommend Taylor Stitch — it has the trickiest current configuration (color-from-title) and the cleanest product data, so if it works there it'll work anywhere. Build per-colorway tracking, the tiered categorization, and the retry queue just for Taylor Stitch. Verify everything works. Then turn it on for the other 17 brands as configuration, not new code.
Daily monitoring email. Build it once the new pipeline is running so the email reflects the new system.
Failure alerting and sanity checks. These are last because they require some baseline data to compare against.

Success criteria
The overhaul is done when all of the following are true:

A new Vuori (or any brand) drop appears in the app's New Drops tab within 60 minutes of going live on the brand's site, ≥95% of the time, measured over a 2-week observation window.
Zero sale items appear in the New Drops tab. If this is violated even once, that's a bug, not an edge case.
Zero products are silently dropped at categorization. Every product that passes the men's gender filter ends up either classified, pending classification, or marked as a classification failure (in which case it's inspectable).
Jason receives one email per day at mohrjd@gmail.com summarizing the prior day's ingestion, and zero emails on days where everything ran cleanly other than the daily summary.
Adding a new brand requires editing two files (lib/config/brands.ts and mobile lib/constants.ts) and zero lines of new scraper code.
The Restock tab does not exist anywhere in the mobile app or backend.
The Best Sellers tab is hidden in the UI but the codebase contains a clearly-marked TODO with the conditions under which it should be re-enabled.

Things explicitly deferred
These are intentional non-decisions, not oversights. Documented here so future-Jason and future-Claude-Code don't have to re-litigate them:

Bestseller computation from analytics. Wait for ~100 active users or ~1000 daily product views.
Lululemon. Revisit only if the app is "amazingly successful" and Lululemon ends up being a frequent user request.
Nordstrom and REI seller enrichment. The sellers field stays in the schema for the day this comes back.
Email-triggered fast scrapes. Optimization, not requirement. Reconsider only after the hourly schedule has been live for a month and is provably reliable.
Affiliate revenue via Impact.com. Already in setup but out of scope for this overhaul.
Restock detection. If it becomes a priority, design it properly from scratch.

Open questions for the implementer
These are things Claude Code should ask Jason about before writing code, not assume:

What email service should the daily summary use — Resend, SendGrid, or something already wired up? Resend is recommended for simplicity.
What time should the daily summary land? Suggested: 7:00 AM Central, so it's waiting in Jason's inbox at the start of the day.
Should the per-colorway firstSeenAt data be retroactively backfilled from existing colorway data, or should it start fresh from the day this ships? (Recommend: start fresh. Backfilling would require guessing.)
For the vision categorization prompt, should the model see the product title alongside the image, or just the image? (Recommend: both. Title is a strong signal and free to include.)