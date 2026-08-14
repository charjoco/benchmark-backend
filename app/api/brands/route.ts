import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BRANDS } from "@/lib/config/brands";
import { PUBLIC_PRODUCT_WHERE } from "@/lib/public-visibility";

export const dynamic = "force-dynamic";

// B3 — active brand roster with live counts: GET /api/brands
// Replaces benchmark-web's mirrored copy of the brand registry (dead-documentation drift by
// design). The scrape registry is the source of truth for WHICH brands exist; the catalog is
// the source of truth for how many products each currently has.
//
// Counts use the same visibility rule as the public feed (in stock, categorised) so a brand's
// count matches what /api/products?brand=<key> actually returns.

export async function GET() {
  const rows = await prisma.product.groupBy({
    by: ["brand"],
    where: { ...PUBLIC_PRODUCT_WHERE, inStock: true, category: { not: null } },
    _count: { _all: true },
  });

  const counts = new Map(rows.map((r) => [r.brand, r._count._all]));

  const brands = BRANDS.map((b) => ({
    brandKey: b.brandKey,
    displayName: b.displayName,
    productCount: counts.get(b.brandKey) ?? 0,
  }))
    // A configured brand with nothing live (mid-onboarding, or a scrape that hasn't landed)
    // is not a browsable destination — omit it rather than render an empty grid tile.
    .filter((b) => b.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount);

  return NextResponse.json({ brands, total: brands.length });
}
