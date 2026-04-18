import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const q = searchParams.get("q")?.trim() || undefined;
  const brands = searchParams.getAll("brand").filter(Boolean);
  const categories = searchParams.getAll("category").filter(Boolean);
  const newOnly = searchParams.get("newOnly") === "true";

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const products = await prisma.product.findMany({
    where: {
      inStock: true,
      ...(q && { title: { contains: q, mode: "insensitive" } }),
      ...(brands.length > 0 && { brand: { in: brands } }),
      ...(categories.length > 0 && { category: { in: categories } }),
      ...(newOnly && { firstSeenAt: { gte: sevenDaysAgo } }),
    },
    select: {
      id: true,
      title: true,
      brand: true,
      price: true,
      imageUrl: true,
      category: true,
      inStock: true,
      isNew: true,
      isHidden: true,
    },
    orderBy: { lastSeenAt: "desc" },
    take: 48,
  });

  return NextResponse.json({ products });
}
