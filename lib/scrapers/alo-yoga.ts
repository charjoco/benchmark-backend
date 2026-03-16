import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";
import { extractColorBucket, logUnmappedColor } from "@/lib/normalize/color";
import type { UpsertableProduct, Colorway, SizeVariant } from "@/types";

const BRAND_KEY = "alo-yoga";
const BRAND_DISPLAY = "Alo Yoga";
const BASE_URL = "https://www.aloyoga.com";
const CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * Map Alo Yoga product_type → app category.
 * Values discovered by inspecting their products.json responses.
 */
const PRODUCT_TYPE_MAP: Record<string, string> = {
  // Shirts / Tanks
  "T-Shirt": "shirts",
  "Tee": "shirts",
  "Tank": "shirts",
  "Tank Top": "shirts",
  "Muscle Tank": "shirts",
  "Polo": "shirts",
  "Short Sleeve": "shirts",
  // Long sleeve
  "Long Sleeve": "longsleeve",
  "Long-Sleeve": "longsleeve",
  "Long Sleeve T-Shirt": "longsleeve",
  // Hoodies
  "Hoodie": "hoodies",
  "Pullover Hoodie": "hoodies",
  "Hooded Sweatshirt": "hoodies",
  // Sweaters / Sweatshirts (crewneck)
  "Sweatshirt": "sweaters",
  "Crewneck": "sweaters",
  "Sweater": "sweaters",
  "Pullover": "sweaters",
  // Zip-ups
  "Zip": "zips",
  "Quarter-Zip": "zips",
  "Half-Zip": "zips",
  "Full-Zip": "zips",
  "Zip-Up": "zips",
  "Zip Up": "zips",
  // Shorts
  "Short": "shorts",
  "Shorts": "shorts",
  "Training Short": "shorts",
  // Pants
  "Pant": "pants",
  "Pants": "pants",
  "Jogger": "pants",
  "Joggers": "pants",
  "Sweatpant": "pants",
  "Sweatpants": "pants",
  "Legging": "pants",
};

/**
 * Collections to scrape, in priority order.
 * Using specific collections is more reliable than shop-all + filtering.
 * "category" is used as a fallback when product_type is unmapped.
 */
const COLLECTIONS = [
  { handle: "mens-train", fallbackCategory: "shirts" },
  { handle: "mens-yoga", fallbackCategory: "shirts" },
  { handle: "mens-sweatshirts-hoodies", fallbackCategory: "hoodies" },
  { handle: "mens-sweaters", fallbackCategory: "sweaters" },
  { handle: "mens-shorts", fallbackCategory: "shorts" },
  { handle: "mens-pants", fallbackCategory: "pants" },
  { handle: "mens-sweatpants", fallbackCategory: "pants" },
];

// Only keep products that map to our supported categories
const SUPPORTED_CATEGORIES = new Set([
  "shirts", "longsleeve", "hoodies", "sweaters", "zips", "shorts", "pants",
]);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Shopify Liquid products.json types ---

interface LiquidVariant {
  id: number;
  title: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  price: string;           // "58.00"
  compare_at_price: string | null;
  available: boolean;
  sku: string;
}

interface LiquidOption {
  name: string;
  values: string[];
}

interface LiquidImage {
  id: number;
  src: string;
}

interface LiquidProduct {
  id: number;
  title: string;
  handle: string;
  product_type: string;
  variants: LiquidVariant[];
  options: LiquidOption[];
  images: LiquidImage[];
}

interface LiquidProductsResponse {
  products: LiquidProduct[];
}

// --- Product transformation ---

/**
 * Alo Yoga publishes one Shopify product per colorway (title ends with " - ColorName").
 * We build a single Colorway from all size variants on that product.
 */
function buildColorway(product: LiquidProduct): Colorway | null {
  // Extract color name from title: "Conquer Tank - Desert Sage" → "Desert Sage"
  const titleParts = product.title.split(" - ");
  const colorName = titleParts.length > 1 ? titleParts[titleParts.length - 1] : "One Color";

  const sizeOption = product.options.find(
    (o) => o.name.toLowerCase() === "size"
  );
  const colorOption = product.options.find(
    (o) => o.name.toLowerCase() === "color" || o.name.toLowerCase() === "colour"
  );

  const sizes: SizeVariant[] = product.variants.map((v) => {
    // Size is option1 when it's the only/first option, else find it by option name position
    let size = v.option1 ?? v.title;
    if (sizeOption) {
      const idx = product.options.indexOf(sizeOption);
      size = idx === 0 ? (v.option1 ?? size)
           : idx === 1 ? (v.option2 ?? size)
           : (v.option3 ?? size);
    }
    // If there's a color option, the "other" option is the size
    if (colorOption && !sizeOption) {
      const colorIdx = product.options.indexOf(colorOption);
      size = colorIdx === 0 ? (v.option2 ?? v.option1 ?? v.title)
           : (v.option1 ?? v.title);
    }
    return { size, available: v.available };
  });

  if (sizes.length === 0) return null;

  const prices = product.variants.map((v) => parseFloat(v.price));
  const price = Math.min(...prices);
  const comparePrices = product.variants
    .map((v) => v.compare_at_price)
    .filter((p): p is string => p !== null)
    .map(parseFloat);
  const compareAtPrice = comparePrices.length > 0 ? Math.max(...comparePrices) : null;
  const onSale = compareAtPrice !== null && compareAtPrice > price;
  const imageUrl = product.images[0]?.src ?? "";
  const colorBucket = extractColorBucket(colorName);
  logUnmappedColor(BRAND_KEY, colorName);

  return { colorName, colorBucket, imageUrl, price, compareAtPrice, onSale, sizes };
}

function resolveCategory(product: LiquidProduct, fallbackCategory: string): string {
  const mapped = PRODUCT_TYPE_MAP[product.product_type];
  if (mapped) return mapped;

  // Secondary: check title for clues
  const titleLower = product.title.toLowerCase();
  if (titleLower.includes("hoodie")) return "hoodies";
  if (titleLower.includes("jogger") || titleLower.includes("sweatpant")) return "pants";
  if (titleLower.includes("short")) return "shorts";
  if (titleLower.includes("zip")) return "zips";
  if (titleLower.includes("long sleeve")) return "longsleeve";

  return fallbackCategory;
}

function mergeSizes(colorways: Colorway[]): SizeVariant[] {
  const sizeMap = new Map<string, boolean>();
  for (const cw of colorways) {
    for (const sv of cw.sizes) {
      sizeMap.set(sv.size, (sizeMap.get(sv.size) ?? false) || sv.available);
    }
  }
  return Array.from(sizeMap.entries()).map(([size, available]) => ({ size, available }));
}

// --- Database upsert ---

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

// --- Main scraper ---

export async function scrapeAloYoga(): Promise<{
  found: number;
  upserted: number;
}> {
  console.log(`[${BRAND_DISPLAY}] Starting scrape...`);

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
    },
  });

  const seenIds = new Set<string>();
  let totalFound = 0;
  let totalUpserted = 0;

  try {
    // Warm up Cloudflare clearance cookie with a real page load
    console.log(`[${BRAND_DISPLAY}] Warming up Cloudflare cookie...`);
    const warmupPage = await context.newPage();
    await warmupPage.goto(`${BASE_URL}/collections/mens-new-arrivals`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await delay(4000);
    await warmupPage.close();
    console.log(`[${BRAND_DISPLAY}] Cookie ready, starting collection scrape`);

    for (const { handle, fallbackCategory } of COLLECTIONS) {
      let pageNum = 1;

      while (true) {
        const url = `${BASE_URL}/collections/${handle}/products.json?limit=250&page=${pageNum}`;
        console.log(`[${BRAND_DISPLAY}] ${handle} p${pageNum}`);

        const jsonPage = await context.newPage();
        let products: LiquidProduct[] = [];

        try {
          await jsonPage.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
          await delay(1500);

          const bodyText = await jsonPage.evaluate(() => document.body.innerText);
          const data = JSON.parse(bodyText) as LiquidProductsResponse;
          products = data.products ?? [];
        } catch (err) {
          console.error(
            `[${BRAND_DISPLAY}] Error fetching ${handle} p${pageNum}:`,
            err instanceof Error ? err.message.slice(0, 100) : err
          );
          break;
        } finally {
          await jsonPage.close();
        }

        if (products.length === 0) {
          console.log(`[${BRAND_DISPLAY}] ${handle} p${pageNum}: empty — done`);
          break;
        }

        console.log(`[${BRAND_DISPLAY}] ${handle} p${pageNum}: ${products.length} products`);

        for (const product of products) {
          const externalId = String(product.id);
          if (seenIds.has(externalId)) continue;

          const category = resolveCategory(product, fallbackCategory);
          if (!SUPPORTED_CATEGORIES.has(category)) continue;

          seenIds.add(externalId);

          const colorway = buildColorway(product);
          if (!colorway) continue;

          // Strip the color suffix from the display title: "Tank - Desert Sage" → "Tank"
          const displayTitle = product.title.includes(" - ")
            ? product.title.split(" - ").slice(0, -1).join(" - ")
            : product.title;

          const inStock = colorway.sizes.some((s) => s.available);

          const wasNew = await upsertProduct({
            externalId,
            brand: BRAND_KEY,
            title: displayTitle,
            handle: product.handle,
            productUrl: `${BASE_URL}/products/${product.handle}`,
            category,
            colorways: [colorway],
            inStock,
          });

          if (wasNew) totalUpserted++;
          totalFound++;
        }

        // products.json maxes out at 250 per page; fewer means last page
        if (products.length < 250) break;
        pageNum++;
        await delay(1000);
      }

      await delay(2000);
    }
  } finally {
    await browser.close();
  }

  console.log(
    `[${BRAND_DISPLAY}] Done. ${totalFound} found, ${totalUpserted} new`
  );
  return { found: totalFound, upserted: totalUpserted };
}
