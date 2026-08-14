import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { internalMarkerExclusions } from "@/lib/public-visibility";
import { parseProducts } from "@/lib/product-serialize";

export const dynamic = "force-dynamic";

// Anchor brands are promoted in the default feed (2/3 of each page).
// Discovery brands fill the remaining 1/3.
const ANCHOR_BRANDS = ["vuori", "rhone"];
const ANCHOR_PER_PAGE = 32;
const DISCOVERY_PER_PAGE = 16;

// B2 search. ILIKE on title/brand against an unindexed column, so keep queries bounded:
// one character matches most of the catalog, and an unbounded string is a free scan.
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;

/** Interleave anchor and discovery results 2:1 */
function interleave<T>(anchors: T[], discovery: T[]): T[] {
  const result: T[] = [];
  let a = 0, d = 0;
  while (a < anchors.length || d < discovery.length) {
    if (a < anchors.length) result.push(anchors[a++]);
    if (a < anchors.length) result.push(anchors[a++]);
    if (d < discovery.length) result.push(discovery[d++]);
  }
  return result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const category = searchParams.get("category") || undefined;
  const brands = searchParams.getAll("brand");
  const onSale = searchParams.get("onSale") === "true";
  const isNew = searchParams.get("isNew") === "true";
  const drops = searchParams.get("drops") === "true";
  const priceDrops = searchParams.get("priceDrops") === "true";
  const popular = searchParams.get("popular") === "true";
  const rawQuery = (searchParams.get("q") || "").trim();
  const q = rawQuery.length >= MIN_QUERY_LENGTH ? rawQuery.slice(0, MAX_QUERY_LENGTH) : undefined;

  // popular feed is no longer implemented — return empty immediately
  if (popular) {
    return NextResponse.json({ products: [], total: 0, page: 1, pageSize: 48, totalPages: 0 });
  }
  const colors = searchParams.getAll("color");
  const sizes = searchParams.getAll("size");
  const minPrice = parseFloat(searchParams.get("minPrice") || "0");
  const maxPrice = parseFloat(searchParams.get("maxPrice") || "9999");
  const sortBy = searchParams.get("sortBy") || "lastSeenAt";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = 48;

  // Detect pipeline from first color param's casing:
  //   Title Case ("Navy") → colorBuckets  (legacy — active TestFlight clients)
  //   lowercase  ("navy") → availableColors (new pipeline)
  // Mixed casing across params in a single request is a client bug — warn and fall back to legacy.
  const isLowercaseChar = (c: string) => {
    const f = c.trim()[0];
    return f !== undefined && f === f.toLowerCase() && f !== f.toUpperCase();
  };
  let colorFilter: { OR: Array<{ colorBuckets: { contains: string } } | { availableColors: { contains: string } }> } | undefined;
  if (colors.length > 0) {
    const firstIsLower = isLowercaseChar(colors[0]);
    const allLower = colors.every(isLowercaseChar);
    if (firstIsLower && !allLower) {
      console.warn(`[products/route] Mixed-case color params: ${colors.join(",")} — defaulting to legacy colorBuckets path`);
    }
    if (firstIsLower && allLower) {
      colorFilter = { OR: colors.map((c) => ({ availableColors: { contains: c.trim() } })) };
    } else {
      colorFilter = { OR: colors.map((c) => ({ colorBuckets: { contains: c.trim() } })) };
    }
  }

  const sizeFilter = sizes.length > 0
    ? { OR: sizes.map((s) => ({ sizes: { contains: `"size":"${s}"` } })) }
    : undefined;

  // Exclude sale items from default browsing — they only appear when user explicitly
  // filters for sale or browses the price-drops feed (limited supply items shouldn't crowd feed).
  // A search is explicit intent rather than browsing, so it does not hide sale items: a user
  // searching "commuter polo" wants the polo whether or not it happens to be discounted.
  const hideSaleInDefaultFeed = !onSale && !priceDrops && !q;

  // Every OR-shaped condition goes through this AND list. They must NOT be spread into the
  // where object individually: each is a bare `{ OR: [...] }`, so a later spread silently
  // overwrote an earlier one — a colour or size filter dropped the hide-sale clause entirely,
  // leaking sale items into the filtered default feed.
  const andConditions: Prisma.ProductWhereInput[] = [...internalMarkerExclusions()];
  if (hideSaleInDefaultFeed && !drops) andConditions.push({ OR: [{ onSale: false }, { isNew: true }] });
  if (colorFilter) andConditions.push(colorFilter);
  if (sizeFilter) andConditions.push(sizeFilter);
  if (q) {
    andConditions.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const sharedWhere = {
    inStock: true,
    category: category ? category : { not: null },
    ...(onSale && { onSale: true }),
    ...(isNew && { isNew: true }),
    ...(drops && { firstSeenAt: { gte: new Date(Date.now() - 72 * 60 * 60 * 1000) } }),
    ...(priceDrops && { priceDroppedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    ...(andConditions.length > 0 && { AND: andConditions }),
    price: { gte: minPrice, lte: maxPrice },
  };

  const orderBy =
    sortBy === "price_asc"
      ? { price: "asc" as const }
      : sortBy === "price_desc"
        ? { price: "desc" as const }
        : sortBy === "newest"
          ? { firstSeenAt: "desc" as const }
          : { lastSeenAt: "desc" as const };

  // Use interleaved anchor/discovery fetch only for the unfiltered default feed.
  // Any explicit brand selection or non-default sort bypasses boosting.
  // A search bypasses boosting too: promoting Vuori and Rhone 2:1 inside search results would
  // bury the matches the user explicitly asked for behind two anchor brands.
  const useBoost =
    brands.length === 0 &&
    sortBy === "lastSeenAt" &&
    !drops && !priceDrops && !q;

  if (useBoost) {
    const anchorWhere = { ...sharedWhere, brand: { in: ANCHOR_BRANDS } };
    const discoveryWhere = { ...sharedWhere, brand: { notIn: ANCHOR_BRANDS } };

    // Premium ($80+) anchor items lead each page; standard fills the rest
    const PREMIUM_PER_PAGE = 24;
    const STANDARD_PER_PAGE = ANCHOR_PER_PAGE - PREMIUM_PER_PAGE;

    const [premiumAnchorRaw, standardAnchorRaw, anchorTotal, discoveryRaw, discoveryTotal] = await Promise.all([
      prisma.product.findMany({ where: { ...anchorWhere, price: { gte: 80 } }, orderBy, skip: (page - 1) * PREMIUM_PER_PAGE, take: PREMIUM_PER_PAGE }),
      prisma.product.findMany({ where: { ...anchorWhere, price: { lt: 80 } }, orderBy, skip: (page - 1) * STANDARD_PER_PAGE, take: STANDARD_PER_PAGE }),
      prisma.product.count({ where: anchorWhere }),
      prisma.product.findMany({ where: discoveryWhere, orderBy, skip: (page - 1) * DISCOVERY_PER_PAGE, take: DISCOVERY_PER_PAGE }),
      prisma.product.count({ where: discoveryWhere }),
    ]);

    const anchorRaw = [...premiumAnchorRaw, ...standardAnchorRaw];

    const products = parseProducts(interleave(anchorRaw, discoveryRaw));
    const total = anchorTotal + discoveryTotal;
    const totalPages = Math.max(
      Math.ceil(anchorTotal / ANCHOR_PER_PAGE),
      Math.ceil(discoveryTotal / DISCOVERY_PER_PAGE),
    );

    return NextResponse.json({ products, total, page, pageSize, totalPages });
  }

  // Standard fetch — explicit filters, brand selection, or non-default sort
  const where = {
    ...sharedWhere,
    ...(brands.length > 0 && { brand: { in: brands } }),
  };

  const [rawProducts, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.product.count({ where }),
  ]);

  const products = parseProducts(rawProducts);

  return NextResponse.json({
    products,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
