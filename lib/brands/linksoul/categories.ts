import type { AppCategory } from "@/types";

// Non-apparel product types — excluded entirely.
// Hat type covers 34 products (17 unique hat styles). "return" is a Shopify junk
// listing ("Free Unlimited Return for $2.98 Valid in US."). All already visionFailed.
const LINKSOUL_EXCLUDED_PRODUCT_TYPES = new Set([
  "hat",
  "accessories",
  "sock",
  "gift cards",
  "shoe",
  "return",
]);

export function isExcludedLinksoulProductType(productType: string): boolean {
  return LINKSOUL_EXCLUDED_PRODUCT_TYPES.has(productType.toLowerCase().trim());
}

export function lookupLinksoulCategory(productType: string, title = ""): AppCategory | null {
  const pt = productType.toLowerCase().trim();
  const t = title.toLowerCase();

  // ── Direct mappings ──────────────────────────────────────────────────────
  if (pt === "polo") return "polos";
  if (pt === "pant") return "pants";
  if (pt === "short" || pt === "shorts") return "shorts";
  if (pt === "jacket" || pt === "outerwear") return "jackets";
  // Shacket = shirt-jacket hybrid; jackets is the closer bucket
  if (pt === "shacket") return "jackets";
  if (pt === "vest") return "vests";

  // Shirt and T-Shirt → shirts.
  // "Neptune Sweater Shirt" with product_type "Shirt" is handled here.
  if (pt === "shirt" || pt === "t-shirt") return "shirts";

  // Graphic Tee: nearly all are short-sleeve shirts.
  // "The Rip It Long Sleeve Tee" is the only longsleeve exception.
  if (pt === "graphic tee") {
    if (t.includes("long sleeve")) return "longsleeve";
    return "shirts";
  }

  // Layer — 17 unique titles spanning four destinations.
  // Dispatch order is strict per spec; "Overland Long Sleeve Crew" has "crew" → sweaters
  // (no longsleeve branch — "long sleeve" alone is not a Layer destination).
  // "Neptune Sweater Shirt" with product_type "Layer" hits the shirt branch here.
  if (pt === "layer") {
    if (t.includes("hoodie")) return "hoodies";
    if (t.includes("zip") || t.includes("snap")) return "zips";
    if (t.includes("shirt")) return "shirts";
    if (
      t.includes("crew")    ||
      t.includes("waffle")  ||
      t.includes("slub")    ||
      t.includes("brushed") ||
      t.includes("sweater") ||
      t.includes("fleece")
    ) return "sweaters";
    return null;
  }

  // Title safety net: "polo" anywhere in title → polos.
  // Catches any polo that lands in an unrecognized product type.
  if (t.includes("polo")) return "polos";

  return null;
}
