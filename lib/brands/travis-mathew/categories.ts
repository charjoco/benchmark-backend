import type { AppCategory } from "@/types";

/**
 * TravisMathew has MLB licensing across roughly 14% of their catalog (291 of 2,073
 * products). Benchmark's editorial position is that pro/college team licensed
 * apparel is below the brand bar. PGA Tour licensing remains allowed but is
 * currently zero products in TM catalog.
 *
 * Detection strategy:
 *   1. Check `Exclude MLB` tag — catches 28% of MLB products (TM's tag coverage
 *      is incomplete on newer drops).
 *   2. Title substring match against 30 full "City Team" identifiers — catches
 *      the remaining 71% of MLB products.
 *
 * Validated against full TM catalog: 0 false positives across 2,073 products,
 * 99% coverage of known MLB inventory. The remaining 1% (3 products with
 * "Athletics" standalone titles) are accepted as false negatives — adding
 * "Athletics" to the identifier list would trigger excessive false positives
 * in performance/athleisure apparel.
 */

// Exhaustive list of all 30 MLB franchises as "City Team" strings.
// Short forms omitted — full city+team catches 99% of TM's MLB inventory with 0 false positives.
// "St Louis Cardinals" intentionally lacks the period — TM product titles do not include it.
const MLB_TEAM_IDENTIFIERS: readonly string[] = [
  "New York Yankees",     "Boston Red Sox",       "Baltimore Orioles",
  "Tampa Bay Rays",       "Toronto Blue Jays",    "Chicago White Sox",
  "Cleveland Guardians",  "Detroit Tigers",       "Kansas City Royals",
  "Minnesota Twins",      "Houston Astros",       "Los Angeles Angels",
  "Oakland Athletics",    "Sacramento Athletics", "Seattle Mariners",
  "Texas Rangers",        "Atlanta Braves",       "Miami Marlins",
  "New York Mets",        "Philadelphia Phillies","Washington Nationals",
  "Chicago Cubs",         "Cincinnati Reds",      "Milwaukee Brewers",
  "Pittsburgh Pirates",   "St Louis Cardinals",   "Arizona Diamondbacks",
  "Colorado Rockies",     "Los Angeles Dodgers",  "San Diego Padres",
  "San Francisco Giants",
];

/**
 * Returns true for MLB-licensed products that should be excluded from the catalog.
 * Checks the `Exclude MLB` tag first (fast path), then falls back to title matching.
 * Called by isExcludedProductType() in the central dispatcher — callers should use
 * that function rather than calling this directly.
 */
export function isExcludedLicensedSports(
  _productType: string,
  tags: string[],
  title: string
): boolean {
  if (tags.includes("Exclude MLB")) return true;
  const t = title.toLowerCase();
  return MLB_TEAM_IDENTIFIERS.some((id) => t.includes(id.toLowerCase()));
}

// Known non-apparel types and women's-only types that pass TravisMathew's mens
// collection filter. Women's types listed explicitly to guard against filter bypasses.
export const TM_EXCLUDED_PRODUCT_TYPES = new Set([
  "snapback", "crew sock", "no show sock", "ankle sock",
  "stretch woven belt", "boxer", "beanie", "sunglasses",
  "skort", "golf towel", "bucket hat", "fitted",
  "golf glove", "canvas stretch belt", "visor",
  "casual shoe", "adjustable", "straw hat", "wallet",
  "blanket", "cooler", "golf shoe", "boombox",
  "beach towel", "legging", "backpack", "dopp kit",
  "carry-on", "duffle", "tank",
  // Women's-only types
  "dress", "skirt", "romper", "jumpsuit",
  "shirts and tops",
  "active top", "active tank",
  "",
]);

// Direct product_type → AppCategory for TravisMathew's explicit, self-describing type strings.
// "Hoodie" is omitted — it requires tag/title disambiguation (see resolveHoodieType).
const MAP: Record<string, AppCategory> = {
  "polo":                  "polos",
  "tee":                   "shirts",
  "button-up":             "shirts",
  "henley":                "shirts",
  "quarter zip":           "zips",
  "full zip":              "zips",
  "half zip":              "zips",
  "short":                 "shorts",
  "boardshort":            "shorts",
  "jacket":                "jackets",
  "bomber":                "jackets",
  "shacket":               "jackets",
  "vest":                  "vests",
  "pant":                  "pants",
  "jogger":                "pants",
  "sweater":               "sweaters",
  "cardigan":              "sweaters",
  "crew":                  "hoodies",
  "pullover":              "hoodies",
  "hoodies and pullovers": "hoodies",
};

// "Hoodie" product_type covers both pullover hoodies and zip hoodies ("Skyloft Soft Zip Hood", etc.).
// Tags "Full Zip" / "Half Zip" are the primary signal; title "zip" is a fallback.
function resolveHoodieType(tags: string[], title: string): AppCategory {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  if (tagSet.has("full zip") || tagSet.has("half zip")) return "zips";
  if (title.toLowerCase().includes("zip")) return "zips";
  return "hoodies";
}

/**
 * Look up the AppCategory for a TravisMathew product_type.
 * Assumes licensed sports and product type exclusions have already been handled
 * by isExcludedProductType() in the central dispatcher.
 * Returns null for unmapped types (unknown future types fall through to vision).
 */
export function lookupTravisMathewCategory(
  productType: string,
  tags: string[],
  title = ""
): AppCategory | null {
  const normalized = productType.toLowerCase().trim();
  if (normalized === "hoodie") return resolveHoodieType(tags, title);
  return MAP[normalized] ?? null;
}
