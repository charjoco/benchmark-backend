import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_PRODUCT_WHERE } from "@/lib/public-visibility";
import { productSlug, disambiguatedSlug, pickCanonicalRow } from "@/lib/slug";

export const dynamic = "force-dynamic";

// B4 — sitemap slug feed: GET /api/products/slugs
// One call returns every indexable product URL, replacing benchmark-web's freeze-era fallback
// that paginated each brand feed (~230 calls, capped low, incomplete).
//
// Visibility matches the public feed exactly (in stock, categorised) — the sitemap must not
// advertise a URL the feed won't serve.
//
// lastmod is deliberately NOT lastSeenAt: the scraper stamps lastSeenAt on every product every
// hour, so using it would tell crawlers all ~11k pages change hourly and burn crawl budget on a
// signal that means nothing. firstSeenAt / priceDroppedAt are the timestamps that track real
// page-content change (product appeared; price moved).

interface SlugEntry {
  slug: string;
  lastmod: string;
}

export async function GET() {
  const rows = await prisma.product.findMany({
    where: { ...PUBLIC_PRODUCT_WHERE, inStock: true, category: { not: null } },
    select: {
      brand: true,
      handle: true,
      externalId: true,
      inStock: true,
      firstSeenAt: true,
      priceDroppedAt: true,
    },
  });

  // Group by [brand, handle] so colliding rows can be disambiguated: the canonical row keeps the
  // clean slug, the rest get an explicit "--{externalId}" slug. Every product stays reachable and
  // no two products share a URL.
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.brand}/${r.handle}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(r);
    else groups.set(key, [r]);
  }

  const lastmodOf = (r: (typeof rows)[number]) => {
    const changed =
      r.priceDroppedAt && r.priceDroppedAt > r.firstSeenAt ? r.priceDroppedAt : r.firstSeenAt;
    return changed.toISOString();
  };

  const entries: SlugEntry[] = [];
  for (const bucket of groups.values()) {
    if (bucket.length === 1) {
      entries.push({ slug: productSlug(bucket[0].brand, bucket[0].handle), lastmod: lastmodOf(bucket[0]) });
      continue;
    }
    const canonical = pickCanonicalRow(bucket)!;
    for (const r of bucket) {
      entries.push({
        slug:
          r.externalId === canonical.externalId
            ? productSlug(r.brand, r.handle)
            : disambiguatedSlug(r.brand, r.handle, r.externalId),
        lastmod: lastmodOf(r),
      });
    }
  }

  return NextResponse.json(entries);
}
