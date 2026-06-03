import type { AppCategory } from "@/types";

// ── EXCLUDED PRODUCT TYPES ────────────────────────────────────────────────────
// Extends the legacy inline set that was in category.ts. The new entries cover
// the junk types that appear in the live catalog.
const MW_EXCLUDED_TYPES = new Set([
  // Legacy head start (underwear, bundles, undershirts, accessories, gift card)
  "underwear", "bundles", "undershirts", "accessories", "gift card",
  // Junk / internal types that appear in products.json
  "",                                       // 4 products with no type
  "vuejs_changeover_product_accessories",  // staging artifact
  "return,package_protection",             // returns coverage product
]);

export function isExcludedMWProductType(productType: string): boolean {
  return MW_EXCLUDED_TYPES.has(productType.toLowerCase().trim());
}

// ── TITLE-LEVEL EXCLUSIONS ────────────────────────────────────────────────────
// Applied within the kept types (Tops / Bottoms / Final Sale) to catch
// non-apparel, underwear, sleep/lounge, and accessories that live inside them.
// Also used by the backfill script — already-categorized products bypass
// the scraper's NON_APPAREL_TITLE_WORDS filter so these catches are necessary.
export function isExcludedMWTitle(title: string): boolean {
  const t = title.toLowerCase();
  // Women's (Final Sale has "ACE Women's Crew Neck Sweatshirt")
  if (/\bwomen'?s\b/i.test(t)) return true;
  // Swim — Bottoms type
  if (/swim\s+trunk|bather|board\s*short|swim\s+board/i.test(t)) return true;
  // Underwear that slips into Final Sale
  if (/\b(boxer|brief|trunk)\b/i.test(t)) return true;
  // Compression base-layer and neck accessories
  if (/\b(tight|gaiter)\b/i.test(t)) return true;
  if (/\blong underwear\b/i.test(t)) return true;
  // Sleep / lounge
  if (/\b(robe|pajama|lounge|slipper)\b/i.test(t)) return true;
  // Accessories
  if (/\b(belt|wallet|card\s+case|tote|duffel|duffle|briefcase|backpack|weekender|holder)\b/i.test(t)) return true;
  if (/\b(mug|glove|scarf)\b/i.test(t)) return true;
  // Hat — word-boundary prevents matches on "Harrington", "that"
  if (/\bhat\b/i.test(t)) return true;
  // Socks
  if (/\bsock\b/i.test(t)) return true;
  return false;
}

// ── TOPS DISPATCH ─────────────────────────────────────────────────────────────
// Strict priority order. Verified against all 64 Tops titles and all
// Final Sale apparel titles.
//
// Critical crew-neck split:
//   "T-Shirt" in name        → shirts  (Pima Crew Neck T-Shirt, SILVER Crew Neck T-Shirt)
//   "sweatshirt" in name     → sweaters (ACE Crew Neck Sweatshirt)
//   "Sweater" in name        → sweaters (Tech Cashmere/Merino/Waffle Crew Neck Sweater)
//   "Long Sleeve Crew" alone → longsleeve (Tech Linen Long Sleeve Crew)
// No plain "crew" → sweaters blanket rule — the T-Shirt/Sweatshirt/Sweater signals
// discriminate precisely, matching the Faherty quarter-zip consistency check.
function dispatchMWTop(title: string): AppCategory | null {
  const t = title.toLowerCase();

  // 1. Polo — FIRST: catches Sweater Polo, T-Shirt Polo, Long Sleeve Polo, Pique Polo
  if (/\bpolo\b/.test(t)) return "polos";

  // 2. Blazer → jackets (unstructured puffer/wool/warmknit blazer — image verified)
  if (/\bblazer\b/.test(t)) return "jackets";

  // 3. Jacket / Bomber → jackets
  if (/\bjacket\b|\bbomber\b/.test(t)) return "jackets";

  // 4. Hoodie → hoodies (BEFORE zip: "Atlas Full-Zip Hoodie" has hood, lands in hoodies)
  if (/\bhoodie\b/.test(t)) return "hoodies";

  // 5. Zip (non-hooded): quarter-zip, full-zip, standalone zip
  if (/quarter[- ]zip|full[- ]zip|\bzip\b/.test(t)) return "zips";

  // 6. Long sleeve — before sweater/shirts to route long-sleeve tees and henleys correctly
  if (/long[- ]sleeve/.test(t)) return "longsleeve";

  // 6b. WARMKNIT / waffle henleys — long-sleeve thermal base layers by construction.
  //     MW Final Sale titles drop "Long Sleeve" (e.g. "WARMKNIT Waffle Henley" vs the
  //     non-sale "WARMKNIT Waffle Long Sleeve Henley"). Image-verified 2026-06-02.
  if (/warmknit.*henley|waffle.*henley/.test(t)) return "longsleeve";

  // 7. Sweater — explicit name, sweatshirt, cardigan, sherpa/plain fleece
  //    Guard: not a T-Shirt (e.g. "Tech Merino Full-Zip Sweater" caught by zip above;
  //    V-Neck Sweater must not land in shirts even though it has "v-neck")
  if (/sweatshirt|cardigan|\bfleece\b/.test(t)) return "sweaters";
  if (/\bsweater\b/.test(t) && !/t[- ]?shirt/i.test(t)) return "sweaters";

  // 8. Shirts: tee, t-shirt, v-neck, henley, button-up, oxford, camp shirt, shirt
  if (/t[- ]?shirt|v[- ]?neck|henley|button[- ]up|oxford|camp\s+shirt|\bshirt\b/.test(t)) return "shirts";

  return null;
}

// ── CATEGORY DISPATCH (public) ────────────────────────────────────────────────
export function lookupMWCategory(productType: string, title = ""): AppCategory | null {
  const pt = productType.toLowerCase().trim();

  // ── Tops ──────────────────────────────────────────────────────────────────
  if (pt === "tops") return dispatchMWTop(title);

  // ── Final Sale ────────────────────────────────────────────────────────────
  // Sale grab-bag: same Tops dispatch first, then Bottoms fallback
  // (sweatpants, joggers, shorts, chinos that carry the sale tag)
  if (pt === "final sale") {
    const topsCat = dispatchMWTop(title);
    if (topsCat) return topsCat;
    // Bottoms fallback for items like ACE Sweatpant, Atlas Jogger, Atlas Short
    if (/short/i.test(title)) return "shorts";
    if (/sweatpant|jogger|\bpant\b|\btrouser\b|chino|jeans/i.test(title)) return "pants";
    return null;
  }

  // ── Bottoms ───────────────────────────────────────────────────────────────
  // Swim trunk and board shorts excluded upstream by isExcludedMWTitle.
  // Pajama pant excluded upstream. /short/i catches "Sweatshort" as a substring.
  if (pt === "bottoms") {
    if (/short/i.test(title)) return "shorts";
    return "pants";
  }

  return null;
}
