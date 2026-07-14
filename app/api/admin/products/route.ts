import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const q = searchParams.get("q")?.trim() || undefined;
  const brands = searchParams.getAll("brand").filter(Boolean);
  const categories = searchParams.getAll("category").filter(Boolean);
  const newOnly = searchParams.get("newOnly") === "true";
  const minPrice = parseFloat(searchParams.get("minPrice") || "");
  const maxPrice = parseFloat(searchParams.get("maxPrice") || "");
  const sort = searchParams.get("sort") || "newest";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const PAGE_SIZE = 48;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Additive sort support (admin-only). "newest" preserves the prior lastSeenAt ordering.
  const orderBy =
    sort === "price_asc"
      ? { price: "asc" as const }
      : sort === "price_desc"
        ? { price: "desc" as const }
        : sort === "brand"
          ? { brand: "asc" as const }
          : { lastSeenAt: "desc" as const };

  const priceFilter =
    !Number.isNaN(minPrice) || !Number.isNaN(maxPrice)
      ? {
          price: {
            ...(!Number.isNaN(minPrice) && { gte: minPrice }),
            ...(!Number.isNaN(maxPrice) && { lte: maxPrice }),
          },
        }
      : {};

  const where = {
    inStock: true,
    ...(q && { title: { contains: q, mode: "insensitive" as const } }),
    ...(brands.length > 0 && { brand: { in: brands } }),
    ...(categories.length > 0 && { category: { in: categories } }),
    ...(newOnly && { firstSeenAt: { gte: sevenDaysAgo } }),
    ...priceFilter,
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
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
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products,
    total,
    page,
    pageSize: PAGE_SIZE,
    hasMore: page * PAGE_SIZE < total,
  });
}
