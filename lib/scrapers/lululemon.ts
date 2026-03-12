import { chromium, type BrowserContext, type Page } from "playwright";
import { prisma } from "@/lib/prisma";
import { extractColorBucket } from "@/lib/normalize/color";
import type { UpsertableProduct, SizeVariant } from "@/types";

const BRAND_KEY = "lululemon";
const BRAND_DISPLAY = "Lululemon";
const BASE_URL = "https://www.lululemon.com";

interface LululemonCategory {
  slug: string;
  category: string;
}

const CATEGORIES: LululemonCategory[] = [
  { slug: "/en-us/c/mens-shirts", category: "shirts" },
  { slug: "/en-us/c/mens-long-sleeve-shirts", category: "longsleeve" },
  { slug: "/en-us/c/mens-hoodies-and-sweatshirts", category: "hoodies" },
  { slug: "/en-us/c/mens-jackets-and-vests", category: "zips" },
  { slug: "/en-us/c/mens-shorts", category: "shorts" },
  { slug: "/en-us/c/mens-pants-and-tights", category: "pants" },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function autoScrollAndLoadMore(page: Page): Promise<void> {
  let previousHeight = 0;
  let staleCount = 0;

  while (staleCount < 3) {
    const currentHeight: number = await page.evaluate(
      () => document.body.scrollHeight
    );

    await page.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight)
    );
    await delay(1500);

    // Try clicking "Load More" / "Show More" button
    try {
      const loadMoreBtn = page.locator(
        'button:has-text("Load More"), button:has-text("Show More"), button:has-text("load more")'
      );
      if ((await loadMoreBtn.count()) > 0) {
        await loadMoreBtn.first().click();
        await delay(2000);
      }
    } catch {
      // ignore
    }

    if (currentHeight === previousHeight) {
      staleCount++;
    } else {
      staleCount = 0;
      previousHeight = currentHeight;
    }
  }
}

interface ExtractedProduct {
  title: string;
  handle: string;
  colorName: string;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string;
  productUrl: string;
  sizes: SizeVariant[];
  inStock: boolean;
}

async function extractProductsFromPage(
  page: Page,
  category: string
): Promise<ExtractedProduct[]> {
  // Try to get product data from __NEXT_DATA__ first
  const nextData = await page.evaluate(() => {
    const el = document.getElementById("__NEXT_DATA__");
    if (!el || !el.textContent) return null;
    try {
      return JSON.parse(el.textContent);
    } catch {
      return null;
    }
  });

  if (nextData) {
    return extractFromNextData(nextData, category);
  }

  // Fallback: DOM scraping
  return extractFromDOM(page, category);
}

function extractFromNextData(data: unknown, _category: string): ExtractedProduct[] {
  // Lululemon's Next.js structure varies — we look for a products array
  // deeply nested in pageProps
  const products: ExtractedProduct[] = [];

  function findProducts(obj: unknown): void {
    if (!obj || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      obj.forEach(findProducts);
      return;
    }

    const o = obj as Record<string, unknown>;

    // Check if this looks like a product object
    if (
      typeof o.displayName === "string" &&
      typeof o.productUrl === "string" &&
      (typeof o.highResImages !== "undefined" || typeof o.images !== "undefined")
    ) {
      try {
        const images = (o.highResImages as string[]) || (o.images as string[]) || [];
        const colorName = (o.colourGroup as string) || (o.colour as string) || "Unknown";
        const priceVal = (o.price as { currency: string; amount: number }) || null;
        const price = priceVal?.amount ?? 0;

        const sizeList = (o.sizes as Array<{ size: string; status: string }>) || [];
        const sizes: SizeVariant[] = sizeList.map((s) => ({
          size: s.size,
          available: s.status !== "out_of_stock" && s.status !== "unavailable",
        }));

        products.push({
          title: o.displayName as string,
          handle: (o.productUrl as string).split("/").pop() || "",
          colorName,
          price,
          compareAtPrice: null,
          imageUrl: Array.isArray(images) ? (images[0] as string) || "" : "",
          productUrl: `${BASE_URL}${o.productUrl as string}`,
          sizes,
          inStock: sizes.some((s) => s.available),
        });
      } catch {
        // skip malformed product
      }
    }

    // Recurse into all values
    for (const val of Object.values(o)) {
      findProducts(val);
    }
  }

  findProducts(data);
  return products;
}

async function extractFromDOM(page: Page, _category: string): Promise<ExtractedProduct[]> {
  // DOM fallback for when __NEXT_DATA__ doesn't have what we need
  const products: ExtractedProduct[] = [];

  const cards = await page
    .locator('[data-testid="product-card"], .product-card, [class*="ProductCard"]')
    .all();

  for (const card of cards) {
    try {
      const titleEl = card.locator(
        'h2, h3, [data-testid="product-name"], [class*="productName"]'
      );
      const title = (await titleEl.first().textContent())?.trim() || "";

      const priceEl = card.locator(
        '[data-testid="price"], [class*="price"], .price'
      );
      const priceText = (await priceEl.first().textContent()) || "0";
      const price = parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;

      const linkEl = card.locator("a").first();
      const href = (await linkEl.getAttribute("href")) || "";
      const productUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;

      const imgEl = card.locator("img").first();
      const imageUrl = (await imgEl.getAttribute("src")) || "";

      if (title && price > 0) {
        products.push({
          title,
          handle: href.split("/").pop() || "",
          colorName: "Unknown",
          price,
          compareAtPrice: null,
          imageUrl,
          productUrl,
          sizes: [],
          inStock: true,
        });
      }
    } catch {
      // skip malformed card
    }
  }

  return products;
}

async function upsertLululemonProduct(
  p: ExtractedProduct,
  category: string
): Promise<void> {
  const colorBucket = extractColorBucket(p.colorName);
  const externalId = `${p.handle}-${p.colorName}`;

  const existing = await prisma.product.findUnique({
    where: {
      brand_externalId_colorName: {
        brand: BRAND_KEY,
        externalId,
        colorName: p.colorName,
      },
    },
    select: { firstSeenAt: true },
  });

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const firstSeenAt = existing?.firstSeenAt ?? new Date();
  const isNew = firstSeenAt > fourteenDaysAgo;

  await prisma.product.upsert({
    where: {
      brand_externalId_colorName: {
        brand: BRAND_KEY,
        externalId,
        colorName: p.colorName,
      },
    },
    create: {
      externalId,
      brand: BRAND_KEY,
      title: p.title,
      handle: p.handle,
      productUrl: p.productUrl,
      category,
      colorName: p.colorName,
      colorBucket,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      onSale: p.compareAtPrice !== null && p.compareAtPrice > p.price,
      imageUrl: p.imageUrl,
      sizes: JSON.stringify(p.sizes),
      inStock: p.inStock,
      isNew: true,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    },
    update: {
      title: p.title,
      productUrl: p.productUrl,
      colorBucket,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      onSale: p.compareAtPrice !== null && p.compareAtPrice > p.price,
      imageUrl: p.imageUrl,
      sizes: JSON.stringify(p.sizes),
      inStock: p.inStock,
      isNew,
      lastSeenAt: new Date(),
    },
  });
}

export async function scrapeLululemon(): Promise<{
  found: number;
  upserted: number;
}> {
  console.log(`[${BRAND_DISPLAY}] Starting Playwright scrape...`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  let totalFound = 0;
  let totalUpserted = 0;

  try {
    for (const { slug, category } of CATEGORIES) {
      try {
        const page = await context.newPage();
        const url = `${BASE_URL}${slug}`;
        console.log(`[${BRAND_DISPLAY}] Scraping ${category}: ${url}`);

        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        await autoScrollAndLoadMore(page);

        const products = await extractProductsFromPage(page, category);
        console.log(`[${BRAND_DISPLAY}] ${category}: ${products.length} products`);

        for (const p of products) {
          await upsertLululemonProduct(p, category);
          totalUpserted++;
        }
        totalFound += products.length;

        await page.close();
        await delay(2500);
      } catch (err) {
        console.error(`[${BRAND_DISPLAY}] Error on ${category}:`, err);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`[${BRAND_DISPLAY}] Done. ${totalFound} found, ${totalUpserted} upserted`);
  return { found: totalFound, upserted: totalUpserted };
}
