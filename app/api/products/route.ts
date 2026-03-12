import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SizeVariant } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const category = searchParams.get("category") || undefined;
  const brands = searchParams.getAll("brand");
  const onSale = searchParams.get("onSale") === "true";
  const isNew = searchParams.get("isNew") === "true";
  const colors = searchParams.getAll("color");
  const minPrice = parseFloat(searchParams.get("minPrice") || "0");
  const maxPrice = parseFloat(searchParams.get("maxPrice") || "9999");
  const sortBy = searchParams.get("sortBy") || "lastSeenAt";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = 48;

  const where = {
    inStock: true,
    ...(category && { category }),
    ...(brands.length > 0 && { brand: { in: brands } }),
    ...(onSale && { onSale: true }),
    ...(isNew && { isNew: true }),
    ...(colors.length > 0 && { colorBucket: { in: colors } }),
    price: { gte: minPrice, lte: maxPrice },
  };

  const orderBy =
    sortBy === "price_asc"
      ? { price: "asc" as const }
      : sortBy === "price_desc"
        ? { price: "desc" as const }
        : sortBy === "newest"
          ? { firstSeenAt: "desc" as const }
          : { lastSeenAt: "desc" as const };

  const [rawProducts, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  const products = rawProducts.map((p) => ({
    ...p,
    sizes: JSON.parse(p.sizes) as SizeVariant[],
  }));

  return NextResponse.json({
    products,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
