import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SizeVariant, Colorway } from "@/types";

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
    where: { OR: pairs.map((p) => ({ brand: p.brand, externalId: p.externalId })) },
  });

  const products = rawProducts.map((p) => ({
    ...p,
    sizes: JSON.parse(p.sizes) as SizeVariant[],
    colorways: JSON.parse(p.colorways) as Colorway[],
  }));

  return NextResponse.json({ products });
}
