# Benchmark Product Card & Brand Browsing Redesign

**Status:** Planning complete, ready for implementation
**Owner:** Jason
**Drafted:** April 2026
**Depends on:** Image selection fix (preferredImageIndex) must be deployed. Curation admin and editorial system must be live.

## Why this document exists

Benchmark's product browsing experience currently feels like scrolling through a database rather than walking through a store. Products are displayed in small cards with flat-lay images, no color swatches, and no visual hierarchy. Finding a specific category from a specific brand requires scrolling through an unfiltered feed. The app needs to feel like a premium shopping experience — large lifestyle images, clean product information, intuitive category navigation, and the ability to browse by brand-then-category or by category across all brands.

This document covers three interconnected changes that ship together: the product card redesign, the brand store category grid, and the Shop by Category cross-brand browsing feature.

## Design principles

**Do not change the app's existing visual identity.** The color scheme, fonts, background textures, and overall aesthetic in `lib/theme.ts` are established and should not be modified. These changes affect layout, structure, and component design — not the app's visual brand.

**The Vuori storefront is the design reference** for product card presentation: large model images, color swatches, clean typography, minimal clutter.

## Product Card Redesign

The `ProductCard` component is used across every screen in the app — home feed, brand browsing, collections, article product attachments, saved products. Redesigning it improves every surface simultaneously.

### New card layout (two-column grid)

Each card contains, top to bottom:

1. **Product image** — tall aspect ratio (approximately 3:4 or 4:5). Fills the card width. Rounded corners matching the app's existing border radius. Shows the model/lifestyle image from the preferredImageIndex configuration. If the image fails to load, show a dark placeholder with the brand name centered.

2. **Color swatches** — a row of small circles (approximately 14px diameter) below the image. Maximum 5 swatches displayed. If the product has more than 5 colorways, show 5 swatches. Each swatch uses the hex value from the product's color bucket (the 13 standardized colors in `lib/normalize/color.ts`). The currently selected swatch has a visible border or ring (using the app's accent color). Tapping a swatch changes the displayed image to that colorway's image and updates the color name below. Default selection is the first colorway.

3. **Product name** — one or two lines, truncated with ellipsis if longer. Uses the app's existing body font and weight.

4. **Color name** — smaller, muted text. Updates when a swatch is tapped.

5. **Price** — uses the app's existing price styling. If the product is on sale: the original price is shown with a strikethrough in muted text, followed by the current price in the standard price color.

### What the card does NOT include

- No category badges or labels
- No "NEW" tags or indicators
- No brand name (when browsing within a brand, the brand is already known from context; in cross-brand feeds, the brand name can be shown as a small line above the product name)
- No save/heart button on the card itself (save functionality is accessed from the product detail screen)
- No percentage-off badges

### Brand name visibility rule

When the product card appears in a brand-specific context (brand store, brand category view), the brand name is not shown — it's redundant. When the product card appears in a cross-brand context (home feed, Shop by Category, collections, search results), the brand name is shown as a small muted line above the product name.

### Swatch interaction

Tapping a swatch is a lightweight interaction — it swaps the image and color name locally on the card without navigating anywhere. The product detail screen is still accessed by tapping the image or the product name. Swatch tapping does NOT trigger navigation.

The colorway data needed for swatches already exists in the product's `colorways` JSON field in the database. Each colorway has: color name, color bucket, image URL, price, and sizes. The API already returns this data — the card just needs to read it.

### Performance consideration

Swatches require loading multiple images per product (one per colorway). To avoid loading all images upfront, only load the image for the currently selected swatch. When a user taps a different swatch, load that colorway's image on demand. This prevents the product grid from fetching 5x more images than necessary.

## Brand Store Category Grid

When a user taps into a brand from Shop by Brand, they see a category grid instead of the current flat product feed.

### Layout

- **Header:** back button + brand name in the app's existing header style
- **All Products tile** — spans full width at the top. Shows total product count for this brand. Tapping opens the current brand feed (all products, no category filter). This preserves the existing behavior for users who want to scroll everything.
- **Category tiles** — two-column grid below All Products. One tile per category that has products for this brand. Each tile shows: category name (centered, uppercase, using existing app typography) and product count. Tiles that would have 0 products for this brand are not shown.
- Categories are displayed in a fixed order: Shirts, Polos, Shorts, Pants, Hoodies, Zips, Jackets, Sweaters, Long Sleeve. This matches the priority order in `lib/normalize/category.ts`.

### Category view

Tapping a category tile navigates to a filtered product feed showing only products from that brand in that category. Header shows: back button + brand name + "/" + category name (breadcrumb style). Products are displayed in the two-column grid using the redesigned product cards. Standard pagination via FlashList onEndReached.

### Data requirements

The category counts per brand require a new API parameter or endpoint. Two options:

**Option A — new endpoint:** `GET /api/brands/[brand]/categories` returns `{ category: string, count: number }[]` for each category with products in that brand.

**Option B — derive from existing data:** fetch all products for the brand with a `GROUP BY category` query and count them. This can be done in the existing `/api/products` route by adding a `groupByCategory=true` parameter.

Recommend Option A — a dedicated lightweight endpoint is cleaner and faster than overloading the products route.

### Existing brand.tsx changes

The current `brand.tsx` shows a flat product feed with feed mode tabs (New Drops, Price Change). This screen becomes the "All Products" view that the All Products tile links to. The category tiles link to a new `brand-category.tsx` screen that filters by both brand and category.

## Shop by Category (Cross-Brand)

A new top-level navigation entry on the home screen, alongside Collections, Editorial, and Shop by Brand.

### Home screen placement

Added as a full-width tile below the three existing navigation entries (Collections 60% + Editorial/Shop by Brand stacked). Uses the same visual treatment as the other navigation tiles — dark background, uppercase label, consistent with the app's existing style.

### Category list screen

Tapping Shop by Category opens a screen showing all 9 categories as a grid (same visual treatment as the brand store category grid, but without the All Products tile at top). Each tile shows the category name and total product count across all brands.

### Category detail screen

Tapping a category shows all products in that category across all brands, displayed in the redesigned two-column product card grid. In this cross-brand context, each product card shows the brand name (small muted text above the product name). Standard pagination, sorted by newest first (firstSeenAt desc).

### API requirements

`GET /api/categories` — returns `{ category: string, count: number }[]` for all categories across all brands.

The existing `/api/products` route already supports `?category=shorts` filtering, so the category detail screen can reuse it. The brand name display on cards requires the brand field to be included in the product response (it already is).

## Build Order

### Phase 1 — Backend API additions

1. `GET /api/brands/[brand]/categories` — per-brand category counts
2. `GET /api/categories` — cross-brand category counts
3. Both are lightweight Prisma groupBy queries, no schema changes needed

### Phase 2 — Product card redesign

4. Rewrite `components/ProductCard.tsx` — new layout with tall image, color swatches, color name, sale price treatment
5. Add swatch interaction — tapping changes image and color name locally
6. Add brand name visibility rule — shown in cross-brand contexts, hidden in brand contexts
7. Verify the card works correctly across all existing screens (home feed, collections, articles, saved)

### Phase 3 — Brand store category grid

8. Create `app/brand-categories.tsx` — the category grid screen shown when tapping into a brand
9. Create `app/brand-category.tsx` — the filtered product feed for a brand + category combination
10. Update `app/brands.tsx` — tapping a brand now navigates to brand-categories instead of the old brand feed
11. Keep `app/brand.tsx` as the "All Products" view, linked from the All Products tile

### Phase 4 — Shop by Category

12. Create `app/categories.tsx` — the cross-brand category grid
13. Create `app/category.tsx` — the cross-brand category product feed (with brand names on cards)
14. Update `app/(tabs)/index.tsx` — add Shop by Category tile to the home screen

### Phase 5 — Polish and verification

15. Test all product card contexts: home feed, brand browsing, category browsing, collections, articles, saved products
16. Verify swatch interaction works smoothly without performance issues
17. Verify category counts are accurate per brand and cross-brand
18. TestFlight build and submission

## What does NOT change

- The app's color scheme, fonts, background textures, or overall visual identity
- The product detail screen (accessed by tapping a product card)
- The save/watch functionality
- The collections and editorial screens (they benefit from the new card automatically)
- The home screen editorial/collections layout (only the addition of Shop by Category)
- The backend scraper, categorization, or data pipeline
- The admin tool

## Success criteria

- Tapping into any brand shows a category grid with accurate product counts, and tapping a category shows only products in that category with the redesigned cards
- The redesigned product card shows a model/lifestyle image (where available), up to 5 color swatches, product name, color name, and correct pricing
- Tapping a color swatch on a product card changes the displayed image and color name without navigating away
- Shop by Category on the home screen shows all 9 categories with accurate cross-brand counts
- Sale items show strikethrough original price on the product card
- Brand name appears on product cards in cross-brand contexts and is hidden in brand-specific contexts
- No visual regressions in collections, articles, saved products, or the home feed
