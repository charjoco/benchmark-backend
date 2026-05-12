import type { AppCategory } from "@/types";

/**
 * Taylor Stitch uses broad umbrella product_types (Wovens, Knits, Outerwear, Bottoms)
 * rather than the per-garment types used by Greyson, ASRV, and TravisMathew.
 * Categorization requires tag and title disambiguation within each umbrella type.
 *
 * Unique to this brand:
 *   - ARCHIVE tag exclusion: ~89% of TS's Shopify catalog is discontinued product
 *     still served by products.json. These are excluded before any other check.
 *   - Title-keyword exclusion: Blazers and Sportcoats share the "Outerwear"
 *     product_type with genuine jackets. Excluded by title since product_type
 *     alone can't distinguish them.
 */

// ARCHIVE tag check — must run before any other exclusion or categorization.
// Taylor Stitch applies "ARCHIVE" (case-sensitive) consistently to all discontinued
// products still present in products.json. Excluding them prevents thousands of
// stub rows from clogging the vision retry queue.
//
// Note: tag-based discontinued-product exclusion may generalize to other brands —
// defer until a second brand needs it.
export function isArchivedProduct(tags: string[]): boolean {
  return tags.includes("ARCHIVE");
}

// Title-keyword exclusion — catches subcategories that share "Outerwear" product_type
// with genuine jackets but don't belong in Benchmark's catalog (structured tailored
// garments outside the athleisure/heritage-casual scope).
// This pattern (title-based exclusion as a supplement to product_type exclusion) is
// required when product_type is too coarse to distinguish excluded subcategories.
const TS_EXCLUDED_TITLE_KEYWORDS = ["Blazer", "Sportcoat"];

export function isExcludedTaylorStitchTitle(title: string): boolean {
  const t = title.toLowerCase();
  return TS_EXCLUDED_TITLE_KEYWORDS.some((kw) => t.includes(kw.toLowerCase()));
}

// Non-apparel and non-men's product types — excluded entirely, no vision, no stub row.
export const TS_EXCLUDED_PRODUCT_TYPES = new Set([
  "footwear",        // boots and shoes — excluded per CLAUDE.md footwear rule
  "accessories",     // belts, bags, hats, socks, scarves, candles, art, soap, etc.
  "none",            // lifestyle spacer products
  "general",         // all tagged SPACER; no apparel
  "candle",          // literal candles
  "gift certificate",
  "dresses",         // women's only
  "basics",          // 3 products, unclear type, exclude conservatively
  "mens",            // 9-product legacy miscategorization, all ARCHIVE
  "",
]);

// Direct product_type → AppCategory for unambiguous legacy types.
// The four umbrella types (Wovens, Knits, Outerwear, Bottoms) are handled by
// disambiguation functions below.
const MAP: Record<string, AppCategory> = {
  "pants":  "pants",   // legacy archive type — all genuine pants/chinos
  "shorts": "shorts",  // legacy archive type — all genuine shorts
  "denim":  "pants",   // selvage jeans — functionally pants
};

// Wovens: woven-fabric button-front shirts at varying sleeve lengths, plus
// overshirts and shirt-jackets that TS cross-lists under both shirts and outerwear.
// The "SHIRT JACKETS" tag and title keywords are the reliable signal for layers.
function resolveWovens(tags: string[], title: string): AppCategory {
  const t = title.toLowerCase();
  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));

  if (t.includes("overshirt") || t.includes("shirt jacket") || tagSet.has("shirt jackets"))
    return "jackets";
  if (tagSet.has("long sleeve") || t.includes("long sleeve"))
    return "longsleeve";
  return "shirts";
}

// Knits: all knit-construction tops — tees, henleys, rugbies, polos, sweaters,
// crewneck sweatshirts, hoodies, and zip-fronts. TS's own TEES / SWEATERS /
// SWEATSHIRTS uppercase tags are the primary sub-signal; title keywords fill gaps.
// Order matters — check most specific category first.
function resolveKnits(tags: string[], title: string): AppCategory {
  const t = title.toLowerCase();
  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));

  if (t.includes("polo") || tagSet.has("polos"))         return "polos";
  if (t.includes("hoodie") || t.includes("hooded"))      return "hoodies";
  if (t.includes("zip"))                                  return "zips";
  if (tagSet.has("sweatshirts"))                          return "hoodies"; // crew sweatshirts
  if (tagSet.has("sweaters"))                             return "sweaters";
  if (t.includes("henley") && tagSet.has("long sleeve")) return "longsleeve";
  if (tagSet.has("long sleeve"))                          return "longsleeve";
  return "shirts"; // TEES tag and all remaining knit tops fall here
}

// Outerwear: jackets of all kinds — bombers, chore coats, parkas, trucker jackets,
// plus vests and overshirts/shirt-jackets. Blazers and Sportcoats are caught by
// isExcludedTaylorStitchTitle() before this function is reached.
function resolveOuterwear(tags: string[], title: string): AppCategory {
  const t = title.toLowerCase();
  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));

  if (t.includes("vest"))                                                             return "vests";
  if (t.includes("overshirt") || t.includes("shirt jacket") || tagSet.has("shirt jackets"))
    return "jackets";
  return "jackets";
}

// Bottoms: Taylor Stitch's umbrella type covering both shorts and pants.
// TS's own SHORTS and PANTS uppercase tags are the reliable disambiguator.
// Anything without a SHORTS tag maps to pants — jeans, chinos, and trousers
// all land here correctly.
function resolveBottoms(tags: string[], _title: string): AppCategory {
  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));
  if (tagSet.has("shorts")) return "shorts";
  return "pants";
}

/**
 * Look up the AppCategory for a Taylor Stitch product_type.
 * Assumes archive, product_type, and title-keyword exclusions have already been
 * handled by isExcludedProductType() in the central dispatcher.
 * Returns null for unmapped types (falls through to vision).
 */
export function lookupTaylorStitchCategory(
  productType: string,
  tags: string[],
  title = ""
): AppCategory | null {
  const normalized = productType.toLowerCase().trim();

  if (normalized === "wovens")    return resolveWovens(tags, title);
  if (normalized === "knits")     return resolveKnits(tags, title);
  if (normalized === "outerwear") return resolveOuterwear(tags, title);
  if (normalized === "bottoms")   return resolveBottoms(tags, title);

  return MAP[normalized] ?? null;
}
