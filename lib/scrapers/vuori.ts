import axios from "axios";
import { chromium, type Page } from "playwright";
import { prisma } from "@/lib/prisma";
import { extractColorBucket } from "@/lib/normalize/color";
import type { UpsertableProduct, SizeVariant } from "@/types";

const BRAND_KEY = "vuori";
const BRAND_DISPLAY = "Vuori";
const BASE_URL = "https://vuoriclothing.com";

const VUORI_SHOPIFY_DOMAIN = "vuoriclothing.com";

interface VuoriCategory {
  path: string;
  category: string;
}

const CATEGORIES: VuoriCategory[] = [
  { path: "/collections/mens-t-shirts", category: "shirts" },
  { path: "/collections/mens-long-sleeve", category: "longsleeve" },
  { path: "/collections/mens-hoodies", category: "hoodies" },
  { path: "/collections/mens-sweaters", category: "sweaters" },
  { path: "/collections/mens-zip-ups", category: "zips" },
  { path: "/collections/mens-shorts", category: "shorts" },
  { path: "/collections/mens-pants", category: "pants" },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Shopify path (if vuoriclothing.com exposes /products.json) ─────────────

interface ShopifyVariant {
  price: string;
  compare_at_price: string | null;
  available: boolean;
  option1: string | null;
  option2: string | null;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  product_type: string;
  tags: string[];
  images: Array<{ src: string; variant_ids?: number[] }>;
  variants: ShopifyVariant[];
  options: Array<{ name: string; values: string[] }>;
}

async function tryShopifyScrape(): Promise<boolean> {
  try {
    const res = await axios.get<{ products: ShopifyProduct[] }>(
      `https://${VUORI_SHOPIFY_DOMAIN}/products.json?limit=1`,
      { timeout: 10000, headers: { Accept: "application/json" } }
    );
    return Array.isArray(res.data?.products);
  } catch {
    return false;
  }
}

async function scrapeVuoriShopify(): Promise<{ found: number; upserted: number }> {
  let found = 0;
  let upserted = 0;
  let page = 1;
  const limit = 250;

  while (true) {
    const res = await axios.get<{ products: ShopifyProduct[] }>(
      `https://${VUORI_SHOPIFY_DOMAIN}/products.json?limit=${limit}&page=${page}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
        timeout: 20000,
      }
    );

    const products = res.data?.products;
    if (!products || products.length === 0) break;

    for (const p of products) {
      // Vuori sells men's and women's — filter by tags or collection path
      const tags = p.tags.map((t) => t.toLowerCase());
      if (tags.includes("womens") || tags.includes("women's")) continue;

      const category = resolveVuoriCategory(p);
      if (!category) continue;

      const colorOptionIdx = p.options.findIndex((o) =>
        o.name.toLowerCase().includes("color") || o.name.toLowerCase().includes("colour")
      );

      const groups: Record<string, ShopifyVariant[]> = {};
      for (const v of p.variants) {
        const color = colorOptionIdx === 0 ? v.option1 : colorOptionIdx === 1 ? v.option2 : "Unknown";
        const key = color || "Unknown";
        if (!groups[key]) groups[key] = [];
        groups[key].push(v);
      }

      for (const [colorName, variants] of Object.entries(groups)) {
        const prices = variants.map((v) => parseFloat(v.price));
        const compares = variants
          .map((v) => (v.compare_at_price ? parseFloat(v.compare_at_price) : null))
          .filter((x): x is number => x !== null);
        const minPrice = Math.min(...prices);
        const maxCompare = compares.length > 0 ? Math.max(...compares) : null;
        const sizeIdx = colorOptionIdx === 0 ? 1 : 0;
        const sizes: SizeVariant[] = variants.map((v) => ({
          size: (sizeIdx === 0 ? v.option1 : v.option2) || v.option1 || "",
          available: v.available,
        }));
        const imageUrl = p.images[0]?.src || "";

        await upsertVuoriProduct({
          externalId: `${p.id}-${colorName}`,
          brand: BRAND_KEY,
          title: p.title,
          handle: p.handle,
          productUrl: `${BASE_URL}/products/${p.handle}`,
          category,
          colorName,
          colorBucket: extractColorBucket(colorName),
          price: minPrice,
          compareAtPrice: maxCompare,
          onSale: maxCompare !== null && maxCompare > minPrice,
          imageUrl,
          sizes,
          inStock: variants.some((v) => v.available),
        });
        upserted++;
      }
      found++;
    }

    if (products.length < limit) break;
    page++;
    await delay(600);
  }

  return { found, upserted };
}

function resolveVuoriCategory(p: ShopifyProduct): string | null {
  const type = p.product_type.toLowerCase();
  const tags = p.tags.map((t) => t.toLowerCase());
  const title = p.title.toLowerCase();

  if (tags.some((t) => t.includes("zip")) || title.includes("zip") || type.includes("zip")) return "zips";
  if (type.includes("t-shirt") || tags.includes("short sleeve") || title.includes("tee")) return "shirts";
  if (type.includes("long sleeve") || tags.includes("long sleeve")) return "longsleeve";
  if (type.includes("hoodie") || tags.includes("hoodie")) return "hoodies";
  if (type.includes("sweater") || tags.includes("sweater")) return "sweaters";
  if (type.includes("short") || tags.includes("short")) return "shorts";
  if (type.includes("pant") || type.includes("jogger") || tags.includes("pant")) return "pants";
  return null;
}

// ── Playwright fallback ────────────────────────────────────────────────────

async function autoScrollAndLoadMore(page: Page): Promise<void> {
  let previousHeight = 0;
  let staleCount = 0;

  while (staleCount < 3) {
    const currentHeight: number = await page.evaluate(() => document.body.scrollHeight);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(1500);

    try {
      const loadMoreBtn = page.locator('button:has-text("Load More"), button:has-text("Show More")');
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

async function scrapeVuoriPlaywright(): Promise<{ found: number; upserted: number }> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });

  let totalFound = 0;
  let totalUpserted = 0;

  try {
    for (const { path, category } of CATEGORIES) {
      try {
        const page = await context.newPage();
        const url = `${BASE_URL}${path}`;
        console.log(`[${BRAND_DISPLAY}] Scraping ${category}: ${url}`);

        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        await autoScrollAndLoadMore(page);

        const cards = await page
          .locator('[data-testid="product-card"], .product-card, [class*="ProductCard"], [class*="product-tile"]')
          .all();

        console.log(`[${BRAND_DISPLAY}] ${category}: ${cards.length} cards found`);

        for (const card of cards) {
          try {
            const title = (await card.locator("h2, h3, [class*='title'], [class*='name']").first().textContent())?.trim() || "";
            const priceText = (await card.locator("[class*='price'], .price").first().textContent()) || "0";
            const price = parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;
            const href = (await card.locator("a").first().getAttribute("href")) || "";
            const imageUrl = (await card.locator("img").first().getAttribute("src")) || "";
            const productUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;

            if (!title || price <= 0) continue;

            await upsertVuoriProduct({
              externalId: `${href.split("/").pop() || title}-Unknown`,
              brand: BRAND_KEY,
              title,
              handle: href.split("/").pop() || title,
              productUrl,
              category,
              colorName: "Unknown",
              colorBucket: "Other",
              price,
              compareAtPrice: null,
              onSale: false,
              imageUrl,
              sizes: [],
              inStock: true,
            });
            totalUpserted++;
            totalFound++;
          } catch {
            // skip malformed card
          }
        }

        await page.close();
        await delay(2500);
      } catch (err) {
        console.error(`[${BRAND_DISPLAY}] Error on ${category}:`, err);
      }
    }
  } finally {
    await browser.close();
  }

  return { found: totalFound, upserted: totalUpserted };
}

async function upsertVuoriProduct(data: UpsertableProduct): Promise<void> {
  const existing = await prisma.product.findUnique({
    where: {
      brand_externalId_colorName: {
        brand: data.brand,
        externalId: data.externalId,
        colorName: data.colorName,
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
        brand: data.brand,
        externalId: data.externalId,
        colorName: data.colorName,
      },
    },
    create: {
      ...data,
      sizes: JSON.stringify(data.sizes),
      isNew: true,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    },
    update: {
      title: data.title,
      productUrl: data.productUrl,
      colorBucket: data.colorBucket,
      price: data.price,
      compareAtPrice: data.compareAtPrice,
      onSale: data.onSale,
      imageUrl: data.imageUrl,
      sizes: JSON.stringify(data.sizes),
      inStock: data.inStock,
      isNew,
      lastSeenAt: new Date(),
    },
  });
}

// ── Public entry point ─────────────────────────────────────────────────────

export async function scrapeVuori(): Promise<{ found: number; upserted: number }> {
  console.log(`[${BRAND_DISPLAY}] Checking if Shopify...`);
  const isShopify = await tryShopifyScrape();

  if (isShopify) {
    console.log(`[${BRAND_DISPLAY}] Using Shopify /products.json`);
    return scrapeVuoriShopify();
  } else {
    console.log(`[${BRAND_DISPLAY}] Falling back to Playwright`);
    return scrapeVuoriPlaywright();
  }
}
