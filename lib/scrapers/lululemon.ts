import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";
import { extractColorBucket, logUnmappedColor } from "@/lib/normalize/color";
import type { UpsertableProduct, Colorway, SizeVariant } from "@/types";

const BRAND_KEY = "lululemon";
const BRAND_DISPLAY = "Lululemon";
const BASE_URL = "https://shop.lululemon.com";
// Real Chrome binary — bypasses Akamai bot detection that rejects headless Chromium
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

interface LululemonCategory {
  slug: string;
  category: string;
}

// Each entry maps to a specific Lululemon category page (avoids cross-category duplicates)
const CATEGORIES: LululemonCategory[] = [
  { slug: "/c/men-t-shirts/n16wkm", category: "shirts" },
  { slug: "/c/men-polo-shirts/n1m3oa", category: "shirts" },
  { slug: "/c/men-long-sleeve-shirts/n1f3j9zk7dc", category: "longsleeve" },
  { slug: "/c/men-hoodies-and-sweatshirts/n1w1md", category: "hoodies" },
  { slug: "/c/men-quarter-zip-sweatshirts/n158eizw1md", category: "zips" },
  { slug: "/c/men-sweaters/n1xxr9", category: "sweaters" },
  { slug: "/c/men-shorts/n1jn1c", category: "shorts" },
  { slug: "/c/men-pants/n1u9dn", category: "pants" },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface LululemonSwatch {
  primaryImage: string;
  colorId: string;
  url: string;
  inStore: boolean | null;
}

interface LululemonSkuStyle {
  colorId: string;
  colorName: string;
  size: string;
  images: string[];
}

interface LululemonProduct {
  displayName: string;
  repositoryId: string;
  unifiedId: string;
  pdpUrl: string;
  listPrice: string[];
  productOnSale: boolean;
  productSalePrice: string[];
  swatches: LululemonSwatch[];
  skuStyleOrder: LululemonSkuStyle[];
}

interface CategoryPageData {
  products: LululemonProduct[];
  totalProductPages: number;
  currentPage: number;
}

async function extractPageData(
  page: import("playwright").Page
): Promise<CategoryPageData | null> {
  return page.evaluate(() => {
    const el = document.getElementById("__NEXT_DATA__");
    if (!el) return null;
    try {
      const data = JSON.parse(el.textContent || "{}");
      const queries = data.props?.pageProps?.dehydratedState?.queries || [];
      const catQuery = queries.find(
        (q: Record<string, unknown>) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === "CategoryPageDataQuery"
      );
      const page0 = catQuery?.state?.data?.pages?.[0];
      if (!page0) return null;
      return {
        products: page0.products || [],
        totalProductPages: page0.totalProductPages || 1,
        currentPage: page0.currentPage || 1,
      };
    } catch {
      return null;
    }
  });
}

/** Merge size lists, preferring available=true when a size appears in multiple colorways */
function mergeSizes(colorways: Colorway[]): SizeVariant[] {
  const sizeMap = new Map<string, boolean>();
  for (const cw of colorways) {
    for (const sv of cw.sizes) {
      sizeMap.set(sv.size, (sizeMap.get(sv.size) ?? false) || sv.available);
    }
  }
  return Array.from(sizeMap.entries()).map(([size, available]) => ({ size, available }));
}

async function upsertProduct(data: UpsertableProduct): Promise<boolean> {
  const primary = data.colorways[0];
  if (!primary) return false;

  const minPrice = Math.min(...data.colorways.map((c) => c.price));
  const anyOnSale = data.colorways.some((c) => c.onSale);
  const comparePrices = data.colorways
    .map((c) => c.compareAtPrice)
    .filter((p): p is number => p !== null);
  const maxCompare = comparePrices.length > 0 ? Math.max(...comparePrices) : null;
  const allSizes = mergeSizes(data.colorways);

  const bucketSet = new Set(data.colorways.map((c) => c.colorBucket));
  const colorBuckets = Array.from(bucketSet).join(",");

  const colourwaysJson = JSON.stringify(data.colorways);

  const existing = await prisma.product.findUnique({
    where: { brand_externalId: { brand: data.brand, externalId: data.externalId } },
    select: { firstSeenAt: true },
  });

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const firstSeenAt = existing?.firstSeenAt ?? new Date();
  const isNew = firstSeenAt > fourteenDaysAgo;

  await prisma.product.upsert({
    where: { brand_externalId: { brand: data.brand, externalId: data.externalId } },
    create: {
      externalId: data.externalId,
      brand: data.brand,
      title: data.title,
      handle: data.handle,
      productUrl: data.productUrl,
      category: data.category,
      // Primary colorway
      colorName: primary.colorName,
      colorBucket: primary.colorBucket,
      imageUrl: primary.imageUrl,
      // Aggregates
      price: minPrice,
      compareAtPrice: maxCompare,
      onSale: anyOnSale,
      colorways: colourwaysJson,
      colorBuckets,
      sizes: JSON.stringify(allSizes),
      inStock: data.inStock,
      isNew: true,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    },
    update: {
      title: data.title,
      productUrl: data.productUrl,
      category: data.category,
      colorName: primary.colorName,
      colorBucket: primary.colorBucket,
      imageUrl: primary.imageUrl,
      price: minPrice,
      compareAtPrice: maxCompare,
      onSale: anyOnSale,
      colorways: colourwaysJson,
      colorBuckets,
      sizes: JSON.stringify(allSizes),
      inStock: data.inStock,
      isNew,
      lastSeenAt: new Date(),
    },
  });

  return !existing;
}

function buildColorwayFromSwatch(
  product: LululemonProduct,
  swatch: LululemonSwatch
): Colorway {
  const skusForColor = product.skuStyleOrder.filter(
    (s) => s.colorId === swatch.colorId
  );
  const colorName = skusForColor[0]?.colorName || `Color ${swatch.colorId}`;

  const rawImageUrl =
    swatch.primaryImage ||
    (skusForColor[0]?.images?.[0] ? skusForColor[0].images[0] : "");
  const imageUrl = rawImageUrl.startsWith("http")
    ? rawImageUrl
    : `https:${rawImageUrl}`;

  const sizes: SizeVariant[] = skusForColor.map((s) => ({
    size: s.size,
    available: true, // category pages don't expose per-size OOS; assume available
  }));

  const listPriceNum = parseFloat(product.listPrice[0] || "0");
  const salePriceNum = product.productSalePrice[0]
    ? parseFloat(product.productSalePrice[0])
    : null;
  const price = salePriceNum ?? listPriceNum;
  const compareAtPrice = product.productOnSale ? listPriceNum : null;
  const onSale = product.productOnSale;

  const colorBucket = extractColorBucket(colorName);
  const productUrl = `${BASE_URL}${product.pdpUrl}?color=${swatch.colorId}`;

  logUnmappedColor(BRAND_KEY, colorName);

  return {
    colorName,
    colorBucket,
    imageUrl,
    price,
    compareAtPrice,
    onSale,
    sizes,
    productUrl,
  };
}

export async function scrapeLululemon(): Promise<{
  found: number;
  upserted: number;
}> {
  console.log(`[${BRAND_DISPLAY}] Starting scrape with real Chrome...`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
  });

  let totalFound = 0;
  let totalUpserted = 0;

  try {
    for (const { slug, category } of CATEGORIES) {
      let pageNum = 1;
      let totalPages = 1;

      while (pageNum <= totalPages) {
        const url = `${BASE_URL}${slug}?page=${pageNum}`;
        const page = await context.newPage();
        console.log(`[${BRAND_DISPLAY}] ${category} p${pageNum}: ${url}`);

        try {
          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 45000,
          });
          await delay(3500);

          const pageData = await extractPageData(page);
          if (!pageData || pageData.products.length === 0) {
            console.log(`[${BRAND_DISPLAY}] ${category} p${pageNum}: no data`);
            break;
          }

          totalPages = pageData.totalProductPages;
          console.log(
            `[${BRAND_DISPLAY}] ${category} p${pageNum}/${totalPages}: ${pageData.products.length} products`
          );

          for (const product of pageData.products) {
            if (!product.swatches || product.swatches.length === 0) continue;

            // Build all colorways for this product
            const colorways: Colorway[] = product.swatches.map((swatch) =>
              buildColorwayFromSwatch(product, swatch)
            );

            const inStock = colorways.some((c) => c.sizes.some((s) => s.available));

            const isNew = await upsertProduct({
              externalId: product.repositoryId,
              brand: BRAND_KEY,
              title: product.displayName,
              handle: product.unifiedId,
              productUrl: `${BASE_URL}${product.pdpUrl}`,
              category,
              colorways,
              inStock,
            });

            if (isNew) totalUpserted++;
            totalFound++;
          }
        } catch (err) {
          console.error(
            `[${BRAND_DISPLAY}] Error on ${category} p${pageNum}:`,
            err instanceof Error ? err.message.slice(0, 100) : err
          );
        } finally {
          await page.close();
          await delay(2000);
        }

        pageNum++;
      }
    }
  } finally {
    await browser.close();
  }

  console.log(
    `[${BRAND_DISPLAY}] Done. ${totalFound} found, ${totalUpserted} upserted`
  );
  return { found: totalFound, upserted: totalUpserted };
}
