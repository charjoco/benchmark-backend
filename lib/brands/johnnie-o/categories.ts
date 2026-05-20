// Johnnie-O category resolution.
//
// JO uses a proprietary abbreviated product_type system (MPO, MKO, MSH, etc.) plus
// a secondary MENS_* naming convention. The inline categoryMappings in brands.ts are
// non-functional (titleContains alone cannot satisfy the generic resolver's
// (typeMatch || tagMatch) && titleOk guard), so all current DB categorizations were
// assigned by vision. This file replaces that path with deterministic type-primary logic.
//
// Licensed product types (NCAA/NFL/MLB/NHL/CAA prefixes, PerryGolf, Ryder Cup, WM) reach
// the scraper exclusively through JO's game-day collection, which the scraper already
// excludes. They are not listed here to avoid duplicating that filter.

import type { AppCategory } from "@/types";

// Non-apparel types that pass JO's mens tag filter and would otherwise reach vision.
export const JO_EXCLUDED_PRODUCT_TYPES = new Set([
  "mfw",           // Men's Footwear
  "uht",           // Unisex Hat / Headwear
  "mbl",           // Men's Belt
  "mac",           // Men's Accessories
  "msw",           // Men's Swimwear
  "mens_swimsuit",
  "mvt",           // Men's Vest
  "mens_vest",
  "mbz",           // Men's Blazer
  "mens_blazer",
  "golf cmvt",     // GOLF CM* vest (PGA event — same exclusion logic as MVT)
]);

// MKO (Men's Knit Outerwear) spans quarter-zips, hooded pullovers, and crew pullovers.
// GOLF CMKO follows the same suffix pattern and uses the same dispatch.
// Resolution order: polo (mis-typed MKO catalog entries) → zips → hoodies → sweaters.
function resolveMkoType(title: string): AppCategory {
  const t = title.toLowerCase();
  if (t.includes("polo")) return "polos";
  if (
    t.includes("quarter zip") ||
    t.includes("1/4 zip") ||
    t.includes("half zip") ||
    t.includes("1/2 zip")
  ) {
    return "zips";
  }
  if (t.includes("hoodie")) return "hoodies";
  return "sweaters";
}

// Direct product_type → AppCategory for unambiguous types.
// MKO and GOLF CMKO are intentionally absent — they require title disambiguation.
// All keys are lowercase to match normalized lookup.
const MAP: Record<string, AppCategory> = {
  // Polos
  "mpo":             "polos",
  "mens_polo":       "polos",
  "mens_ls polo":    "polos",
  // GOLF CM* types — PGA event products (all in game-day collection, mapped correctly
  // in case a product bypasses the game-day filter; GOLF CMKO uses resolveMkoType)
  "golf cmpo":       "polos",
  "golf cmjk":       "jackets",
  "golf cmhd":       "hoodies",
  "golf cmst":       "shirts",
  "golf cmlt":       "longsleeve",
  // Shirts (short-sleeve tees and woven SS)
  "mens_ss t-shirt": "shirts",
  "mst":             "shirts",     // Men's Short Tee
  "mws":             "shirts",     // Men's Woven Shirt (SS button-down)
  "mens_ss woven":   "shirts",
  // Long-sleeve (tees and woven LS button-ups)
  "mlt":             "longsleeve", // Men's Long-sleeve Tee
  "mwl":             "longsleeve", // Men's Woven Long-sleeve
  "mens_ls woven":   "longsleeve",
  // Hoodies
  "mhd":             "hoodies",
  // Sweaters / crewnecks
  "mens_sweater":    "sweaters",
  // Jackets
  "mjk":             "jackets",
  // Pants
  "mpa":             "pants",
  "mens_pant":       "pants",
  // Shorts
  "msh":             "shorts",     // Men's SHorts
};

// Safety-net title exclusion for accessories with no product_type or an unrecognized type.
// The primary exclusion path is JO_EXCLUDED_PRODUCT_TYPES — this catches slip-throughs only.
export function isExcludedJohnnieOTitle(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes("loafer")    ||
    t.includes("sandal")    ||
    t.includes("sneaker")   ||
    t.includes("moccasin")  ||
    t.includes("boot")      ||
    t.includes("shoe")      ||
    t.includes(" belt")     ||
    t.includes("sunglasses")||
    t.includes("dopp kit")  ||
    t.includes("trucker")
  );
}

/**
 * Look up the AppCategory for a Johnnie-O product.
 * MKO and GOLF CMKO use title-based dispatch (resolveMkoType).
 * Assumes type and title exclusions have already run via isExcludedProductType().
 * Returns null for unmapped types — caller falls through to vision.
 */
export function lookupJohnnieOCategory(
  productType: string,
  _tags: string[] = [],
  title = ""
): AppCategory | null {
  const normalized = productType.toLowerCase().trim();

  if (normalized === "mko" || normalized === "golf cmko" || normalized === "mens_knit outerwear") return resolveMkoType(title);

  return MAP[normalized] ?? null;
}
