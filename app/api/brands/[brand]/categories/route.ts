import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BRAND_KEYS } from "@/lib/config/brands";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ brand: string }> }
) {
  const { brand } = await params;

  if (!BRAND_KEYS.includes(brand)) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const rows = await prisma.product.groupBy({
    by: ["category"],
    where: { brand, inStock: true, category: { not: null } },
    _count: { category: true },
  });

  const categories = rows.map((r) => ({
    category: r.category,
    count: r._count.category,
  }));

  const total = categories.reduce((sum, c) => sum + c.count, 0);

  return NextResponse.json({ brand, total, categories });
}
