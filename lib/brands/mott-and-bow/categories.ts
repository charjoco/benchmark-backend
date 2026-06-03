import type { AppCategory } from "@/types";

// Mott & Bow is a jeans-first brand. We ingest men's jeans only.
// Product type encodes gender: "Mens-jeans" is the single keep type.
// Every other type — all Womens-*, Mens-tees, Mens-pants, Mens-shorts,
// Mens-underwear, Mens-pajamas, Mens-swims, Mens-sweaters, Mens-shirts,
// Mens-jackets, Mens-sweats, Womens-lounge, empty, membership, Gift Cards —
// is excluded.

const MB_KEEP_TYPES = new Set(["mens-jeans"]);

export function isExcludedMBProductType(productType: string, title = ""): boolean {
  if (!MB_KEEP_TYPES.has(productType.toLowerCase().trim())) return true;
  // Bundle check at type level so packs are skipped entirely (no DB row, no vision attempt).
  // Catches "3-Pack Jeans", "2-pack Jeans", "Bundle: Weekly Rotation Pack", etc.
  if (/\b(pack|bundle)\b/i.test(title)) return true;
  return false;
}

// Bundle exclusion: multi-jean packs are sold as single Shopify products.
// Two signals identify them:
//   1. Title contains "Pack" or "Bundle" (e.g. "3-Pack Jeans", "Weekly Rotation Pack")
//   2. The Color option value has 3 or more "/" segments (e.g. "Light Blue/Dark Blue/Black")
//      — indicating 3+ individual jeans colors in one SKU.
//
// Note: "Light/Medium Blue" and "Medium/Dark Blue" are single-color wash names
// (2-part slash), not bundles. They're caught by explicit brand dict entries in colors.ts,
// not here. The 3+ segment check only fires on genuine multi-jean bundles.
export function isExcludedMBBundle(title: string, colorValue?: string): boolean {
  if (/\b(pack|bundle)\b/i.test(title)) return true;
  if (colorValue) {
    const slashCount = (colorValue.match(/\//g) ?? []).length;
    if (slashCount >= 2) return true; // 3+ segments = multi-jean pack
  }
  return false;
}

export function lookupMBCategory(_productType: string, _title = ""): AppCategory | null {
  // Only "Mens-jeans" reaches this function (all others excluded upstream).
  // All remaining products are men's denim jeans.
  return "denim";
}
