import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseProduct } from "@/lib/product-serialize";
import { PUBLIC_PRODUCT_WHERE } from "@/lib/public-visibility";
import { parseProductSlug, pickCanonicalRow } from "@/lib/slug";

export const dynamic = "force-dynamic";

// B1 — single product by canonical slug: GET /api/products/{brandKey}-{handle}
// Powers benchmark-web's SSR product pages (~11k SEO surfaces). O(1) on the [brand] index,
// replacing the web's freeze-era adapter that scanned paginated brand feeds.
//
// Static sibling routes (/api/products/slugs, /api/products/saved) take precedence over this
// dynamic segment in the App Router, and no real slug can collide with them (every slug starts
// with a known brand key + "-").

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const parsed = parseProductSlug(slug);
  if (!parsed) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // An explicit "--{externalId}" disambiguator addresses one exact row.
  if (parsed.externalId) {
    const row = await prisma.product.findFirst({
      where: {
        ...PUBLIC_PRODUCT_WHERE,
        brand: parsed.brand,
        externalId: parsed.externalId,
      },
    });
    if (!row || row.handle !== parsed.handle) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(parseProduct(row));
  }

  // Clean slug → the canonical row of the [brand, handle] group. Usually exactly one row;
  // pickCanonicalRow resolves the rare collision the same way the B4 slug feed does.
  const rows = await prisma.product.findMany({
    where: { ...PUBLIC_PRODUCT_WHERE, brand: parsed.brand, handle: parsed.handle },
  });
  if (rows.length === 0) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const canonical = pickCanonicalRow(rows)!;
  return NextResponse.json(parseProduct(canonical));
}
