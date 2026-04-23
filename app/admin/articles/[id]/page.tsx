import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BRANDS } from "@/lib/config/brands";
import { ArticleEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function ArticleEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      products: {
        orderBy: { position: "asc" },
        include: {
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

  if (!article) notFound();

  const serialized = {
    id: article.id,
    title: article.title,
    subtitle: article.subtitle,
    body: article.body,
    isActive: article.isActive,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    lastEditedAt: article.lastEditedAt.toISOString(),
    lastEditedBy: article.lastEditedBy,
    images: article.images.map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      altText: img.altText,
      position: img.position,
    })),
    products: article.products.map((ap) => ({
      productId: ap.productId,
      position: ap.position,
      product: ap.product,
    })),
  };

  const allowlist = (process.env.ADMIN_ALLOWLIST_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const names = ["Jason", "Heather"];
  const editorNames = Object.fromEntries(
    allowlist.map((uid, i) => [uid, names[i] ?? `user ${i + 1}`])
  );

  const brands = BRANDS.map((b) => ({
    brandKey: b.brandKey,
    displayName: b.displayName,
  }));

  return (
    <ArticleEditor
      article={serialized}
      currentUserId={user?.id ?? null}
      editorNames={editorNames}
      brands={brands}
    />
  );
}
