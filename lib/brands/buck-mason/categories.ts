import type { AppCategory } from "@/types";

/**
 * Buck Mason uses specific product_types for mainstream items (Tees, Shirts, Sweaters,
 * Outerwear, Pants, Jeans, Shorts) alongside a significant non-apparel catalog
 * (Found Objects, Vintage Watches, collectibles) and collab-specific types.
 *
 * Key patterns:
 *   - style-- tags are the primary disambiguator for multi-destination types.
 *   - style--polo spans both Tees and Sweaters types (cashmere polos live in Sweaters).
 *   - "Jackets" product_type is 100% sport coats (style--blazer) — excluded like TS blazers.
 *   - Collab types (Anatomica, Lee, Big Yank, etc.) resolved generically by style tag + title.
 */

export const BM_EXCLUDED_PRODUCT_TYPES = new Set([
  "",                     // PK cards — internal merchandising placeholders, no apparel
  "jackets",              // 100% sport coats (all style--blazer); excluded like TS blazers
  "tailoring",            // J. Mueser formal wear (polo coats, dress trousers, dress jackets)
  "found objects",        // vintage collectibles — cigarette boxes, lighters, belts, etc.
  "accessories",          // belts, bags
  "lee accessories",      // Lee collab accessories
  "red rabbit",           // jewelry and accessories collab
  "vintage watches",      // Rolex, LeCoultre, Patek Philippe, etc.
  "vintage jewelry",      // rings, brooches, cuffs
  "vintage tops",         // vintage apparel — not core Benchmark product line
  "vintage bottoms",      // vintage board shorts, vintage trousers
  "vintage shoes",        // vintage sneakers
  "footwear",             // Moonstar deck shoes — excluded per CLAUDE.md footwear rule
  "shoes",                // Sanders collab shoes
  "books",
  "vintage books",
  "lf tabletop and bar",  // dinnerware
  "gift card",
  "pk",
  // Women's — belt-and-suspenders; gender tag filter also catches these upstream
  "womens tees",
  "womens shirts",
  "womens sweaters",
  "womens sweats",
  "womens outerwear",
  "womens pants",
  "womens jeans",
  "womens shorts",
  "womens dresses",
  "womens tanks",
  "womens skirts",
  "womens accessories",
]);

// Tag-based exclusions applied regardless of product_type.
// style--blazer: BM's "Jackets" type is entirely sport coats, but the tag is the
//   canonical signal — blocks any blazer-tagged product across all types.
// style--tanks: tank tops appear as a small subset of "Tees" — not in Benchmark's scope.
export function isExcludedBMTag(tags: string[]): boolean {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  return tagSet.has("style--blazer") || tagSet.has("style--tanks");
}

// Title-keyword exclusions — catches blazers and sport coats that share collab product_types
// with genuine jackets but lack the style--blazer tag (e.g. J.Press collab items).
// Mirrors the TS isExcludedTaylorStitchTitle pattern: title check as supplement to
// product_type and tag exclusions when product_type alone is too coarse.
const BM_EXCLUDED_TITLE_KEYWORDS = ["Blazer", "Sportcoat", "Sport Coat"];

export function isExcludedBuckMasonTitle(title: string): boolean {
  const t = title.toLowerCase();
  return BM_EXCLUDED_TITLE_KEYWORDS.some((kw) => t.includes(kw.toLowerCase()));
}

// Collab product_types — genuine men's apparel from named collaborations.
// Each collab may include multiple garment types; resolved generically by style tag + title.
const BM_COLLAB_TYPES = new Set([
  "anatomica",
  "j.press",
  "j press",
  "brycelands",
  "lee outerwear",
  "lee wovens",
  "lee tees",
  "big yank",
  "mcgregor",
  "rocky mountain",
  'y"2 leather',
]);

// Direct product_type → AppCategory for unambiguous types.
const MAP: Record<string, AppCategory> = {
  "shorts":    "shorts",
  "swim":      "shorts",  // board shorts and swim shorts
  "denim":     "pants",   // Bulkhead Dungaree — fatigue-pant cut
  "jeans":     "pants",   // includes Ford Standard Pant (five-pocket non-denim cuts)
  "pants":     "pants",
  "outerwear": "jackets",
};

// Tees: BM's broadest top category — short-sleeve knit tees, L/S knits, and polos.
// style-- tag is the primary signal; title is fallback.
// Tanks (style--tanks) are handled upstream by isExcludedBMTag before this is reached.
function resolveTees(tags: string[], title: string): AppCategory {
  const t = title.toLowerCase();
  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));

  if (tagSet.has("style--polo") || t.includes("polo"))                              return "polos";
  if (tagSet.has("style--knit-l-s") || tagSet.has("style--knit-ls")
      || t.includes(" l/s") || t.includes("long sleeve"))                           return "longsleeve";
  return "shirts";
}

// Sweaters: crewneck sweaters, cashmere polos, cardigans, turtlenecks, one quarter-zip.
// style--polo spans both Tees and Sweaters types — cashmere polos live here.
function resolveSweaters(tags: string[], title: string): AppCategory {
  const t = title.toLowerCase();
  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));

  if (tagSet.has("style--polo") || t.includes("polo"))                              return "polos";
  if (tagSet.has("style--quarter-zip")
      || t.includes("quarter-zip") || t.includes("quarter zip"))                    return "zips";
  return "sweaters"; // crew, cardigan, classic-v, turtleneck all land here
}

// Sweats: BM's fleece/terry umbrella — hoodies, crewneck sweatshirts, quarter-zips,
// sweatpants, and sweat shorts. Crew sweatshirts map to hoodies (ASRV/TS convention).
function resolveSweats(tags: string[], title: string): AppCategory {
  const t = title.toLowerCase();
  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));

  if (tagSet.has("style--hooded-sweatshirt") || t.includes("hooded") || t.includes("hoodie"))
    return "hoodies";
  if (tagSet.has("style--quarter-zip") || tagSet.has("style--full-zip") || t.includes("zip"))
    return "zips";
  if (tagSet.has("style--sweatpant") || t.includes("sweatpant"))
    return "pants";
  if (tagSet.has("style--sweatshort") || t.includes("sweatshort"))
    return "shorts";
  return "hoodies"; // style--crewneck-sweatshirt and remaining fleece tops
}

// Shirts: all wovens — Western shirts, camp shirts, work shirts, OCBDs.
// Majority are long-sleeve wovens (style--ls-wovens); S/S wovens are shirts.
function resolveShirts(tags: string[], title: string): AppCategory {
  const t = title.toLowerCase();
  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));

  if (tagSet.has("style--ls-wovens") || t.includes(" l/s") || t.includes("long sleeve"))
    return "longsleeve";
  return "shirts";
}

// Collab types: resolve generically by style tag then title keyword.
// Sweatshirt is checked before shirt to prevent "Sweatshirt" matching the shirt branch.
function resolveCollab(tags: string[], title: string): AppCategory | null {
  const t = title.toLowerCase();
  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));

  if (tagSet.has("style--jacket") || tagSet.has("style--outerwear") || tagSet.has("style--jackets")
      || t.includes("jacket") || t.includes("parka") || t.includes("coat"))         return "jackets";
  if (tagSet.has("style--polo") || t.includes("polo"))                               return "polos";
  if (tagSet.has("style--ls-wovens") || t.includes(" l/s") || t.includes("long sleeve"))
                                                                                     return "longsleeve";
  if (tagSet.has("style--cardigan") || t.includes("sweater") || t.includes("cardigan"))
                                                                                     return "sweaters";
  if (tagSet.has("style--crew") || tagSet.has("style--crewneck-sweatshirt")
      || tagSet.has("style--sweatshirt") || t.includes("sweatshirt"))                return "hoodies";
  if (t.includes("shirt"))                                                           return "shirts";
  if (tagSet.has("style--pant") || tagSet.has("style--pants") || tagSet.has("style--trouser")
      || tagSet.has("style--five-pocket") || tagSet.has("style--denim")
      || t.includes("pant") || t.includes("trouser") || t.includes("jean")
      || t.includes("denim") || t.includes("chino") || t.includes("fatigue"))       return "pants";
  if (t.includes("short"))                                                           return "shorts";
  if (t.includes("tee") || t.includes("t-shirt"))                                   return "shirts";
  return null;
}

/**
 * Look up the AppCategory for a Buck Mason product.
 * Assumes BM_EXCLUDED_PRODUCT_TYPES and isExcludedBMTag checks have already been
 * handled upstream by isExcludedProductType() in the central dispatcher.
 * Title-keyword exclusion (isExcludedBuckMasonTitle) is also checked upstream,
 * but is re-checked here as defense in depth for any path that bypasses the dispatcher.
 * Returns null for products with no clear category signal (falls through to vision).
 */
export function lookupBuckMasonCategory(
  productType: string,
  tags: string[],
  title = ""
): AppCategory | null {
  const normalized = productType.toLowerCase().trim();

  // Defense in depth: title-keyword exclusion catches blazers/sport coats that
  // lack style--blazer tag (e.g. J.Press collab items with product_type "j.press").
  if (isExcludedBuckMasonTitle(title)) return null;

  // Direct MAP: unambiguous single-destination types
  if (normalized in MAP) return MAP[normalized as keyof typeof MAP];

  // Multi-destination types: dispatch to dedicated resolvers
  if (normalized === "tees")     return resolveTees(tags, title);
  if (normalized === "sweaters") return resolveSweaters(tags, title);
  if (normalized === "sweats")   return resolveSweats(tags, title);
  if (normalized === "shirts")   return resolveShirts(tags, title);

  // Collab types: resolve generically by style tag + title
  if (BM_COLLAB_TYPES.has(normalized)) return resolveCollab(tags, title);

  return null;
}
