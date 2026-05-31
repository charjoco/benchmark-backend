// BYLT category resolution.
//
// BYLT embeds gender and category in a hierarchical product_type string using
// U+2019 (curly apostrophe): "Men’s-Tops-Short-Sleeves", etc.
// lookupByltCategory normalizes U+2019 → U+0027 before all comparisons.
//
// Single-destination types (MAP):
//   Men's-Tops-Short-Sleeves → shirts
//   Men's-Top-Long-Sleeves   → longsleeve  (note: "Top" singular, BYLT naming quirk)
//   Men's-Tops-Polos         → polos
//   Men's-Bottoms-Shorts     → shorts
//   Men's-Bottoms-Pants      → pants
//   Men's-Bottoms-Joggers    → pants
//
// Multi-destination types requiring title dispatch:
//   Men's-Tops-Button-Downs — LS ("long sleeve" / "long-sleeve") or overshirt/flannel in title → longsleeve; else → shirts.
//   Men's-Tops-Outerwear    — spans jackets, zips, hoodies, sweaters, overshirts.
//     Resolution order: jackets → zips → hoodies → sweaters/knits → overshirts/flannels → null (vision).
//     "Nylon" signals performance shell (Tech Nylon Fairway Pullover → jackets, not hoodies).
//     "Padded" signals insulated outerwear → jackets.
//
// Exclusions:
//   BYLT_EXCLUDED_PRODUCT_TYPES: underwear, boardshorts, tanks.
//   isExcludedByltProductType: blazers (title-based), bundles (title-based).
//   Vests handled upstream by shared /\bvests?\b/i rule in resolveCategory.

import type { AppCategory } from "@/types";

export const BYLT_EXCLUDED_PRODUCT_TYPES = new Set([
  "men's-bottoms-underwear",
  "men's-bottoms-boardshorts",
  "men's-tops-tanks",
]);

// Tailored blazers (Pro Blazer, Midtown Blazer) arrive in Men's-Tops-Outerwear.
// Excluded per editorial decision.
function isByltTailoredBlazer(title: string): boolean {
  return /\bblazers?\b/i.test(title);
}

// Men's-Tops-Outerwear spans jackets, zips, hoodies, sweaters, and shirt-layer pieces.
// Vests handled upstream — never reach this function.
// Returns null for unresolvable items → falls to vision.
function resolveByltOuterwear(title: string): AppCategory | null {
  const t = title.toLowerCase();

  // Jackets — check before zips: "Coastal Zip Jacket" has "zip" but is primarily a jacket.
  // "nylon" catches performance-shell pullovers (Tech Nylon Fairway Pullover → jackets, not hoodies).
  // "padded" catches insulated outerwear without "jacket" in the name (Padded Fairway, Padded Overshirt).
  if (
    t.includes("jacket")      || t.includes("coat")     || t.includes("anorak")   ||
    t.includes("windbreaker") || t.includes("parka")    || t.includes("bomber")   ||
    t.includes("puffer")      || t.includes("insulated")|| t.includes("padded")   ||
    t.includes("nylon")
  ) return "jackets";

  // Zips — full-zip, half-zip, quarter-zip, and generic zip sweatshirts/fleeces.
  if (
    t.includes("quarter-zip") || t.includes("half-zip") || t.includes("full-zip") ||
    t.includes("full zip")    || t.includes("zip")
  ) return "zips";

  // Hoodies — non-zip hooded sweatshirts (Tour Hoodie, Roamknit Adapt Hoodie, etc.)
  if (t.includes("hoodie")) return "hoodies";

  // Sweaters and crewnecks — knit pullovers, cardigan, crewneck sweatshirts.
  // "pullover" here catches remaining athletic/knit pullovers not caught by jacket/zip/hoodie checks.
  if (
    t.includes("crewneck") || t.includes("crew")    || t.includes("sweater") ||
    t.includes("cardigan")  || t.includes("knit")   || t.includes("pullover")
  ) return "sweaters";

  // Overshirts / flannels / shackets — shirt-layer pieces worn as outerwear.
  if (
    t.includes("flannel")   || t.includes("overshirt") || t.includes("shacket") ||
    t.includes("ribbed")
  ) return "longsleeve";

  return null;
}

// Direct product_type → AppCategory for single-destination types.
// All keys are the normalized (lowercase, straight-apostrophe) form.
const MAP: Record<string, AppCategory> = {
  "men's-tops-short-sleeves": "shirts",
  "men's-top-long-sleeves":   "longsleeve",  // "Top" singular — BYLT naming inconsistency
  "men's-tops-polos":         "polos",
  "men's-bottoms-shorts":     "shorts",
  "men's-bottoms-pants":      "pants",
  "men's-bottoms-joggers":    "pants",
};

export function isExcludedByltProductType(productType: string, title = ""): boolean {
  const normalized = productType.toLowerCase().trim().replace(/’/g, "'");
  if (BYLT_EXCLUDED_PRODUCT_TYPES.has(normalized)) return true;
  if (isByltTailoredBlazer(title)) return true;
  if (/\bbundle\b/i.test(title)) return true;
  return false;
}

/**
 * Look up the AppCategory for a BYLT product.
 * Returns null for unrecognized types — caller falls through to vision.
 */
export function lookupByltCategory(
  productType: string,
  _tags: string[] = [],
  title = ""
): AppCategory | null {
  // Normalize U+2019 (curly apostrophe) in BYLT's "Men’s-*" product types.
  const normalized = productType.toLowerCase().trim().replace(/’/g, "'");

  // Single-destination types
  if (normalized in MAP) return MAP[normalized];

  // "Men's-Tops-Button-Downs" — LS/overshirt vs short-sleeve dispatch.
  // BYLT places some overshirts and flannels in Button-Downs rather than Outerwear.
  // Short-sleeve overshirts ("Elite+ Short Sleeve Overshirt") must not hit the longsleeve path.
  if (normalized === "men's-tops-button-downs") {
    const t = title.toLowerCase();
    const isShortSleeve = t.includes("short sleeve") || t.includes("short-sleeve");
    if (
      !isShortSleeve && (
        t.includes("long sleeve") || t.includes("longsleeve") || t.includes("long-sleeve") ||
        t.includes("overshirt")   || t.includes("flannel")
      )
    ) return "longsleeve";
    return "shirts";
  }

  // "Men's-Tops-Outerwear" — full title dispatch
  if (normalized === "men's-tops-outerwear") {
    return resolveByltOuterwear(title);
  }

  return null;
}
