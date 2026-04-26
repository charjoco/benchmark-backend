import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      _count: { select: { products: true } },
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
