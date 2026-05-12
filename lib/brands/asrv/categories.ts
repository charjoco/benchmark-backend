import type { AppCategory } from "@/types";

// Known non-apparel product types that slip past ASRV's tag filters.
// Products with these types are skipped entirely — no vision call, no stub row.
export const ASRV_EXCLUDED_PRODUCT_TYPES = new Set([
  "hats & headwear",
  "accessories",
  "bags",
  "bags & packs",
  "custom box",
  "gift cards",
  "leggings",
  "sports bra",
  "socks",
  "underwear",
  "return,package_protection",
  "",
]);

// Direct product_type → AppCategory for ASRV's well-defined type strings.
// "Sweatshirts" is omitted here — it requires title disambiguation (see resolveSweatshirts).
// All keys are lowercase to match normalized lookup.
const MAP: Record<string, AppCategory> = {
  "shorts":      "shorts",
  "shirts":      "shirts",
  "tanks":       "shirts",
  "joggers":     "pants",
  "pants":       "pants",
  "outerwear":   "jackets",
  "long sleeve": "longsleeve",
};

// "Sweatshirts" product type covers hoodies, zips, and crewneck sweaters.
// Disambiguate via title keywords.
function resolveSweatshirts(title: string): AppCategory {
  const t = title.toLowerCase();
  if (t.includes("hoodie") || t.includes("hooded")) return "hoodies";
  if (t.includes("zip")) return "zips";
  return "sweaters";
}

/**
 * Look up the AppCategory for an ASRV product_type string.
 * Title is required for Sweatshirts disambiguation; optional elsewhere.
 * Returns null for unmapped types (unknown future types fall through to vision).
 * Call ASRV_EXCLUDED_PRODUCT_TYPES.has() first to short-circuit non-apparel.
 */
export function lookupAsrvCategory(productType: string, _tags: string[] = [], title = ""): AppCategory | null {
  const normalized = productType.toLowerCase().trim();
  if (normalized === "sweatshirts") return resolveSweatshirts(title);
  return MAP[normalized] ?? null;
}
