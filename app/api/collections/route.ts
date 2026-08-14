import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_PRODUCT_WHERE } from "@/lib/public-visibility";

export const dynamic = "force-dynamic";

export async function GET() {
  const collections = await prisma.collection.findMany({
    where: { isActive: true },
    orderBy: { lastEditedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      heroImageUrl: true,
      heroProduct: {
        select: { id: true, title: true, imageUrl: true },
      },
      // Count only what the detail endpoint will actually serve, so the tile's count can't
      // promise more products than the collection page renders.
      _count: { select: { products: { where: { product: PUBLIC_PRODUCT_WHERE } } } },
    },
  });

  return NextResponse.json({
    collections: collections.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      heroImageUrl: c.heroImageUrl,
      heroProduct: c.heroProduct,
      productCount: c._count.products,
    })),
  });
}
