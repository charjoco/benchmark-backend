Benchmark Curation Admin Tool
Status: Planning complete, ready for implementation
Owner: Jason
Drafted: April 2026
Depends on: Ingestion Overhaul must be live in production first. The categorization retry queue this tool surfaces is built as part of that work.
Why this document exists
Benchmark's differentiation as a premium athleisure discovery app is not going to come from "we scrape more brands than anyone else." It's going to come from taste. A curated collection, built by someone whose eye the user trusts, is what makes a product like this shareable and worth telling a friend about. The mobile app is the delivery surface for that curation; this tool is the production surface.
This tool also solves an operational problem. As the ingestion pipeline runs, a non-zero number of products will land in a retry queue requiring manual classification, and occasionally a brand's scrape will misfire in ways requiring awareness (not necessarily immediate code changes). Today there is no interface for any of this — you'd need to open Prisma Studio or Claude Code for every small operational decision. That's fine for one person doing occasional work. It's not fine for a two-person weekly curation cadence.
The tool is a single internal web app that handles both: editorial curation of collections, and the operational triage that keeps the catalog clean.
Architecture
Runtime. The tool is a set of authenticated routes on the existing Next.js backend at benchmarkbackend. No new service, no new deployment target, no new stack. Everything runs on Railway alongside the scrapers and the existing API routes.
URL. /admin/*. An /admin/page.tsx file already exists in scaffolded form and will be built out into the tool's home.
Authentication. A simple allowlist of Supabase user IDs for Jason and Heather, checked via Supabase server-side auth at the top of each admin route. Anyone not in the allowlist gets a 404. No password, no role system, no invitations. Two users, hardcoded IDs.
Data. New tables in Neon Postgres, managed via Prisma migrations:

Collection — one row per collection, with name, slug, description, isActive boolean, heroProductId (foreign key to Product), lastEditedAt, lastEditedBy (Supabase user ID).
CollectionProduct — join table connecting collections to products, with position (integer for ordering) and addedAt. Many-to-many: a product can belong to multiple collections.

Existing fields added to the Product model:

categoryOverride (nullable string) — when set, this value replaces whatever the automated categorization pipeline would produce. When set, the pipeline is skipped entirely for this product on future scrapes. Option A from the planning discussion: manual decisions are permanent and the pipeline doesn't second-guess them.
isHidden (boolean, default false) — when true, the product is excluded from all user-facing feeds but remains in the database for admin visibility. Used when a miscategorized or problematic product needs to disappear from the app immediately without waiting for a fix.

The user flow for Jason and Heather
Landing page (/admin) — four tiles: Collections, Daily Scrape, Retry Queue, Brand Health. Tiles show a count of anything requiring attention (collections with OOS items pending removal, retry queue length, brands flagged anomalous). Designed so the most common weekly visit is "scan the tiles, open whichever has a number on it."
Collections (/admin/collections) — list of all collections (active and draft), each showing name, hero image, item count, active/draft state, last-edited timestamp and who by. New Collection button at top.
Single collection editor (/admin/collections/[id]) — three-panel layout.

Left: product finder with search bar, brand filter (multi-select), category filter (multi-select), "new arrivals within 7 days" toggle. Results display as a scrollable grid of product cards showing image, title, brand, price, category. Each has an "Add to collection" button.
Middle: the current collection contents, in order, drag-to-reorder. Each item shows the product, a "set as hero" radio button, and a remove button.
Right: collection metadata — name, description, active/draft toggle, hero image preview, last-edited info.
Button at top: "Preview" opens a modal showing the collection rendered in a mobile-width column using the same ProductCard component the app uses. Not a full phone frame, just the feed as it'll appear.

Daily Scrape view (/admin/scrape) — three sections.

Today's new products (added to DB since the last scrape): product image, title, brand, auto-assigned category, first-seen timestamp.
Today's dropped-off products (present yesterday, absent today): product image, title, brand, last-seen timestamp, reason if known (OOS, removed from brand site, excluded by filter).
Summary stats: total scraped per brand, errors, anomaly flags.

Retry Queue (/admin/queue) — list of products awaiting manual categorization. Each row shows the product image, title, brand, the reason rule-based matching failed (no product type match, title keyword missing, etc.), and what Claude vision returned if it ran. Four actions per item:

Assign a category manually (dropdown of the 9 valid categories) — writes to categoryOverride, marks product as classified
Mark as "not men's apparel" — sets isHidden = true and tags with a note
Mark as "not apparel at all" (accessory, equipment, etc.) — same as above but with a different note for tracking
Send back to automatic classification — clears the retry state, next scrape will re-run the pipeline (useful if you fixed something upstream, e.g., added a new tag to the brand config)

Brand Health (/admin/brands) — one row per brand showing last scrape time, today's product count, 7-day average, delta, status indicator (green/yellow/red based on anomaly detection). Each row has a "Scrape now" button that triggers a single-brand scrape via the existing /api/scrape route. Clicking a brand name opens a detail view with the last 7 days of scrape history. This panel is read-only and action-triggering — it does not let you edit brand configurations. Editing brands.ts remains a code change via Claude Code.
Individual product page (/admin/product/[id]) — accessible from any product in any of the above views. Shows full product detail with buttons: recategorize (dropdown writes to categoryOverride), hide/unhide (toggle isHidden), add to collection (multi-select modal of existing collections). Read-only fields for everything else.
What gets built
This is the build order. Each item can ship independently and provide partial value.
1. Schema and authentication. Add the Collection, CollectionProduct tables, and categoryOverride / isHidden fields to Product. Build the Supabase user ID allowlist middleware that protects all /admin routes. At this point nothing is functional but the plumbing exists.
2. Collections CRUD and editor. Landing page tile, list page, single-collection editor with the three-panel layout, product finder, drag-to-reorder, hero selection, active/draft toggle, preview modal. This is the bulk of the work and the primary deliverable. Mobile app still does not display collections at this stage.
3. Mobile app collections surface. Add the "Collections" button beside "Shop by Brand" on the home screen. Build the collections list screen (hero images, names). Build the collection detail screen (reusing existing ProductCard). Add the home-screen feature rotation: two active collections randomly selected per day (seeded by date so all users see the same two), displayed as larger buttons. Collection feed endpoints: GET /api/collections (list active), GET /api/collections/[slug] (detail with products in order).
4. Out-of-stock auto-removal. Nightly job that runs after the 4am scrape: for each active collection, remove any product where inStock = false. Track removals in a day's summary. Include a line in the daily email: "Today: N products auto-removed from collections due to stock status, across M collections."
5. Daily Scrape view. Read-only view showing today's new products, dropped-off products, and summary stats. Reuses data already being written to ScrapeLog plus a delta query against Product rows by firstSeenAt and lastSeenAt.
6. Retry Queue. Depends on the ingestion overhaul's tiered categorization being live. Once products can land in classificationStatus: "pending", this view lists them and provides the four resolution actions. Each action calls a route that updates the Product record appropriately.
7. Brand Health panel. One row per brand with scrape stats, anomaly flags, and a "Scrape now" button. The underlying data comes from ScrapeLog with a 7-day rolling window query.
8. Individual product admin page. Accessible from any view, lets an admin recategorize, hide/unhide, and add-to-collection for any product.
Interaction rules and edge cases
Collections cannot exceed 15 products. Enforced server-side on the add endpoint, not just client-side.
Maximum 5 active collections. Enforced at the toggle-to-active action. Trying to activate a 6th returns an error asking you to deactivate another first. Unlimited draft collections allowed.
Hero product must be in the collection. If the hero is removed from the collection, hero resets to null and the collection won't feature on the homepage until a new hero is set. Collection still renders in the collections list, just without a hero image fallback.
Homepage rotation is seeded by date. Two collections selected via deterministic hash of the date, so every user sees the same two collections on April 13 and different two on April 14. Rotation logic: shuffle active collections using date seed, take first two.
Preview rendering. The preview modal uses the same ProductCard component the mobile app uses. It doesn't simulate a phone chrome, just shows the product cards stacked in a mobile-width column. Good enough for catching layout issues and confirming the collection reads right before publish.
categoryOverride behavior. When set, the scraper's resolveCategory function returns the override value without running rules or vision. No API calls wasted, no re-computation, no conflict resolution. Setting the override is permanent until manually cleared.
isHidden behavior. Hidden products are filtered out at the API layer in /api/products via a where: { isHidden: false } clause. They remain in the database, remain scrapeable, remain inspectable in the admin. Unhiding via the admin immediately re-exposes them to the app.
"Scrape now" rate limiting. To prevent accidental overload, manual scrape triggers from the Brand Health panel are limited to once per brand per 15 minutes. Button shows a countdown when disabled.
Collection deep-link URLs. Reserve /collections/[slug] as a URL pattern in the Next.js routing structure now, serving a static page that says "View this collection in the Benchmark iOS app" with an App Store link. Full web rendering of collections is a deferred feature (see known deferrals).
What doesn't get built (deferred)
These are intentional non-decisions, matched to specific re-evaluation triggers:

Brand config editing in the admin. Editing brands.ts remains a Claude Code workflow. Revisit if you find yourself editing brand configs more than once a month on average over a 3-month window.
Full operational control features (per-brand historical metrics dashboards, manual product field editing beyond category/hidden, vision testing tools, etc.). Revisit when user count exceeds 500 or when operational burden starts taking more than 2 hours per week.
Web rendering of collection deep links. Shareable collection URLs that actually render the collection in a browser. Revisit when marketing/distribution efforts need shareable URLs more than they need app-exclusive content.
Guest-curated collections. Third-party curators beyond Jason and Heather. Revisit when the app has enough users that a guest curator would move the needle on engagement — probably 1,000+ MAU.
Change history / full audit log. Only last-edited timestamp per collection for now. Revisit if collaborative editing between Jason and Heather produces actual "who changed this" confusion.
Collection scheduling (collections that auto-activate on a future date). All activation is manual. Revisit if the editorial calendar ever requires more than one scheduled drop per month.
A/B testing which collections rotate on the homepage. The current rule is random-by-date. Revisit when user count justifies measurable experimentation.
Mobile push notifications when a curated collection goes live. Revisit post-launch once baseline engagement metrics are understood.

Success criteria
The admin tool is done when:

Jason and Heather can each log in, build a 10-15 item collection from scratch, and publish it to the mobile app in under 15 minutes.
Active collections appear correctly on the mobile home screen with the Collections button beside Shop by Brand, and the two rotating featured slots show different collections each day.
Out-of-stock products automatically disappear from collections within 24 hours of going out of stock, and the daily email notes how many were removed.
The retry queue can be resolved to zero in a weekly session, with manual categorizations persisting across subsequent scrapes without being overwritten.
Individual products can be hidden from the app in under 30 seconds from any admin view.
The Brand Health panel flags an anomalously low scrape count for a brand within 24 hours, and the "Scrape now" button works for manual re-trigger.
Zero access to the admin panel is possible for users outside the Supabase allowlist, including via direct URL navigation.

Things to decide before starting build
Questions for Claude Code to confirm with Jason at the start of the work:

What should the launch slate of collections actually be? Three to start (suggested: Course to Clubhouse, Weekend Wear, Heather's Picks) or all five at once?
How should the Collections button on the home screen visually differ from Shop by Brand? Same treatment with different label, or distinct styling to signal it as "editorial"?
Should the homepage feature rotation show the collection hero image as the button background, or a stylized treatment with the name only?
For the retry queue's "not apparel at all" action, should we also optionally send feedback to improve the categorization pipeline over time (e.g., add the excluded tag to the brand's womensExclusionTags config automatically)? Recommend: no, keep it as tracking-only for now. Config changes stay in code.
Should drafts be visible to both curators, or should each curator's drafts be private to them? Recommend: visible to both, since it's a two-person collaboration.

Open technical questions for implementation

For the preview modal, use the actual ProductCard component source from the mobile repo, or duplicate a simplified version in the admin? Recommend: duplicate a simplified version for now — cross-repo component sharing is more complexity than it's worth at this stage.
For drag-to-reorder, use react-beautiful-dnd (mature but in maintenance mode), @dnd-kit/sortable (newer, actively maintained), or a simpler up/down arrow UI? Recommend: @dnd-kit/sortable. Better ergonomics than arrows, better future-proofing than react-beautiful-dnd.
How should the nightly OOS cleanup job be triggered — a new cron in instrumentation.ts, or piggybacked on the existing scrape cron? Recommend: piggyback on the 4am scrape so it runs once after all brands are refreshed. One cron is simpler than two.
For the date-seeded homepage rotation, use UTC date or a specific timezone? Recommend: US Central (Jason's timezone), so the rotation ticks over at midnight local time rather than 7pm.