import type { AppCategory } from "@/types";

// Paige is a premium denim brand. We ingest men's denim jeans only — Phase 1.
//
// product_type is always "Fashion" or "Exclusive" across all Paige products — not useful.
// Categorization is driven exclusively by the clothingType:* tag.
//
// Men's denim audit (shop.paige.com, 2026-06-04):
//   clothingType:Jeans                  195 → 190 real denim, 5 non-denim (see below)
//   clothingType:Shirt Or Blouse         14 → excluded (Phase 2 candidate)
//   clothingType:Pant                     8 → excluded (Phase 2 candidate)
//   clothingType:Shorts                   7 → excluded (Phase 2 candidate)
//   clothingType:Tank Or Tee              6 → excluded (Phase 2 candidate)
//   clothingType:Jacket                   4 → excluded (Phase 2 candidate)
//
// Non-denim tagged clothingType:Jeans (excluded by title):
//   Macneil Slim Straight Pant ×3:  chino/pant line — "Pant" in title
//   Stafford Trouser ×2:            trouser — "Trouser" in title
//
// Inseam structure: Paige sells each inseam (30/32/34/37 inch) as a separate Shopify product.
//   195 denim products → 174 unique colorways; 21 appear in both 32" and 34" inseam.
//   Decision: ingest all 195 (see 2026-06-04 session) — user sees inseam in title.
//
// Domain note: paige.com is behind Vercel bot protection (429); paige.myshopify.com is
// password-protected (401). shop.paige.com is the accessible Shopify JSON endpoint.

export function isExcludedPaigeProduct(tags: string[], title: string): boolean {
  // Only ingest clothingType:Jeans products
  if (!tags.includes("clothingType:Jeans")) return true;
  // Macneil Slim Straight Pant and Stafford Trouser are incorrectly tagged clothingType:Jeans
  if (/\bPant\b/.test(title) || /\bTrouser\b/.test(title)) return true;
  return false;
}

export function lookupPaigeCategory(): AppCategory | null {
  // All products that passed isExcludedPaigeProduct are men's denim jeans.
  return "denim";
}
