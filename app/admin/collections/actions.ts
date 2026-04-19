"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "./utils";

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "collection";
  for (let i = 0; ; i++) {
    const candidate = i === 0 ? root : `${root}-${i}`;
    const existing = await prisma.collection.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
  }
}

// ── Create ──────────────────────────────────────────────────────────────────

export async function createCollection() {
  const userId = await getCurrentUserId();
  const slug = await ensureUniqueSlug(slugify("New Collection"));

  const collection = await prisma.collection.create({
    data: { name: "New Collection", slug, isActive: false, lastEditedBy: userId },
  });

  redirect(`/admin/collections/${collection.id}`);
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function updateCollectionMeta(
  id: string,
  data: { name: string; slug: string; description: string }
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  const trimmedSlug = data.slug.trim();
  const trimmedName = data.name.trim() || "Untitled Collection";

  const conflict = await prisma.collection.findUnique({
    where: { slug: trimmedSlug },
    select: { id: true },
  });
  if (conflict && conflict.id !== id) {
    return { error: "That slug is already taken by another collection." };
  }

  await prisma.collection.update({
    where: { id },
    data: {
      name: trimmedName,
      slug: trimmedSlug || slugify(trimmedName) || id,
      description: data.description.trim() || null,
      lastEditedBy: userId,
    },
  });

  revalidatePath(`/admin/collections/${id}`);
  revalidatePath("/admin/collections");
  return {};
}

// ── Active / draft ────────────────────────────────────────────────────────────

export async function setCollectionActive(
  id: string,
  active: boolean
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  if (active) {
    const activeCount = await prisma.collection.count({
      where: { isActive: true, NOT: { id } },
    });
    if (activeCount >= 5) {
      return {
        error:
          "Maximum 5 active collections. Deactivate one before activating another.",
      };
    }
  }

  await prisma.collection.update({
    where: { id },
    data: { isActive: active, lastEditedBy: userId },
  });

  revalidatePath(`/admin/collections/${id}`);
  revalidatePath("/admin/collections");
  return {};
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function addProductToCollection(
  collectionId: string,
  productId: string
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  const count = await prisma.collectionProduct.count({ where: { collectionId } });
  if (count >= 15) {
    return { error: "Collections cannot exceed 15 products." };
  }

  await prisma.collectionProduct.create({
    data: { collectionId, productId, position: count },
  });

  await prisma.collection.update({
    where: { id: collectionId },
    data: { lastEditedBy: userId },
  });

  revalidatePath(`/admin/collections/${collectionId}`);
  return {};
}

export async function removeProductFromCollection(
  collectionId: string,
  productId: string
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  await prisma.collectionProduct.delete({
    where: { collectionId_productId: { collectionId, productId } },
  });

  // Clear hero if the removed product was it
  const col = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { heroProductId: true },
  });
  await prisma.collection.update({
    where: { id: collectionId },
    data: {
      ...(col?.heroProductId === productId ? { heroProductId: null } : {}),
      lastEditedBy: userId,
    },
  });

  // Re-index positions to keep them dense (0, 1, 2, …)
  const remaining = await prisma.collectionProduct.findMany({
    where: { collectionId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  await Promise.all(
    remaining.map((cp, i) =>
      prisma.collectionProduct.update({ where: { id: cp.id }, data: { position: i } })
    )
  );

  revalidatePath(`/admin/collections/${collectionId}`);
  return {};
}

export async function setCollectionHero(
  collectionId: string,
  productId: string
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  const member = await prisma.collectionProduct.findUnique({
    where: { collectionId_productId: { collectionId, productId } },
  });
  if (!member) {
    return { error: "Product is not in this collection." };
  }

  await prisma.collection.update({
    where: { id: collectionId },
    data: { heroProductId: productId, lastEditedBy: userId },
  });

  revalidatePath(`/admin/collections/${collectionId}`);
  return {};
}

export async function reorderCollectionProducts(
  collectionId: string,
  orderedProductIds: string[]
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();

  await Promise.all(
    orderedProductIds.map((productId, position) =>
      prisma.collectionProduct.update({
        where: { collectionId_productId: { collectionId, productId } },
        data: { position },
      })
    )
  );

  await prisma.collection.update({
    where: { id: collectionId },
    data: { lastEditedBy: userId },
  });

  revalidatePath(`/admin/collections/${collectionId}`);
  return {};
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteCollection(id: string) {
  await prisma.collection.delete({ where: { id } });
  revalidatePath("/admin/collections");
  redirect("/admin/collections");
}
