// Rhone category resolution.
//
// Rhone uses mostly English product_type names. Three types need title dispatch:
//
//   "Tees/Tanks" — mixed bag: short-sleeve tees, long-sleeve tees, and sleeveless tanks/singlets.
//     Sleeveless items (tank, sleeveless, singlet in title) are excluded upstream by
//     isExcludedRhoneProductType(). Items that reach lookupRhoneCategory() need only
//     the long-sleeve vs. short-sleeve split.
//
//   "Tees" — short- and long-sleeve tees only (no sleeveless items in this type).
//     Same LS/SS dispatch as Tees/Tanks post-exclusion.
//
//   "Midlayers" — spans zips, hoodies, outerwear, and crewneck sweaters.
//     Resolution order: jackets → zips → hoodies → sweaters (same logic as JO MKO).
//
//   "Shirts" — dress/woven button-downs only (Commuter®, Brezza Linen-Blend, State of Mind).
//     Kept as `shirts` per editorial decision 2026-05-21.
//     "Blazers/Jackets" type excluded per same decision.

import type { AppCategory } from "@/types";

export const RHONE_EXCLUDED_PRODUCT_TYPES = new Set([
  // Tailored — out of scope per editorial decision 2026-05-21
  "blazers/jackets",
  // Sleeveless — not in category scope
  "tanks",
  "tank top",
  // Non-apparel
  "accessories",
  "accessory",
  "hat",
  "hats",
  "visor",
  "bags",
  "gloves",
  "socks",
  "shoes",
  "underwear",
  "gift card",
  "gift message",
  "json master",    // internal Shopify metadata type
  // Performance vests — not in scope without explicit decision
  "vest",
  // Women's-only (safety net beyond tag filtering)
  "dresses/jumpsuits",
  "leggings/tights",
  "bras",
  "skirts",
  "skort",
  "jumpsuits",
]);

// Sleeveless items arrive in the "Tees/Tanks" combined type. Exclude by title
// so they never reach category resolution (and never reach vision).
function isSleevelessTeesTanks(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes("tank") || t.includes("sleeveless") || t.includes("singlet");
}

// "Midlayers" spans outerwear (anoraks, shells), zips, hoodies, and crew sweaters.
// Resolution order mirrors JO MKO dispatch: jackets first, then zips, hoodies, sweaters.
function resolveMidlayersType(title: string): AppCategory {
  const t = title.toLowerCase();
  if (
    t.includes("jacket") ||
    t.includes("coat")   ||
    t.includes("anorak") ||
    t.includes("windbreaker") ||
    t.includes("parka")  ||
    t.includes("shell")  ||
    t.includes("bomber")
  ) return "jackets";
  if (t.includes("zip") || t.includes("quarter-zip") || t.includes("half-zip")) return "zips";
  if (t.includes("hoodie") || t.includes("pullover") || t.includes("sweatshirt")) return "hoodies";
  return "sweaters";
}

// Direct product_type → AppCategory for single-destination types.
// All keys are lowercase to match normalized lookup.
// "Tees", "Tees/Tanks", "Midlayers", "Sweaters", and "Pullover" are handled
// by explicit branches in lookupRhoneCategory() and are intentionally absent here.
const MAP: Record<string, AppCategory> = {
  "shirts":       "shirts",      // Commuter, Brezza, State of Mind woven button-downs
  "short sleeve": "shirts",      // legacy type; all are short-sleeve tees
  "long sleeve":  "longsleeve",  // legacy type; all are long-sleeve tees
  "polos":        "polos",
  "shorts":       "shorts",
  "pants":        "pants",
  "jogger":       "pants",
  "pant":         "pants",
  "outerwear":    "jackets",
  "jacket":       "jackets",
  "hoodie":       "hoodies",
  "crewneck":     "sweaters",
  "cardigan":     "sweaters",
};

export function isExcludedRhoneProductType(productType: string, title = ""): boolean {
  const normalized = productType.toLowerCase().trim();
  if (RHONE_EXCLUDED_PRODUCT_TYPES.has(normalized)) return true;
  if (normalized === "tees/tanks" && isSleevelessTeesTanks(title)) return true;
  return false;
}

/**
 * Look up the AppCategory for a Rhone product.
 * Returns null for unrecognized types — caller falls through to vision.
 */
export function lookupRhoneCategory(
  productType: string,
  _tags: string[] = [],
  title = ""
): AppCategory | null {
  const normalized = productType.toLowerCase().trim();
  const t = title.toLowerCase();

  // Tees (214 men's) and Tees/Tanks post-exclusion (sleeveless already excluded upstream):
  // split long-sleeve vs. short-sleeve only.
  if (normalized === "tees" || normalized === "tees/tanks") {
    return (t.includes("long sleeve") || t.includes("longsleeve")) ? "longsleeve" : "shirts";
  }

  // Midlayers (548 total): full title dispatch
  if (normalized === "midlayers" || normalized === "midlayer") {
    return resolveMidlayersType(title);
  }

  // Sweaters and Pullover: zip → zips, else → sweaters
  if (normalized === "sweaters" || normalized === "pullover") {
    return (t.includes("zip") || t.includes("quarter-zip") || t.includes("half-zip"))
      ? "zips"
      : "sweaters";
  }

  return MAP[normalized] ?? null;
}
