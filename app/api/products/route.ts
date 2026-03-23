import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SizeVariant, Colorway, Seller } from "@/types";

export const dynamic = "force-dynamic";

// Anchor brands are promoted in the default feed (2/3 of each page).
// Discovery brands fill the remaining 1/3.
const ANCHOR_BRANDS = ["vuori", "lululemon", "rhone"];
const ANCHOR_PER_PAGE = 32;
const DISCOVERY_PER_PAGE = 16;

type RawProduct = Awaited<ReturnType<typeof prisma.product.findMany>>[number];

function parseProducts(raw: RawProduct[]) {
  return raw.map((p) => ({
    ...p,
    sizes: JSON.parse(p.sizes) as SizeVariant[],
    colorways: JSON.parse(p.colorways) as Colorway[],
    sellers: JSON.parse(p.sellers) as Seller[],
  }));
}

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
  const restocks = searchParams.get("restocks") === "true";
  const popular = searchParams.get("popular") === "true";
  const colors = searchParams.getAll("color");
  const sizes = searchParams.getAll("size");
  const minPrice = parseFloat(searchParams.get("minPrice") || "0");
  const maxPrice = parseFloat(searchParams.get("maxPrice") || "9999");
  const sortBy = searchParams.get("sortBy") || "lastSeenAt";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = 48;

  const colorFilter = colors.length > 0
    ? { OR: colors.map((c) => ({ colorBuckets: { contains: c } })) }
    : undefined;

  const sizeFilter = sizes.length > 0
    ? { OR: sizes.map((s) => ({ sizes: { contains: `"size":"${s}"` } })) }
    : undefined;

  // Exclude sale items from default browsing — they only appear when user explicitly
  // filters for sale or browses the price-drops feed (limited supply items shouldn't crowd feed).
  const hideSaleInDefaultFeed = !onSale && !priceDrops;

  const sharedWhere = {
    inStock: true,
    ...(category && { category }),
    ...(onSale && { onSale: true }),
    ...(hideSaleInDefaultFeed && !drops && !restocks && !popular && { onSale: false }),
    ...(isNew && { isNew: true }),
    ...(drops && { firstSeenAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } }),
    ...(priceDrops && { priceDroppedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    ...(restocks && { restockedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    ...(colorFilter && sizeFilter
      ? { AND: [colorFilter, sizeFilter] }
      : colorFilter ?? sizeFilter ?? {}),
    price: { gte: minPrice, lte: maxPrice },
  };

  const orderBy =
    sortBy === "price_asc"
      ? { price: "asc" as const }
      : sortBy === "price_desc"
        ? { price: "desc" as const }
        : sortBy === "newest"
          ? { firstSeenAt: "desc" as const }
          : popular
            ? { firstSeenAt: "desc" as const }
            : { lastSeenAt: "desc" as const };

  // Use interleaved anchor/discovery fetch only for the unfiltered default feed.
  // Any explicit brand selection or non-default sort bypasses boosting.
  const useBoost =
    brands.length === 0 &&
    sortBy === "lastSeenAt" &&
    !drops && !priceDrops && !restocks && !popular;

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
