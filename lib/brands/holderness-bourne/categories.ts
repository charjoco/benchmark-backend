import type { AppCategory } from "@/types";

// Non-apparel product types — excluded entirely.
const HB_EXCLUDED_PRODUCT_TYPES = new Set([
  "accessories hats",
  "accessories bags",
  "accessories belts",
  "other",                     // H&B x Tremont golf covers, Van Pelt Blanket, Tervis tumbler
  "merchandising accessories", // tour towels, gift boxes
  "e-gift card",
]);

// Boys product types all start with "boys" (Boys Shirts Polos, Boys Layering Pullovers, etc.)
function isHBBoysType(productType: string): boolean {
  return productType.toLowerCase().trim().startsWith("boys");
}

// U.S. Open licensed merchandise — title-based exclusion.
// Covers: "2026 U.S. Open Anderson Shirt", "2026 U.S. Open Swenson Vest", etc.
function isHBExcludedTitle(title: string): boolean {
  return title.toLowerCase().includes("u.s. open");
}

export function isExcludedHBProductType(productType: string, title = ""): boolean {
  const normalized = productType.toLowerCase().trim();
  if (HB_EXCLUDED_PRODUCT_TYPES.has(normalized)) return true;
  if (isHBBoysType(productType)) return true;
  if (isHBExcludedTitle(title)) return true;
  return false;
}

export function lookupHBCategory(productType: string, title = ""): AppCategory | null {
  const pt = productType.toLowerCase().trim();
  const t = title.toLowerCase();

  // Direct type → category mappings
  if (pt === "mens shirts polos") return "polos";
  if (pt === "mens shirts button downs") return "shirts";
  if (pt === "mens shirts t-shirts") return "shirts";
  if (pt === "mens outerwear jackets") return "jackets";
  if (pt === "mens outerwear vests") return "vests";
  if (pt === "mens bottoms pants") return "pants";

  // Mens Bottoms Shorts: most items are shorts, but the Anson Chino Pant lives here too.
  if (pt === "mens bottoms shorts") {
    if (t.includes("pant") || t.includes("chino") || t.includes("trouser")) return "pants";
    return "shorts";
  }

  // Mens Layering Pullovers (79 items) and Mens Layering Sweaters (34 items):
  // both span multiple destinations — dispatch by title keyword.
  // zip/snap checked BEFORE hoodie so "Tilley Quarter-Zip Hoodie" → zips (not hoodies).
  if (pt === "mens layering pullovers" || pt === "mens layering sweaters") {
    if (t.includes("zip") || t.includes("snap")) return "zips";
    if (t.includes("hoodie")) return "hoodies";
    if (t.includes("crewneck")) return "sweaters";
    // Layering Sweaters default: remaining items (Berwick/Buckley/Ward without "crewneck"
    // in Yale-branded titles) are crewneck sweaters — safe fallback.
    if (pt === "mens layering sweaters") return "sweaters";
    return null;
  }

  // Title override: "polo" in title → polos (catches any polo in an unrecognized type).
  if (t.includes("polo")) return "polos";

  return null;
}
