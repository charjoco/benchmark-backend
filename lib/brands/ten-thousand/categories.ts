// Ten Thousand category resolution.
//
// Ten Thousand uses granular product_type names — one per product line
// ("Interval Short", "Tactical Shirt", "Session Jogger", etc.).
// Resolution uses substring keyword matching on product_type, with title dispatch
// for multi-destination types and a title-based fallback for empty/unrecognized types.
//
// Single-destination types (keyword → category):
//   *jacket*, *coat*, *shell*, *anorak*, *windbreaker* → jackets
//   *hoodie*                                           → hoodies (wins over zip;
//     "Tech Hoodie" = full-zip hoodie still → hoodies per Step 2 decision)
//   *zip*                                              → zips   (non-hoodie zips only)
//   *long sleeve*                                      → longsleeve
//   *crew*                                             → sweaters
//   *short*                                            → shorts
//   *pant*, *jogger*                                   → pants
//
// Multi-destination types requiring title dispatch:
//   *shirt*, *tee* — "Tactical Shirt", "Interval Shirt", "Session Shirt" span:
//     title contains "long sleeve" → longsleeve
//     title contains "tank"/"muscle"/"sleeveless" → excluded upstream
//     else → shirts
//
// Title fallback (empty or unrecognized product_type):
//   Dispatches on title keywords before returning null.
//   Catches: "(empty)" type → "Heavyweight Core Short" → shorts;
//            "Aaron Levine Capsule" → "Garment-Dyed Logo Tee" → shirts.
//
// Exclusions:
//   TT_EXCLUDED_PRODUCT_TYPES: compression shorts/tights, non-apparel, accessories.
//   isTenThousandNonApparel: pattern-based for types with em dashes / special chars
//     (A—L Pack 15L, MAKR + TT "Mil Spec" BELT, A—L Boxer, CØ5 Boxer).
//   isTenThousandTankOrSleeveless: title-level /\b(tank|muscle|sleeveless)\b/i.

import type { AppCategory } from "@/types";

export const TT_EXCLUDED_PRODUCT_TYPES = new Set([
  // Compression / base layer — excluded per Step 2 decision
  "compression short",
  "3/4 tight",
  "full length tight",
  // Non-apparel
  "delivery guarantee",
  "digital gift card",
  "resistance bands",
  "ankle sock",
  "hand grips",
  "wrist wraps",
]);

// Pattern-based exclusions for product_types with em dashes, Ø, and special chars
// that make exact Set matching fragile.
function isTenThousandNonApparel(productType: string): boolean {
  const t = productType.toLowerCase();
  if (t.includes("pack 15l")) return true;  // A—L Pack 15L (backpack)
  if (t.includes("belt")) return true;       // MAKR + TT "Mil Spec" BELT (accessory)
  if (t.includes("boxer")) return true;      // A—L Boxer, CØ5 Boxer (underwear)
  return false;
}

function isTenThousandTankOrSleeveless(title: string): boolean {
  return /\b(tank|muscle|sleeveless)\b/i.test(title);
}

export function isExcludedTenThousandProductType(productType: string, title = ""): boolean {
  const normalized = productType.toLowerCase().trim();
  if (TT_EXCLUDED_PRODUCT_TYPES.has(normalized)) return true;
  if (isTenThousandNonApparel(productType)) return true;
  if (isTenThousandTankOrSleeveless(title)) return true;
  return false;
}

export function lookupTenThousandCategory(
  productType: string,
  title = ""
): AppCategory | null {
  const pt = productType.toLowerCase().trim();
  const t = title.toLowerCase();

  // Jacket family — check before zip: "Waterproof Shell Jacket" has both "shell" and "jacket"
  if (
    pt.includes("jacket")      || pt.includes("coat")        ||
    pt.includes("shell")       || pt.includes("anorak")      ||
    pt.includes("windbreaker")
  ) return "jackets";

  // Hoodies — check before zips: full-zip hoodies stay in hoodies per Step 2 decision.
  // "Tech Hoodie" (product_type) → hoodies even though title has "Full Zip".
  if (pt.includes("hoodie")) return "hoodies";

  // Zips — non-hoodie zip pullovers ("Over Zip" → Overzip)
  if (pt.includes("zip")) return "zips";

  // Long sleeves — product_type explicitly contains "long sleeve"
  if (pt.includes("long sleeve")) return "longsleeve";

  // Sweaters — crew-style knit pullovers
  if (pt.includes("crew")) return "sweaters";

  // Shorts
  if (pt.includes("short")) return "shorts";

  // Pants and joggers
  if (pt.includes("pant") || pt.includes("jogger")) return "pants";

  // Shirts and tees — title dispatch for multi-destination types.
  // "Tactical Shirt", "Interval Shirt", "Session Shirt" all span LS + SS + excluded tanks.
  // Tank/muscle exclusions are handled upstream by isExcludedTenThousandProductType.
  if (pt.includes("shirt") || pt.includes("tee")) {
    if (
      t.includes("long sleeve") || t.includes("longsleeve") || t.includes("long-sleeve")
    ) return "longsleeve";
    return "shirts";
  }

  // Title-based fallback for empty or unrecognized product_types.
  // Covers "(empty)" type → "Heavyweight Core Short" → shorts,
  // and collab types → "Garment-Dyed Logo Tee" → shirts.
  if (t.includes("jacket") || t.includes("coat") || t.includes("windbreaker")) return "jackets";
  if (t.includes("hoodie")) return "hoodies";
  if (t.includes("zip")) return "zips";
  if (
    t.includes("long sleeve") || t.includes("longsleeve") || t.includes("long-sleeve")
  ) return "longsleeve";
  if (t.includes("sweater") || t.includes("crewneck")) return "sweaters";
  if (t.includes("short")) return "shorts";
  if (t.includes("pant") || t.includes("jogger")) return "pants";
  if (t.includes("shirt") || t.includes("tee")) return "shirts";

  return null;
}
