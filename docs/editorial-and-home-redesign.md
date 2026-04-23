# Benchmark Editorial System & Home Screen Redesign

**Status:** Planning complete, ready for implementation
**Owner:** Jason
**Drafted:** April 2026
**Depends on:** Curation admin tool (items 1-7) must be live. Collections mobile surface (item 3 from curation plan) ships as part of this work.

## Why this document exists

Benchmark's differentiation is editorial authority — the taste and judgment that makes a curated product list worth opening instead of just browsing brand sites directly. The curated collections are one expression of that authority. The editorial articles are another: short, structured pieces that explain *why* something is worth buying, what's trending, or how to think about a category. Together, collections and editorial content transform Benchmark from a product feed into a lifestyle platform.

This document also covers the home screen redesign that makes collections, editorial, and brand browsing the primary experience, with product feeds (new drops, price changes) as a supporting layer underneath. The home screen change is inseparable from the editorial feature because the editorial content needs a home, and the current product-first layout doesn't have one.

## Editorial Articles — What They Are

An editorial article is a short, structured piece of content — typically 300 to 800 words — written in an outline-friendly format with headers, bullet points, and lists. The target audience is men who want direct, to-the-point information, not prose magazine writing. Think "5 reasons this vest is worth $200" or "the 3 colors every guy needs this fall," not a 2,000-word fashion essay.

Each article has:

- A **title** (e.g., "Why a $200 Vest Is Worth It")
- A **subtitle or tagline** (optional, one line)
- **Body content** in structured rich text: headers, bold, italic, bullet points, numbered lists, block quotes
- **1 to 3 embedded images** uploaded through the admin tool, placed between text sections
- **Up to 5 attached products** displayed as a grouped section at the end, labeled "Products Relevant to This Article"
- A **published date** displayed to users
- An **active/archived status** — archived articles disappear from the app but remain in the admin for reactivation

Articles are exclusive to the app — no shareable URLs, no web rendering. Users must open Benchmark to read them.

## Data Model

New tables in Neon Postgres:

### Article

| Field | Type | Description |
|-------|------|-------------|
| id | cuid | Primary key |
| title | String | Article headline |
| subtitle | String? | Optional one-line tagline |
| body | String | Rich text content stored as HTML |
| isActive | Boolean (default false) | Active = visible in app, false = archived/draft |
| publishedAt | DateTime? | Set when first activated; displayed to users as the article date |
| lastEditedAt | DateTime | Auto-updated on every save |
| lastEditedBy | String? | Supabase user ID of last editor |

### ArticleImage

| Field | Type | Description |
|-------|------|-------------|
| id | cuid | Primary key |
| articleId | String (FK → Article) | Which article this image belongs to |
| imageUrl | String | Public URL of the uploaded image |
| position | Int | Order within the article (0, 1, 2) |
| altText | String? | Accessibility description |

### ArticleProduct

| Field | Type | Description |
|-------|------|-------------|
| id | cuid | Primary key |
| articleId | String (FK → Article) | Which article |
| productId | String (FK → Product) | Which product |
| position | Int | Display order in the "relevant products" section |

Cascade deletes: deleting an Article removes its ArticleImage and ArticleProduct rows. Deleting a Product removes it from any article's product list (same pattern as collections).

## Image Storage

Article images are uploaded through the admin tool and stored in **Supabase Storage**. Supabase is already in the stack for auth and user data; adding a storage bucket avoids introducing a new service.

A bucket named `article-images` is created in Supabase with public read access (images need to be viewable by app users without auth) and write access restricted to authenticated admin users.

Upload flow: admin selects an image file → browser uploads directly to Supabase Storage via the Supabase JS client → returns a public URL → URL is stored in the ArticleImage table.

Image size limit: 5MB per image. Accepted formats: JPEG, PNG, WebP.

## Rich Text Editor

The admin tool's article editor uses a block-based rich text editor. Recommended library: **Tiptap** (built on ProseMirror, widely used in production, MIT licensed, works well with Next.js).

Supported formatting:

- Headings (H2, H3 — H1 is reserved for the article title)
- Bold, italic
- Bullet lists, numbered lists
- Block quotes
- Horizontal rules (section dividers)
- Links

Content is stored as HTML in the `body` field. The mobile app renders this HTML using a React Native HTML renderer (recommended: `react-native-render-html`).

What is NOT supported (intentionally excluded to keep articles clean and fast):

- Embedded videos
- Code blocks
- Tables
- Custom fonts or colors
- Inline product cards within the body text (products are always at the end)

Image placement: images are NOT embedded in the rich text HTML. Instead, the editor has an "Insert Image" button that uploads the image and places a visual marker in the editor showing where the image appears relative to the text. The actual rendering interleaves text blocks and images based on position data from the ArticleImage table. This avoids the complexity of storing image URLs inside the HTML body and makes image management (reorder, replace, delete) cleaner.

## Admin Interface — Article Editor

Located at `/admin/articles` (list) and `/admin/articles/[id]` (editor).

### Article List Page

Shows all articles (active and archived), ordered by lastEditedAt descending. Each row shows: title, active/archived status pill, published date, product count, last edited timestamp. "New Article" button at top.

### Article Editor Page

Two-panel layout (not three — articles are simpler than collections):

**Left panel (large, ~70% width): Content editor**

- Title input (large text, required)
- Subtitle input (smaller text, optional)
- Tiptap rich text editor for body content
- Image insertion points between text blocks — "Add Image" button opens a file picker, uploads to Supabase Storage, shows a thumbnail preview at that position in the editor
- Drag-to-reorder images within the content flow
- Each image has a remove button and an optional alt-text field

**Right panel (~30% width): Metadata and products**

- Status: Draft / Active toggle (setting Active for the first time sets publishedAt)
- Published date (read-only, shown after first activation)
- Last edited info
- Product attachment section: same product finder as collections (search, brand filter, category filter) but limited to 5 products. Each attached product shows image, title, brand, price, and a remove button. Drag-to-reorder within the product list.
- Save button
- Delete Article button (with confirmation)

Preview: a "Preview" button opens a modal showing the article as it would appear in the mobile app — title, subtitle, body with images interleaved, and the product cards at the bottom. Same mobile-width treatment as collection preview.

## Home Screen Redesign

The current home screen has a product feed with mode tabs and a "Browse by Brand" banner. The redesign restructures the home screen into two tiers:

### Top Tier — Editorial Focus

Three navigation entries, visually prominent, near the top of the screen:

- **Collections** — opens the collections list (hero images, names). This is item 3 from the curation admin plan, built as part of this work.
- **Editorial** — opens the articles list (newest first, active only). Each row shows title, subtitle, published date, hero image (first article image), and product count badge.
- **Shop by Brand** — opens the existing brand grid (already built).

Visual treatment: these three should feel like the primary navigation of the app. Styled as large, visually distinct buttons or cards — not text tabs. The specific visual design is a decision for implementation, but the hierarchy is clear: this is what Benchmark *is*.

### Featured Rotation

Below the three navigation entries, the home screen features:

- **Two collections** randomly selected per day from active collections (existing behavior from curation plan)
- **The newest active article** — always shown, not random. Featured prominently with title, subtitle, and hero image. Tapping opens the full article.

The featured section rotates daily for collections but is always newest-first for editorial, so a freshly published article gets immediate visibility.

### Second Tier — Product Intelligence

Below the featured section, the familiar product feed with mode tabs:

- **New Drops** (default)
- **Price Changes**

These work exactly as they do today — paginated cross-brand product feeds. The mode tabs and product cards are unchanged. They've just moved from being the *entire* home screen to being the *lower half* of a richer experience.

### What this replaces

The current home screen layout (mode tabs at top, "Browse by Brand" banner in the feed, product grid below) is fully replaced. The "Browse by Brand" banner is removed from the feed and replaced by the "Shop by Brand" entry in the top-tier navigation. The mode tabs move below the featured section.

## Mobile App — Article Screens

### Articles List Screen

Accessed from the "Editorial" button on the home screen. Shows all active articles, newest first (ordered by publishedAt). Each row shows:

- Hero image (first ArticleImage, or a placeholder)
- Title
- Subtitle (if present)
- Published date
- Product count badge (e.g., "3 products")

Tapping an article opens the article detail screen.

### Article Detail Screen

Full-screen scrollable article view:

- Title (large)
- Subtitle (if present, smaller, below title)
- Published date
- Body content rendered as HTML via `react-native-render-html`
- Images interleaved at their designated positions within the content flow
- At the bottom: "Relevant Products" section with up to 5 product cards. Each card shows image, title, brand, price, and tapping opens the product detail screen (same as tapping any product card elsewhere in the app).

No share button (content is app-exclusive). Back button returns to the articles list.

## API Endpoints

### Backend (Next.js)

| Route | Method | Description |
|-------|--------|-------------|
| /api/articles | GET | List active articles, ordered by publishedAt desc. Returns title, subtitle, publishedAt, hero image, product count. |
| /api/articles/[id] | GET | Full article detail: title, subtitle, body HTML, images with positions, attached products with full product data. |
| /api/admin/articles | POST | Create new article (admin only) |
| /api/admin/articles/[id] | PUT | Update article metadata, body, images, products (admin only) |
| /api/admin/articles/[id] | DELETE | Delete article (admin only) |
| /api/admin/upload | POST | Upload image to Supabase Storage, returns public URL (admin only) |

### Mobile

| Endpoint consumed | Screen |
|-------------------|--------|
| /api/articles | Articles list |
| /api/articles/[id] | Article detail |
| /api/collections | Collections list |
| /api/collections/[slug] | Collection detail |
| /api/products | Product feed (existing) |

## Build Order

### Phase 1 — Backend: Schema, Storage, and Article CRUD

1. Add Article, ArticleImage, ArticleProduct tables to Prisma schema
2. Create Supabase Storage bucket `article-images` with public read policy
3. Build article server actions (create, update, delete, attach product, upload image)
4. Build article API endpoints for the mobile app
5. Run prisma db push on production Neon

### Phase 2 — Admin: Article Editor

6. Article list page at /admin/articles
7. Article editor with Tiptap rich text, image upload, product attachment
8. Preview modal
9. Update admin landing page tile for Editorial (replace a "coming soon" stub if one exists, or add a new tile)

### Phase 3 — Mobile: Home Screen Redesign + Collections + Editorial

10. Build the collections list screen and collection detail screen (item 3 from curation plan — this ships here)
11. Build the articles list screen and article detail screen
12. Redesign the home screen: top-tier navigation (Collections, Editorial, Shop by Brand), featured rotation (2 collections + newest article), product feed below
13. Install react-native-render-html for article body rendering

### Phase 4 — Polish and Verification

14. End-to-end test: create an article in the admin, add images and products, publish, verify it appears on the home screen and renders correctly in the mobile app
15. Verify collections appear correctly alongside editorial on the redesigned home screen
16. Verify the product feed still works correctly in its new position below the featured section
17. TestFlight build and submission

## What gets deferred

- Shareable article URLs (articles are app-exclusive by design)
- Article categorization or tagging (under 10 articles, not needed)
- Article search (under 10 articles, not needed)
- Article analytics (which articles drive the most product clicks) — revisit when PostHog event instrumentation is mature
- Scheduled publishing (publish at a future date/time) — all publishing is manual toggle
- Article comments or reactions from users
- RSS feed of articles

## Success Criteria

The editorial system is complete when:

- Jason can write an article in the admin tool with headers, bullet points, bold text, and embedded images in under 20 minutes
- Published articles appear on the mobile home screen within the "Editorial" section, newest first
- The newest article is featured prominently on the home screen alongside the two rotating collections
- Up to 5 products attached to an article display correctly at the bottom of the article detail screen, and tapping a product opens the product detail
- Archived articles disappear from the mobile app but remain accessible in the admin for reactivation
- The home screen clearly presents Collections, Editorial, and Shop by Brand as the primary navigation, with New Drops and Price Changes as a supporting product feed below
- The entire flow works on the current TestFlight build after an EAS build and submit cycle

## Questions for Implementation

1. For the Tiptap editor, use the free open-source version or Tiptap Cloud (managed, collaborative editing, $$$)? Recommend: free open-source. Two editors, no real-time collaboration needed.
2. For image upload size limits, enforce client-side only or also server-side? Recommend: both. Client-side for UX, server-side for security.
3. Should the home screen featured article show a truncated preview of the body text (first 1-2 sentences) or just title + subtitle + image? Recommend: title + subtitle + image. Cleaner, faster to scan, and the subtitle serves as the hook.
4. For the product feed position on the redesigned home screen, should it be immediately scrollable below the featured section, or behind a "See All Products" tap? Recommend: immediately scrollable. Hiding it behind a tap reduces engagement with the core product data.
