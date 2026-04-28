# Benchmark Personalization & Home Screen Refinement

**Status:** Planning complete, ready for implementation
**Owner:** Jason
**Drafted:** April 2026
**Depends on:** Product card redesign (color swatches, 2:3 images) must be live. Brand browsing category grid must be live. Editorial and collections mobile surfaces must be live.

## Why this document exists

Benchmark currently shows every user the same products in the same order. The home screen is dominated by an infinite scrolling feed that treats all products equally regardless of whether the user would ever buy them. This document introduces four features that make the app feel personal — and restructures the home screen to reflect that shift.

The goal is not to build a recommendation engine. It's to capture basic preferences and use them to filter, badge, and prioritize in simple, deterministic ways that make the user feel like the app understands them.

## What gets built (in order)

1. Onboarding flow — capture brand preferences, sizes, style lean, price comfort band
2. "New from your brands" home screen section — 4-6 recent products from preferred brands
3. Wardrobe Fit badge on product cards — quiet signal that a product matches the user's profile
4. Tap-out handoff screen — branded transition when opening a product on a brand's website
5. Home screen refinement — remove infinite feed, make the home screen a curated daily page

## 1. Onboarding Flow

### What it captures

Five pieces of information, presented as a visual flow, completable in under 60 seconds:

**Screen 1 — Brand preferences**
"Which brands do you already wear or follow?"
Visual grid of all 18 brand names (same tiles as Shop by Brand, but tappable with a selected/unselected state). User taps to select up to 5. Minimum 1 required to proceed. Selected brands get a visible ring or checkmark.

**Screen 2 — Sizes**
"What's your size?"
Three separate fields:
- Top size (XS, S, M, L, XL, XXL) — single select
- Bottom size (28, 29, 30, 31, 32, 33, 34, 36, 38, 40) — single select
- Outerwear size (S, M, L, XL, XXL) — single select, optional (can skip)

Presented as tappable pills, not dropdowns. Selected pill gets accent treatment.

**Screen 3 — Style lean**
"What's your style?"
Four visual options, multi-select (user can pick 1-3):
- Performance — "Training gear, technical fabrics, gym-to-street"
- Elevated Basics — "Quality essentials, clean lines, everyday wear"
- Smart Casual — "Office-friendly, polished but comfortable"
- Golf — "Course-ready, clubhouse to dinner"

Each option is a card with the name and a one-line description. No mood board images needed — the descriptions are sufficient and avoid the complexity of sourcing lifestyle photos.

**Screen 4 — Price comfort band**
"What do you usually spend on a single item?"
Three options, single select:
- Under $75 — "Value-focused, great quality at fair prices"
- $75–$150 — "Premium quality, the sweet spot for most brands"
- $150+ — "Best of the best, no compromise"

Simple tappable cards with the range and description.

**Screen 5 — Confirmation**
"You're all set."
Brief summary: "We'll prioritize [brand names] in your size, with a focus on [style lean] at your price range."
"Start browsing" button.

### When onboarding appears

First app open after account creation. Not before account creation — the user must have a Supabase account first so preferences can be saved.

If the user skips or dismisses onboarding, a persistent but non-intrusive banner appears on the home screen: "Set up your profile for personalized recommendations." Tapping opens the onboarding flow. The banner disappears once onboarding is complete.

If the user completes onboarding and later wants to change their preferences, they can access the same flow from Profile → "Edit style preferences." This replaces or augments the current preferences screen.

### Data storage

Preferences are stored in Supabase (user data, not product data — consistent with the existing data separation). New fields on the user's preferences record:

- `preferredBrands: string[]` — array of brand keys, max 5
- `topSize: string` — e.g. "L"
- `bottomSize: string` — e.g. "32"
- `outerwearSize: string | null` — optional
- `styleLean: string[]` — array of style keys, e.g. ["elevated-basics", "golf"]
- `priceComfort: string` — "under-75" | "75-150" | "150-plus"
- `onboardingComplete: boolean` — defaults to false

### Design principles

The flow should feel like a 60-second style consultation, not a form. Each screen is one question. Transitions are smooth. Progress is visible (dots or a subtle progress bar). The user never sees a long form with multiple fields. Every selection is a tap, never typing.

## 2. "New from Your Brands" Home Screen Section

### What it shows

4-6 recent products (within the last 7 days) from the user's preferred brands, in their preferred categories if possible. Displayed as a horizontal scrollable row or a 2-column mini-grid on the home screen.

### Ranking logic (simple, not AI)

Products are scored by how many preference signals they match:
- Brand is in user's preferred brands (+3 points)
- User's size is in stock (+2 points)
- Price is within user's comfort band (+1 point)
- Category matches user's style lean (+1 point — e.g., polos score higher for "Golf" lean)

Sort by score descending, then by firstSeenAt descending (newest first among equal scores). Take the top 6.

### Empty state

If the user has no preferred brands set (onboarding incomplete), this section is hidden.
If the user's brands have no new drops in the last 7 days, show the most recent drop from their #1 preferred brand regardless of age, with a note: "Nothing new this week — here's the latest from [brand]."

### "See all" link

Below the section, a "See all new arrivals →" link takes the user to the full product feed filtered by their preferred brands. This is where the traditional feed lives — accessible but not dominant.

## 3. Wardrobe Fit Badge

### What it is

A small, text-based badge on the product card that communicates how well the product matches the user's profile. Not a score, not a percentage, not a gamified indicator. A quiet, editorial-feeling line of text.

### Three states

**Strong fit** — the product matches on brand AND size AND price band.
Badge text examples:
- "In your size · From a brand you wear"
- "Your size · In your price range"
The badge uses two of the three matching criteria in the text, prioritizing the most relevant.

**Worth a look** — the product matches on 1-2 criteria but not all three. Typically a brand the user doesn't follow but the right category, size, and price.
Badge text examples:
- "New brand · Matches your style"
- "Your size · Worth a look"

**No badge** — the product matches on zero or one criterion. No badge is displayed. The absence of a badge is not negative — it's simply neutral. The card looks exactly as it does today, just without the badge line.

### Badge placement

Below the price, as the last element on the product card. Small text, muted but visible. Uses a subtle accent color or the app's existing secondary text color. Not on the image, not as an overlay, not as a banner.

### Badge logic

Deterministic, computed client-side from the user's stored preferences and the product's data:

```
brandMatch = product.brand in user.preferredBrands
sizeMatch = user's relevant size (top or bottom based on category) is in product.sizes with available: true
priceMatch = product.price is within user's priceComfort range

if brandMatch AND sizeMatch AND priceMatch → strong fit
else if (brandMatch AND sizeMatch) OR (sizeMatch AND priceMatch) OR (brandMatch AND priceMatch) → worth a look
else → no badge
```

Price comfort mapping:
- "under-75" → product.price <= 75
- "75-150" → product.price >= 75 AND product.price <= 150
- "150-plus" → product.price >= 150

Size matching by category:
- shirts, polos, longsleeve, hoodies, sweaters, zips, jackets → compare against user.topSize
- shorts, pants → compare against user.bottomSize
- jackets (outerwear) → compare against user.outerwearSize if set, otherwise user.topSize

### When onboarding is incomplete

No badges are shown anywhere. The badge feature is invisible until the user completes onboarding. This avoids the "empty badges everywhere" problem.

## 4. Tap-Out Handoff Screen

### Current behavior

User taps a product → browser opens directly to the brand's product page. Abrupt transition with no branding.

### New behavior

User taps "Shop at [brand]" on the product detail screen → a brief branded transition screen appears for 1.5 seconds → then the webview opens to the brand's product page.

### Handoff screen design

Full-screen overlay with the app's dark background. Centered content:
- Benchmark logo (small, top)
- "Heading to [Brand Name]" — large text
- "We'll keep your spot" — smaller, muted text below
- A subtle loading animation (a simple progress bar or the app's accent color pulsing)

After 1.5 seconds, the screen transitions to the webview.

### Webview frame

The brand's website opens inside a minimal Benchmark-framed webview:
- Top bar: small Benchmark logo left, product name center (truncated if long), close (X) button right
- The close button returns to the product detail screen, not the home feed

### Auto-save behavior

When the handoff screen appears, the product is automatically saved to the user's Saved products. No extra tap needed. A subtle toast or badge appears when they return: "Saved to your collection."

If the product is already saved, no duplicate is created and no toast appears.

### What is NOT included (deferred to v2)

- The "Did you buy it?" return question — deferred until user base is large enough to measure impact
- Affiliate link instrumentation — handled separately as part of the Impact.com setup
- Purchase tracking or conversion analytics — deferred

## 5. Home Screen Refinement

### What changes

The infinite scrolling product feed (New Drops / Price Changes tabs + FlashList grid) is removed from the home screen. It is not deleted from the codebase — it becomes accessible via "See all new arrivals →" from the "New from your brands" section and via Shop by Brand and Shop by Category.

### New home screen layout (top to bottom)

**A. Benchmark header** — unchanged (wordmark + tagline + gold rules)

**B. Top-tier navigation** — unchanged (Collections 60% + Editorial / Shop by Brand stacked, Shop by Category full-width below)

**C. Featured section** — unchanged (two rotating collections + newest article)

**D. "New from your brands"** — NEW. 4-6 personalized product cards in a 2-column mini-grid. Section header: "NEW FROM YOUR BRANDS" in the app's label style. "See all →" link at the bottom. If onboarding incomplete, this section shows the onboarding prompt banner instead.

**E. End of home screen.** No more content below D. No infinite scroll. The home screen is finite and intentional.

### What the user does when they want to browse more

- Shop by Brand → brand category grid → products
- Shop by Category → category grid → products
- "See all →" from "New from your brands" → full filtered feed
- Collections → curated product groups
- Editorial → articles with attached products

Every path to more products is intentional. None is a default infinite scroll.

### Feed mode tabs (New Drops / Price Changes)

These move from the home screen to the full feed screen that "See all →" navigates to. They're still useful — just no longer the home screen's primary interface.

## Build Order

### Phase 1 — Onboarding flow
1. Add preference fields to Supabase user data schema
2. Build the 5-screen onboarding flow (brand selection, sizes, style lean, price band, confirmation)
3. Add onboarding trigger on first app open after account creation
4. Add "Edit style preferences" entry point in Profile
5. Add the incomplete-onboarding banner on the home screen

### Phase 2 — "New from your brands" + home screen refinement
6. Build the "New from your brands" API endpoint or compute client-side from existing product data + preferences
7. Add the section to the home screen
8. Remove the infinite feed and feed mode tabs from the home screen
9. Move feed mode tabs to the full feed screen accessible via "See all →"
10. Build the "See all →" navigation to the full feed

### Phase 3 — Wardrobe Fit badge
11. Add badge logic to ProductCard component
12. Compute match scores from user preferences + product data
13. Display badge text below price on product cards
14. Handle the no-onboarding case (no badges shown)

### Phase 4 — Tap-out handoff screen
15. Build the handoff overlay screen
16. Build the branded webview frame
17. Add auto-save on handoff
18. Wire up the transition from product detail "Shop at [brand]" button

### Phase 5 — Polish and verification
19. End-to-end test: create new account → complete onboarding → home screen shows personalized content → badges appear on cards → tap through to brand site → return to app
20. Test incomplete onboarding state (banner, no badges, no "new from your brands")
21. Test preference editing from Profile
22. TestFlight build and submission

## What does NOT change

- The app's visual identity (colors, fonts, textures, theme)
- The product detail screen (except the tap-out button behavior)
- Collections, Editorial, Shop by Brand, Shop by Category — all unchanged
- The admin tool
- The scraper, categorization, or data pipeline
- The backend API (except potentially a new endpoint for personalized products)

## What is explicitly deferred

- Ranked/scored product feed (requires behavioral data from 500+ users)
- "Did you buy it?" return question (requires user base to measure impact)
- "Last call" section for saved items running low (requires robust stock tracking)
- "Your style this month" recap (requires months of usage data)
- AI-powered personalization (requires significant behavioral data)
- Full three-stack home screen (the "Worth your attention today" + "Last call" + "New from your brands" model — current implementation takes the most valuable piece and defers the rest)

## Success Criteria

- A new user can complete onboarding in under 60 seconds
- After onboarding, the home screen shows 4-6 products from the user's preferred brands
- Product cards display a Wardrobe Fit badge ("In your size · From a brand you wear") when the product matches the user's profile
- The home screen has no infinite scroll — it ends after the "New from your brands" section
- Tapping "Shop at [brand]" shows a branded handoff screen before opening the brand's site
- Products are auto-saved when a user taps through to a brand's site
- The onboarding flow can be re-accessed from Profile to update preferences
- Users who skip onboarding see a persistent banner prompting them to set up their profile
- No badges appear for users who haven't completed onboarding

## Questions for Implementation

1. Should the "New from your brands" section use the existing /api/products endpoint with brand filters applied, or a new dedicated endpoint that returns pre-scored results? Recommend: use the existing endpoint with brand filters — simpler, and the scoring/sorting can happen client-side for 6 items.
2. Should the onboarding flow be skippable at each screen or only at the beginning? Recommend: a single "Skip for now" link visible on every screen that exits the entire flow, not per-screen skipping.
3. For the Wardrobe Fit badge, should size matching check actual variant-level availability or just whether the size exists in the product's size array? Recommend: check availability (available: true) — showing "In your size" when the size is out of stock would be misleading.
4. Should the handoff screen auto-save behavior be toggleable in settings? Recommend: no — auto-save is always on. Users can unsave from their Saved screen if they don't want it. Adding a toggle is unnecessary complexity.
