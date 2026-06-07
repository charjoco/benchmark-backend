import type { AppCategory } from "@/types";

// Paige is a premium denim brand. We ingest men's denim jeans only — Phase 1.
//
// product_type is always "Fashion" or "Exclusive" across all Paige products — not useful.
// Categorization is driven exclusively by the clothingType:* tag.
//
// Men's denim audit (shop.paige.com, 2026-06-04):
//   clothingType:Jeans                  195 → 193 real denim, 2 non-denim (see below)
//   clothingType:Shirt Or Blouse         14 → excluded (Phase 2 candidate)
//   clothingType:Pant                     8 → excluded (Phase 2 candidate)
//   clothingType:Shorts                   7 → excluded (Phase 2 candidate)
//   clothingType:Tank Or Tee              6 → excluded (Phase 2 candidate)
//   clothingType:Jacket                   4 → excluded (Phase 2 candidate)
//
// clothingType:Jeans non-denim exclusions (by title — confirmed via fabric tags):
//   Stafford Trouser ×2:  non-denim (Rayon/Nylon/Spandex, tag: category:Non Denim Bottoms)
//   Macneil Slim Straight Pant ×3: KEPT — fabric:Denim Fabric, category:Denim Bottoms
//
// Inseam structure: Paige sells each inseam (30/32/34/37 inch) as a separate Shopify product.
//   193 denim products → 174 unique colorways; 19 appear in both 32" and 34" inseam.
//   Decision: deduplicate per colorway — keep the 32" inseam (closest to 32 wins).
//
// Domain note: paige.com is behind Vercel bot protection (429); paige.myshopify.com is
// password-protected (401). shop.paige.com is the accessible Shopify JSON endpoint.

export function isExcludedPaigeProduct(tags: string[], title: string): boolean {
  // Only ingest clothingType:Jeans products
  if (!tags.includes("clothingType:Jeans")) return true;
  // Stafford Trouser is non-denim (Rayon/Nylon/Spandex, category:Non Denim Bottoms) → exclude
  // Macneil Slim Straight Pant IS denim (fabric:Denim Fabric, category:Denim Bottoms) → keep
  if (/\bTrouser\b/.test(title)) return true;
  return false;
}

export function lookupPaigeCategory(): AppCategory | null {
  // All products that passed isExcludedPaigeProduct are men's denim jeans.
  return "denim";
}
