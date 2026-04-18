import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CollectionEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function CollectionEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const collection = await prisma.collection.findUnique({
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

  if (!collection) notFound();

  // Serialize dates to ISO strings before passing to client component
  const serialized = {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    isActive: collection.isActive,
    heroProductId: collection.heroProductId,
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

  return (
    <CollectionEditor
      collection={serialized}
      currentUserId={user?.id ?? null}
      editorNames={editorNames}
    />
  );
}
