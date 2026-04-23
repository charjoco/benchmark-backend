import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const article = await prisma.article.findUnique({
    where: { id, isActive: true },
    select: {
      id: true,
      title: true,
      subtitle: true,
      body: true,
      publishedAt: true,
      images: {
        orderBy: { position: "asc" },
        select: { id: true, imageUrl: true, altText: true, position: true },
      },
      products: {
        orderBy: { position: "asc" },
        select: {
          position: true,
          product: {
            select: {
              id: true,
              title: true,
              brand: true,
              price: true,
              imageUrl: true,
              category: true,
              inStock: true,
            },
          },
        },
      },
    },
  });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: article.id,
    title: article.title,
    subtitle: article.subtitle,
    body: article.body,
    publishedAt: article.publishedAt,
    images: article.images,
    products: article.products.map((ap) => ap.product),
  });
}
