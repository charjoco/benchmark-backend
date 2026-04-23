import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const articles = await prisma.article.findMany({
    where: { isActive: true },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      subtitle: true,
      publishedAt: true,
      images: {
        orderBy: { position: "asc" },
        take: 1,
        select: { imageUrl: true, altText: true },
      },
      _count: { select: { products: true } },
    },
  });

  const response = articles.map((a) => ({
    id: a.id,
    title: a.title,
    subtitle: a.subtitle,
    publishedAt: a.publishedAt,
    heroImage: a.images[0] ?? null,
    productCount: a._count.products,
  }));

  return NextResponse.json({ articles: response });
}
