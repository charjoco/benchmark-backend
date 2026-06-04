import type { AppCategory } from "@/types";

// DUER sells jeans, shorts, pants, shirts, and outerwear in one mixed catalog.
// We ingest men's jeans only → product_type === "Jeans".
//
// "base-product" tagged items are Shopify parent/placeholder products (one per style,
// no colorway assigned, no color_ tag, no title suffix). They appear alongside the
// actual colorway products in /products.json and must be excluded entirely — they
// carry no color data and would produce a colorName="Unknown" stub.
//
// Confirmed counts (2026-06-04, colorway items only, gender_mens):
//   type=Jeans:             14  → all ingested as denim
//   type=Shorts:            34  → excluded (Performance Denim shorts are shorts, not denim jeans)
//   type=Pants:             25  → excluded (Live Lite Chino, No Sweat, NuStretch 5-Pocket — no denim)
//   type=Shirts:             7  → excluded
//   type=Outerwear & Tops:   3  → excluded
//   type=Joggers:            1  → excluded
//   base-product items:    395  → excluded by tag (gender_mens present on 394 of them)

export function isExcludedDuerProductType(productType: string, tags: string[]): boolean {
  // Exclude Shopify base/parent placeholder products — no color data, no real inventory
  if (tags.includes("base-product")) return true;
  // Keep only jeans; every other type (Shorts, Pants, Shirts, Outerwear, Joggers) is excluded
  return productType.trim() !== "Jeans";
}

export function lookupDuerCategory(_productType: string): AppCategory | null {
  // Only type=Jeans that passed isExcludedDuerProductType reaches here.
  return "denim";
}
