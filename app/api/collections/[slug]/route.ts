import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const collection = await prisma.collection.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      products: {
        orderBy: { position: "asc" },
        select: {
          position: true,
          product: {
            select: {
              id: true,
              brand: true,
              title: true,
              handle: true,
              productUrl: true,
              category: true,
              colorName: true,
              colorBucket: true,
              imageUrl: true,
              price: true,
              compareAtPrice: true,
              onSale: true,
              colorways: true,
              sellers: true,
              colorBuckets: true,
              sizes: true,
              inStock: true,
              isNew: true,
              firstSeenAt: true,
              lastSeenAt: true,
              priceDroppedAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  if (!collection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    products: collection.products.map((cp) => ({
      ...cp.product,
      colorways: JSON.parse(cp.product.colorways),
      sellers: JSON.parse(cp.product.sellers),
      sizes: JSON.parse(cp.product.sizes),
      firstSeenAt: cp.product.firstSeenAt.toISOString(),
      lastSeenAt: cp.product.lastSeenAt.toISOString(),
      priceDroppedAt: cp.product.priceDroppedAt?.toISOString() ?? null,
      updatedAt: cp.product.updatedAt.toISOString(),
    })),
  });
}
