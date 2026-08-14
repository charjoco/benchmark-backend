import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_PRODUCT_WHERE } from "@/lib/public-visibility";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.product.groupBy({
    by: ["category"],
    where: { ...PUBLIC_PRODUCT_WHERE, inStock: true, category: { not: null } },
    _count: { category: true },
  });

  const categories = rows.map((r) => ({
    category: r.category,
    count: r._count.category,
  }));

  const total = categories.reduce((sum, c) => sum + c.count, 0);

  return NextResponse.json({ total, categories });
}
