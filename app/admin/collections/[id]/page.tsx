import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CollectionEditor } from "./editor";
import { BRANDS } from "@/lib/config/brands";

export const dynamic = "force-dynamic";

export default async function CollectionEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  console.log("[collection-editor-page] NEXT_PUBLIC_SUPABASE_URL defined:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("[collection-editor-page] NEXT_PUBLIC_SUPABASE_ANON_KEY defined:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let collection;
  try {
    collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        heroProduct: {
          select: { id: true, title: true, imageUrl: true },
        },
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
  } catch (err) {
    console.error("[collection-editor-page] prisma.collection.findUnique threw:", err);
    throw err;
  }

  if (!collection) notFound();

  // Serialize dates to ISO strings before passing to client component
  const serialized = {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    isActive: collection.isActive,
    heroProductId: collection.heroProductId,
    heroImageUrl: collection.heroImageUrl,
    lastEditedAt: collection.lastEditedAt.toISOString(),
    lastEditedBy: collection.lastEditedBy,
    heroProduct: collection.heroProduct,
    products: collection.products.map((cp) => ({
      productId: cp.productId,
      position: cp.position,
      addedAt: cp.addedAt.toISOString(),
      product: cp.product,
    })),
  };

  // Allowlist name map: first ID = "Jason", second = "Heather"
  const allowlist = (process.env.ADMIN_ALLOWLIST_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const names = ["Jason", "Heather"];
  const editorNames = Object.fromEntries(
    allowlist.map((id, i) => [id, names[i] ?? `user ${i + 1}`])
  );

  const brands = BRANDS.map((b) => ({
    brandKey: b.brandKey,
    displayName: b.displayName,
  }));

  return (
    <CollectionEditor
      collection={serialized}
      currentUserId={user?.id ?? null}
      editorNames={editorNames}
      brands={brands}
    />
  );
}
