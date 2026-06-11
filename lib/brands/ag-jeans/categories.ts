import type { AppCategory } from "@/types";

// AG Jeans uses 6 broad product types. We keep only MENS BOTTOMS, and within
// that type only jeans (not chinos, shorts, trousers). Two conditions required:
//   1. product_type === "MENS BOTTOMS"
//   2. tag "Category:Jeans" OR "jean" in title
//
// Tag-reliability cross-check (2026-06-03, 215 MENS BOTTOMS products):
//   Tagged Category:Jeans:    215 products
//   jean/denim in title:      213 products
//   Tagged but no jean/denim title (4): Tellis SUD Pant, Protégé (×2), Archie Selvage Trouser
//     → All have Material:Denim tag. Genuine denim products with non-"jean" style names. KEEP.
//   jean/denim in title but no tag (2): Everett Jean, Tellis Jean
//     → AG tagging gap. Caught by title-fallback OR condition. KEEP.
//
// Non-jeans MENS BOTTOMS (excluded): Category:Pants (106), Category:Shorts (27),
//   and 4 untagged products.
//
// BUNDLED color: 4 products (Everett/Graduate/Dylan/Tellis 360° Jean) sold in bundle
//   deals carry color="BUNDLED" — a placeholder with no specific colorway. These reach
//   the DB with a null colorBucket. Not excluded here (they ARE real jeans); they log
//   as UnknownColor and can be cleaned up in a backfill if desired.

const AG_KEEP_TYPES = new Set(["mens bottoms"]);

export function isExcludedAGProductType(productType: string): boolean {
  return !AG_KEEP_TYPES.has(productType.toLowerCase().trim());
}

// Hard-gate secondary filter, called from isExcludedProductType after the type check passes.
// Within MENS BOTTOMS: keeps only jeans (Category:Jeans tag OR "jean" in title).
// Also hard-skips bundle-deal placeholder products (Color Name:BUNDLED / ColorCode:BLD tags).
// Returns true → hard-skip (no DB row, no vision attempt).
export function isExcludedAGBottomsTitle(tags: string[], title: string): boolean {
  // Bundle-deal exclusion — Color Name:BUNDLED tag is the definitive signal
  if (tags.some((t) => t === "Color Name:BUNDLED" || t === "ColorCode:BLD")) return true;
  const hasJeansTag = tags.some((t) => t === "Category:Jeans");
  const hasJeanInTitle = /\bjean\b/i.test(title);
  return !hasJeansTag && !hasJeanInTitle;
}

export function lookupAGCategory(_productType: string, _title = ""): AppCategory | null {
  // Only MENS BOTTOMS that passed the jeans filter reaches here.
  return "denim";
}
