import type { AppCategory } from "@/types";

// Known non-apparel product types that pass Greyson's mens tag filter.
// Products with these types are skipped entirely — no vision call, no stub row.
export const GREYSON_EXCLUDED_PRODUCT_TYPES = new Set([
  "caps",
  "headcovers",
  "mens shoes",
  "mens belts",
  "mens jumpsuits",
  "mens tights",
  "mens robe",
  "mens bundle",
  "welcome package",
]);

// Direct product_type → AppCategory for Greyson's well-defined type strings.
// All keys are lowercase to match normalized lookup.
// Returns null for unmapped types — caller falls through to rules + vision.
const MAP: Record<string, AppCategory> = {
  "mens polos":        "polos",
  "mens tshirts":      "shirts",
  "mens dress shirts": "shirts",
  "mens hoodies":      "hoodies",
  "mens crewnecks":    "sweaters",
  "mens sweaters":     "sweaters",
  "mens midlayers":    "zips",
  "mens jackets":      "jackets",
  "mens vests":        "vests",
  "mens shorts":       "shorts",
  "mens swimwear":     "shorts",
  "mens trousers":     "pants",
  "mens joggers":      "pants",
};

/**
 * Look up the AppCategory for a Greyson product_type string.
 * Returns null for unmapped types (unknown future types fall through to vision).
 * Call GREYSON_EXCLUDED_PRODUCT_TYPES.has() first to short-circuit non-apparel.
 */
export function lookupGreysonCategory(productType: string, _tags: string[] = [], _title = ""): AppCategory | null {
  return MAP[productType.toLowerCase().trim()] ?? null;
}
