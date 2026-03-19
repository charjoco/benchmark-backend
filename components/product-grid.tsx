import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product-card";
import type { ProductRow, SizeVariant, Colorway } from "@/types";

interface ProductGridProps {
  searchParams: Record<string, string | string[] | undefined>;
}

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | null {
  const val = params[key];
  if (!val) return null;
  return Array.isArray(val) ? val[0] : val;
}

function getParams(
  params: Record<string, string | string[] | undefined>,
  key: string
): string[] {
  const val = params[key];
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export async function ProductGrid({ searchParams }: ProductGridProps) {
  const category = getParam(searchParams, "category") || undefined;
  const brands = getParams(searchParams, "brand");
  const colors = getParams(searchParams, "color");
  const sizes = getParams(searchParams, "size");
  const onSale = getParam(searchParams, "onSale") === "true";
  const isNew = getParam(searchParams, "isNew") === "true";
  const sortBy = getParam(searchParams, "sortBy") || "lastSeenAt";
  const page = Math.max(1, parseInt(getParam(searchParams, "page") || "1"));
  const pageSize = 48;

  const where = {
    inStock: true,
    ...(category && { category }),
    ...(brands.length > 0 && { brand: { in: brands } }),
    ...(onSale && { onSale: true }),
    ...(isNew && { isNew: true }),
    ...(colors.length > 0 && { colorBucket: { in: colors } }),
    ...(sizes.length > 0 && {
      OR: sizes.map((size) => ({ sizes: { contains: `"size":"${size}"` } })),
    }),
  };

  const orderBy =
    sortBy === "price_asc"
      ? { price: "asc" as const }
      : sortBy === "price_desc"
        ? { price: "desc" as const }
        : sortBy === "newest"
          ? { firstSeenAt: "desc" as const }
          : { lastSeenAt: "desc" as const };

  const [rawProducts, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  const products: ProductRow[] = rawProducts.map((p) => ({
    ...p,
    sizes: JSON.parse(p.sizes) as SizeVariant[],
    colorways: JSON.parse(p.colorways) as Colorway[],
    sellers: JSON.parse(p.sellers) as import("@/types").Seller[],
  }));

  const totalPages = Math.ceil(total / pageSize);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-zinc-400 text-lg">No products found</p>
        <p className="text-zinc-600 text-sm mt-2">
          Try adjusting your filters or run a scrape to populate the database.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Result count */}
      <div className="text-sm text-zinc-500">
        {total.toLocaleString()} item{total !== 1 ? "s" : ""}
        {page > 1 && ` — page ${page} of ${totalPages}`}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} searchParams={searchParams} />
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  function buildUrl(targetPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (!value) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      } else {
        params.set(key, value);
      }
    }
    params.set("page", String(targetPage));
    return `?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {page > 1 && (
        <a
          href={buildUrl(page - 1)}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
        >
          ← Prev
        </a>
      )}
      <span className="text-sm text-zinc-500">
        {page} / {totalPages}
      </span>
      {page < totalPages && (
        <a
          href={buildUrl(page + 1)}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
        >
          Next →
        </a>
      )}
    </div>
  );
}
