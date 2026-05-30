// Vuori category resolution.
//
// Vuori uses mostly English product_type names. Three types need title dispatch:
//
//   "Tops" — multi-destination: hoodies, zips, polos, long-sleeve, or short-sleeve tees.
//     Sleeveless items (muscle, sleeveless, tank in title) are excluded upstream by
//     isExcludedVuoriProductType(). Items that reach lookupVuoriCategory() need only
//     the hoodie/zip/polo/LS/SS resolution.
//
//   "Jackets & Hoodies" — multi-destination: jackets, zips, hoodies, polos, or pants.
//     Resolution order: jackets → zips → hoodies → polos → pants → null (vision).
//     Vests handled upstream by shared /\bvests?\b/i rule in resolveCategory before this runs.
//
//   "Button Down" — long-sleeve vs. short-sleeve dispatch only.
//
// Exclusions:
//   - VUORI_EXCLUDED_PRODUCT_TYPES: non-apparel and out-of-scope types.
//   - isVuoriTailoredBlazer: title-based blazer exclusion (e.g. Genessee Blazer).
//     Per editorial decision 2026-05-21.
//   - isVuoriSleeveless: title-based exclusion for muscle tees and sleeveless items
//     arriving via the "Tops" type.

import type { AppCategory } from "@/types";

export const VUORI_EXCLUDED_PRODUCT_TYPES = new Set([
  // Headwear, bags, and non-apparel
  "headwear",
  "accessories",
  "bags",
  // Sleeveless — excluded entirely per editorial decision 2026-05-21
  "tanks",
  // Women's-only types (safety net beyond tag filtering)
  "leggings",
  // Footwear and underpinnings
  "shoes",
  "boxers & briefs",
  // Swim exclusions
  "water tops",
  // Internal / non-product types
  "printables",
  "",
]);

// Tailored blazers (e.g. "Genessee Blazer") can arrive in Tops or other shared types.
// Excluded per editorial decision 2026-05-21.
function isVuoriTailoredBlazer(title: string): boolean {
  return /\bblazers?\b/i.test(title);
}

// Sleeveless items (muscle tees, tank tops) arrive in the "Tops" type.
// Exclude by title so they never reach category resolution.
function isVuoriSleeveless(title: string): boolean {
  return /\b(muscle|sleeveless|tank)\b/i.test(title);
}

// "Jackets & Hoodies" spans outerwear (shells, anoraks), zips, hoodies, and edge cases
// (pollos, pants/snow pants). Vests are handled upstream by the shared /\bvests?\b/i rule
// in resolveCategory before this function is ever reached.
// Returns null for anything not deterministically resolvable — falls to vision.
function resolveJacketsHoodies(title: string): AppCategory | null {
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
  if (t.includes("hoodie") || t.includes("pullover")) return "hoodies";
  if (t.includes("polo")) return "polos";
  if (t.includes("pant") || t.includes("trouser") || t.includes("jogger")) return "pants";
  return null;
}

// Direct product_type → AppCategory for single-destination types.
// All keys are lowercase to match normalized lookup.
const MAP: Record<string, AppCategory> = {
  "shorts":       "shorts",
  "boardshorts":  "shorts",    // editorial decision: Boardshorts → shorts (2026-05-21)
  "pants":        "pants",
  "joggers":      "pants",
  "sweaters":     "sweaters",
  "graphic tees": "shirts",
};

export function isExcludedVuoriProductType(productType: string, title = ""): boolean {
  const normalized = productType.toLowerCase().trim();
  if (VUORI_EXCLUDED_PRODUCT_TYPES.has(normalized)) return true;
  if (isVuoriTailoredBlazer(title)) return true;
  if (normalized === "tops" && isVuoriSleeveless(title)) return true;
  return false;
}

/**
 * Look up the AppCategory for a Vuori product.
 * Returns null for unrecognized types — caller falls through to vision.
 */
export function lookupVuoriCategory(
  productType: string,
  _tags: string[] = [],
  title = ""
): AppCategory | null {
  const normalized = productType.toLowerCase().trim();
  const t = title.toLowerCase();

  // "Tops" (and "TOPS") — multi-destination dispatch.
  // Sleeveless items already excluded upstream by isExcludedVuoriProductType().
  // Resolution order: hoodies → zips → polos → longsleeve → sweaters → shirts.
  // "sweater" / "sweatshirt" / " crew" catches crew sweaters (e.g. "Waffle Crew",
  // "Cypress Crew", "Berik Cashmere Sweater") that Vuori tags as "Tops" not "Sweaters".
  // Space-prefix on " crew" avoids matching "Crew Neck Tee" (starts with "crew").
  if (normalized === "tops") {
    if (t.includes("hoodie") || t.includes("pullover")) return "hoodies";
    if (t.includes("zip") || t.includes("quarter-zip") || t.includes("half-zip")) return "zips";
    if (t.includes("polo")) return "polos";
    if (t.includes("long sleeve") || t.includes("longsleeve") || t.includes("long-sleeve")) return "longsleeve";
    if (t.includes("sweater") || t.includes("sweatshirt") || t.includes(" crew")) return "sweaters";
    return "shirts";
  }

  // "Jackets & Hoodies" — full title dispatch
  if (normalized === "jackets & hoodies") {
    return resolveJacketsHoodies(title);
  }

  // "Button Down" — LS vs short-sleeve dispatch.
  // "long-sleeve" hyphen variant covers future defensive cases.
  // "plaid" signals flannel/woven LS fabric (verified: zero SS plaids in Button Down type).
  if (normalized === "button down") {
    if (t.includes("long sleeve") || t.includes("longsleeve") || t.includes("long-sleeve")) return "longsleeve";
    if (t.includes("plaid")) return "longsleeve";
    return "shirts";
  }

  return MAP[normalized] ?? null;
}
