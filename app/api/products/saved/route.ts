import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { internalMarkerExclusions } from "@/lib/public-visibility";
import type { SizeVariant, Colorway, Seller } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/products/saved?ids=brand:externalId,brand:externalId,...
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("ids") ?? "";
  if (!raw) return NextResponse.json({ products: [] });

  const pairs = raw.split(",").map((s) => {
    const idx = s.indexOf(":");
    return { brand: s.slice(0, idx), externalId: s.slice(idx + 1) };
  }).filter((p) => p.brand && p.externalId);

  if (pairs.length === 0) return NextResponse.json({ products: [] });

  const rawProducts = await prisma.product.findMany({
    where: {
      AND: [
        { OR: pairs.map((p) => ({ brand: p.brand, externalId: p.externalId })) },
        ...internalMarkerExclusions(),
      ],
      category: { not: null },
    },
  });

  const products = rawProducts.map((p) => ({
    ...p,
    sizes: JSON.parse(p.sizes) as SizeVariant[],
    colorways: JSON.parse(p.colorways) as Colorway[],
    sellers: JSON.parse(p.sellers) as Seller[],
  }));

  return NextResponse.json({ products });
}
