# Brand Normalization & Onboarding

**Status:** Reference — keep current as the codebase evolves
**Owner:** Jason
**Drafted:** May 2026

The procedure for adding a new brand — or re-normalizing an existing one — so that it lands in the catalog correctly categorized, correctly colored, and exclusion-clean, with those rules applied to **both new and existing products**.

---

## The mental model: four states

A change is not "done" until it has passed through all four. Almost every failure this project has hit came from treating an earlier state as the final one.

1. **Committed** — the code exists locally.
2. **Deployed** — Railway is actually running it. *Verify:* the commit is on `origin/main` AND Railway shows it Active. The GitHub webhook intermittently drops pushes — if no deploy fires within ~90s, push an empty trigger commit (`git commit --allow-empty -m "chore: trigger deploy"`).
3. **Applied** — the rule has actually changed the data in the DB. **This is the step that hides.** Deploying a categorization rule does *not* change existing products. The scraper precheck in `lib/scrapers/shopify.ts` has two bypass paths that protect existing rows: Step 1 checks `categoryOverride` (admin-set, absolute priority — skips rules, vision, and is unaffected by backfills that set `category`); Step 2 checks `precheck?.category` (the scraper optimization that reuses any non-null stored category and skips rules and vision entirely). New rules therefore only affect products first seen *after* deploy. Existing rows require a **backfill** (Step 6). *Exception:* color resolution (`resolveAppColor`) runs unconditionally on every scrape inside `upsertProduct`, so color changes apply retroactively without a backfill.
4. **Visible** — the mobile app reads the field the data is in. Confirm the app reads `appColor` / `availableColors` (new pipeline, not legacy `colorBucket`), and that any new category key exists in the mobile `ALL_CATEGORIES` array in `lib/constants.ts` (rendering is count-driven — a category with zero products simply doesn't appear — but the key must be in the array first).

---

## Procedure

### 1. Diagnose (no code changes yet)
- DB state: total, categorized, visionFailed, retry-pending.
- `product_type` distribution (men's, after gender filter) — pull from **live Shopify**, not just the DB, to catch types not yet ingested. The DB does not store `product_type`.
- Scraper config check: `colorOptionNames`, separators, gender tags, handle quirks.
- Licensed-sports scan (NFL/NCAA/MLB/NHL/NBA, college names, event collabs) — run it even for brands you expect to have none.
- Multi-destination product types (a "Tops" or "Midlayers" type spanning hoodies/zips/polos/longsleeve/etc.) → these need title dispatch.
- Color baseline: existing `colors.ts` entries + the top ~30 UnknownColor names by occurrence count.
- visionFailed audit: what are they *actually*? Usually non-apparel to exclude (hats, bags, water bottles), not hard-to-categorize apparel.

### 2. Editorial decisions (surface to the product owner; don't assume)
Established defaults:
- Golf **in**; team / ball-sports licensed merch **out** (NBA, NFL, MLB, NHL, NCAA).
- Tailored blazers / sport coats **out** (all brands).
- Sleeveless (tanks, muscle tees) **out**.
- Underwear, swim ("Water Tops"), footwear, headwear, accessories, bags **out**.
- Boardshorts: case-by-case — athleisure-positioned → `shorts`; pure swim → out.
- Button-downs: split by sleeve where the line spans both (long sleeve → `longsleeve`, else → `shirts`); map all to `shirts` where it's a coherent SS/dress line. Sleeve keywords to check: `"long sleeve"`, `"longsleeve"`, `"long-sleeve"` (hyphenated variants exist).
- Vests: their own category, catalog-wide. A shared rule in `resolveCategory` routes `/\bvests?\b/i` → `vests` before brand dispatch fires, including knit "sweater vests."

Surface anything ambiguous as numbered questions before building.

### 3. Build
- `lib/brands/<brand>/categories.ts` — exclusion set, title-based exclusion helpers (blazer, sleeveless), MAP with title dispatch for multi-destination types. **Default unrecognized products to `null` (vision fallback), never to a confident wrong guess** — a hard-coded fallback category is what put snow pants in the sweaters tab.
- `lib/brands/<brand>/colors.ts` — map brand-specific names that `common.ts` / canonical keyword scan can't resolve. **Visually verify borderline colors** by pulling a product image — do not infer from the name (Kashmir → teal, Smoked Beryl → teal, and several others were non-obvious from the name alone). Add explicit `"x heather"` / `"x marle"` paired entries: modifier-stripping (Step 4 in the resolver) looks up `common.ts` only, not the brand dict, so if the base name is brand-dict-only its heather variant must also be listed explicitly.
- Wire into `lib/normalize/category.ts`: add the import, an `isExcludedProductType` branch, and a `resolveCategory` branch.
- Add the import for the brand color file at the top of `lib/normalize/colors/resolver.ts`, and add the brand key + map entry to the `BRAND_COLOR_MAPS` object in that file.
- In `lib/config/brands.ts`, set `categoryMappings: {}, // Categorization owned by lib/brands/<brand>/categories.ts` for the brand entry.
- **Dispatch-vs-spec table (required output of this step).** For every `product_type` the brand uses, produce a three-column table: `product_type | agreed Step 2 decision | actual code behavior`. "Actual code behavior" means tracing the dispatch path in the code you just wrote — not restating the intent. Deviations are caught here at build time, not in three verification rounds after the backfill. Do not declare the build step done until this table shows no discrepancies.
- **Color-resolution proof (required output of this step).** For every high-count color name in the brand's Shopify data, show the resolution path: brand dict hit, common.ts hit, or canonical keyword match. Asserting in a comment that a name "auto-resolves" is not a proof — trace the actual path through `stripModifiers` → `common.ts` → canonical keywords. Flag any name that fails all paths as needing an explicit brand dict entry.

### 4. Pre-commit review
Read the **actual file content** (or grep specific entries) — not a summary. Several gaps this project shipped were invisible in summaries and only caught by the dry-run regression check in Step 6. The dry-run is the stronger safety net; file review is the backup.

### 5. Commit → push → deploy
- Commit, push, and **verify the commit actually landed on `origin/main`** (pushes have silently failed to fire).
- Watch Railway for auto-deploy. No deploy within ~90s → webhook dropped it → push an empty trigger commit.
- Confirm Railway shows the new commit **Active**.

### 6. Backfill — the forgettable, critical step
Deploying rules fixes **future** products only. Existing rows keep their stored category (precheck Step 2). To apply new categorization and exclusions to existing data:

- **Dry-run first.** Compute three sets via the scraper's *own* `resolveCategory` / `isExcludedProductType` functions (no reimplementation — zero drift): **EXCLUDE** (now matches an exclusion), **RECATEGORIZE** (new category ≠ stored), **UNCHANGED**. These functions require `product_type` per product, which is not stored in the DB — scripts must fetch live Shopify JSON to call them accurately.
- **Inspect the category-shift diff for regressions.** *This is the single highest-value check in the whole procedure.* A shift like `jackets → sweaters: 41` or `pants → sweaters: 3` is a red flag that `categories.ts` has a gap — a missing path or a wrong default. Fix the rule, re-run the dry-run, repeat until regressions are zero.
- **`categoryOverride` guardrail.** Before executing any bulk category UPDATE, filter out rows where `categoryOverride IS NOT NULL`. The precheck (Step 1) will silently ignore your backfill on those rows anyway — the override wins every scrape — but more importantly, a direct DB write that sets `category` on an override row stomps a deliberate admin decision without any warning. The safe pattern: `prisma.product.updateMany({ where: { id: { in: ids }, categoryOverride: null }, data: { category: ... } })`. If an override row genuinely needs recategorizing, clear `categoryOverride` explicitly and consciously, not as a side effect of a bulk operation.
- Confirm counts with the product owner.
- Execute with destructive discipline (below).

Note: products that match a new exclusion rule are not auto-deleted by the scraper's cleanup step — `validMensExternalIds` is built before the exclusion loop, so excluded products survive the stale-product sweep. The EXCLUDE set must be explicitly deleted by the backfill.

### 7. Verify
- Category distribution matches the MAP (e.g., polos jumped from its miscategorized count).
- Exclusion counts → 0 (no NBA, blazers, sleeveless, headwear remaining).
- Color spot-checks resolve, including the visually-verified borderlines.
- Mobile reads the correct fields; any new category key is in `ALL_CATEGORIES` and renders once products exist.
- Spot-check: N recategorized correct, N excluded gone, N unrelated rows untouched.

---

## Destructive-operation discipline (every DELETE or bulk UPDATE)
1. **Preview** — exact count + sample rows.
2. **Confirm** — product owner states expected count (two-step).
3. **Backup** — JSON to `/tmp` before any write; verify the backup row count matches expected.
4. **`categoryOverride` check** — for bulk category UPDATEs, add `categoryOverride: null` to the WHERE clause. Rows with overrides have deliberate admin assignments; a backfill that ignores this will silently disagree with what the scraper actually uses on those rows, and restoring from the JSON backup is the only recovery path if an override is stomped.
5. **Transaction-wrapped** — all-or-nothing. Use `prisma.product.updateMany` grouped by target category (not individual `update` per row) to stay within transaction timeout limits. Use `Promise.all` for parallel ops when order doesn't matter.
6. **Post-verify** — targets gone/changed, originals intact, counts reconcile.

---

## Hard-won lessons (the why behind the steps)

**The precheck has two layers.** `categoryOverride` (Step 1) is admin-set and permanent — it bypasses rules and vision on every subsequent scrape and is not overwritten by backfills that set `category`. The `precheck.category` shortcut (Step 2) is the scraper optimization that reuses any non-null stored category. Rule changes affect neither; only a backfill or direct DB write can change what these protect.

**Color is the exception.** `resolveAppColor` runs unconditionally inside `upsertProduct` on every scrape, so color dictionary additions apply to all existing products on the next scrape without any backfill. Category changes do not have this property.

**The dry-run regression inspection catches gaps that file review misses.** Run it before any bulk DB write. A surprise shift like `jackets → sweaters` almost always means a missing dispatch path or a fallback that is too eager.

**Don't infer sleeve length or color from product names.** Hold the ambiguous item and verify by pulling a product image. Every time this project guessed from the name, it was wrong (Seaview, Bishop Long-Sleeve Button-Down).

**Don't trust comments that assert a color auto-resolves — trace the actual path.** The resolver has four steps: (1) brand dict exact match, (2) `common.ts` exact match, (3) canonical keyword scan with word-boundary regex, (4) modifier stripping then re-lookup. A comment that says "taupe → tan via common.ts" is correct for the name "Taupe" but silently wrong for "Dark-Taupe": the modifier stripper splits on `\s+` whitespace only, so "Dark-Taupe" is a single token, "taupe" is never isolated, and `common.ts` is never reached. Any hyphenated color name whose base word is `common.ts`-only (taupe, sage, mauve, bone, driftwood) and is not in `CANONICAL_KEYWORDS` will silently fail resolution. The only fix is an explicit brand dict entry. Verify by checking each name against `stripModifiers` logic, not by reading comments.

**The webhook silently drops pushes.** Verify Railway is running the new commit before declaring a deploy done. The empty-trigger-commit workaround is reliable.

**Credentials: never paste them in chat; when rotating, update every environment** — local `.env` AND Railway — not just one. A stale Railway `DATABASE_URL` caused a multi-hour silent scraper outage with no alerting.

**`SCRAPE_SECRET` is not set in Railway** → `POST /api/scrape` requires no auth header. The check in the route is `if (process.env.SCRAPE_SECRET && secret !== process.env.SCRAPE_SECRET)` — if the env var is absent, the check is skipped entirely.

**"Committed" is the first of four states, not the last.**

---

## Known gap: observability
There are currently no alerts for scraper silence, commits not deploying, credential drift, or OTA delivery failure. Until that layer exists, every verification step above is manual. Treat it as a standing risk — it is the reason silent failures went undetected for hours in this project.

## Known gap: hyphen tokenization in color modifier stripping
`stripModifiers` in `lib/normalize/colors/modifiers.ts` splits on `\s+` (whitespace only). A hyphenated color name like `"Dark-Taupe"` or `"Oat-Bone"` is treated as a single token — no qualifier is ever stripped, and the base word never reaches `common.ts`. This affects any brand that uses hyphenated color names where the base word is in `common.ts` but not in `CANONICAL_KEYWORDS`. The impact is silent: the name doesn't error, it just falls through all four resolution steps to `UnknownColor`. The fix is always an explicit entry in the brand's `colors.ts`. When onboarding a brand that uses hyphenated names, audit every hyphenated color against `CANONICAL_KEYWORDS` — do not assume common.ts words will auto-resolve through modifer stripping.
