"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createArticle() {
  const userId = await getCurrentUserId();

  const article = await prisma.article.create({
    data: { title: "New Article", lastEditedBy: userId },
  });

  redirect(`/admin/articles/${article.id}`);
}

// ── Save (combined title + subtitle + body) ───────────────────────────────────

export async function saveArticle(
  id: string,
  data: { title: string; subtitle: string; body: string }
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  await prisma.article.update({
    where: { id },
    data: {
      title: data.title.trim() || "Untitled Article",
      subtitle: data.subtitle.trim() || null,
      body: data.body,
      lastEditedBy: userId,
    },
  });

  revalidatePath(`/admin/articles/${id}`);
  revalidatePath("/admin/articles");
  return {};
}

// ── Metadata (kept for granular use) ─────────────────────────────────────────

export async function updateArticleMeta(
  id: string,
  data: { title: string; subtitle: string }
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  await prisma.article.update({
    where: { id },
    data: {
      title: data.title.trim() || "Untitled Article",
      subtitle: data.subtitle.trim() || null,
      lastEditedBy: userId,
    },
  });

  revalidatePath(`/admin/articles/${id}`);
  revalidatePath("/admin/articles");
  return {};
}

// ── Body (kept for granular use) ──────────────────────────────────────────────

export async function updateArticleBody(
  id: string,
  body: string
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  await prisma.article.update({
    where: { id },
    data: { body, lastEditedBy: userId },
  });

  revalidatePath(`/admin/articles/${id}`);
  return {};
}

// ── Active / draft ────────────────────────────────────────────────────────────

export async function setArticleActive(
  id: string,
  active: boolean
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  // publishedAt is set on first activation only — never overwritten on subsequent toggles
  const existing = await prisma.article.findUnique({
    where: { id },
    select: { publishedAt: true },
  });

  await prisma.article.update({
    where: { id },
    data: {
      isActive: active,
      ...(active && !existing?.publishedAt ? { publishedAt: new Date() } : {}),
      lastEditedBy: userId,
    },
  });

  revalidatePath(`/admin/articles/${id}`);
  revalidatePath("/admin/articles");
  return {};
}

// ── Images ────────────────────────────────────────────────────────────────────

export async function addImageToArticle(
  articleId: string,
  data: { imageUrl: string; altText: string }
): Promise<{
  image?: { id: string; imageUrl: string; altText: string | null; position: number };
  error?: string;
}> {
  const userId = await getCurrentUserId();

  const count = await prisma.articleImage.count({ where: { articleId } });
  if (count >= 3) {
    return { error: "Articles cannot have more than 3 images." };
  }

  const image = await prisma.articleImage.create({
    data: {
      articleId,
      imageUrl: data.imageUrl,
      altText: data.altText || null,
      position: count,
    },
    select: { id: true, imageUrl: true, altText: true, position: true },
  });

  await prisma.article.update({
    where: { id: articleId },
    data: { lastEditedBy: userId },
  });

  revalidatePath(`/admin/articles/${articleId}`);
  return { image };
}

export async function updateImageAltText(
  imageId: string,
  altText: string
): Promise<{ error?: string }> {
  await prisma.articleImage.update({
    where: { id: imageId },
    data: { altText: altText.trim() || null },
  });
  return {};
}

export async function removeImageFromArticle(
  articleId: string,
  imageId: string
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  await prisma.articleImage.delete({ where: { id: imageId } });

  const remaining = await prisma.articleImage.findMany({
    where: { articleId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  await Promise.all(
    remaining.map((img, i) =>
      prisma.articleImage.update({ where: { id: img.id }, data: { position: i } })
    )
  );

  await prisma.article.update({
    where: { id: articleId },
    data: { lastEditedBy: userId },
  });

  revalidatePath(`/admin/articles/${articleId}`);
  return {};
}

export async function reorderArticleImages(
  articleId: string,
  orderedImageIds: string[]
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  await Promise.all(
    orderedImageIds.map((imageId, position) =>
      prisma.articleImage.update({ where: { id: imageId }, data: { position } })
    )
  );

  await prisma.article.update({
    where: { id: articleId },
    data: { lastEditedBy: userId },
  });

  revalidatePath(`/admin/articles/${articleId}`);
  return {};
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function addProductToArticle(
  articleId: string,
  productId: string
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  const count = await prisma.articleProduct.count({ where: { articleId } });
  if (count >= 5) {
    return { error: "Articles cannot have more than 5 attached products." };
  }

  await prisma.articleProduct.create({
    data: { articleId, productId, position: count },
  });

  await prisma.article.update({
    where: { id: articleId },
    data: { lastEditedBy: userId },
  });

  revalidatePath(`/admin/articles/${articleId}`);
  return {};
}

export async function removeProductFromArticle(
  articleId: string,
  productId: string
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  await prisma.articleProduct.delete({
    where: { articleId_productId: { articleId, productId } },
  });

  const remaining = await prisma.articleProduct.findMany({
    where: { articleId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  await Promise.all(
    remaining.map((ap, i) =>
      prisma.articleProduct.update({ where: { id: ap.id }, data: { position: i } })
    )
  );

  await prisma.article.update({
    where: { id: articleId },
    data: { lastEditedBy: userId },
  });

  revalidatePath(`/admin/articles/${articleId}`);
  return {};
}

export async function reorderArticleProducts(
  articleId: string,
  orderedProductIds: string[]
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  await Promise.all(
    orderedProductIds.map((productId, position) =>
      prisma.articleProduct.update({
        where: { articleId_productId: { articleId, productId } },
        data: { position },
      })
    )
  );

  await prisma.article.update({
    where: { id: articleId },
    data: { lastEditedBy: userId },
  });

  revalidatePath(`/admin/articles/${articleId}`);
  return {};
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteArticle(id: string) {
  await prisma.article.delete({ where: { id } });
  revalidatePath("/admin/articles");
  redirect("/admin/articles");
}
