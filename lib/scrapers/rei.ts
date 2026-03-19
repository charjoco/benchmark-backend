import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";
import type { Seller } from "@/types";

const BRAND_DISPLAY = "REI";
const BASE_URL = "https://www.rei.com";

// REI brand URL slugs for brands we track
const REI_BRANDS: { brandKey: string; reiSlug: string }[] = [
  { brandKey: "vuori", reiSlug: "vuori" },
  { brandKey: "alo-yoga", reiSlug: "alo" },
  { brandKey: "public-rec", reiSlug: "public-rec" },
  { brandKey: "ten-thousand", reiSlug: "ten-thousand" },
];

const CHROME_PATH =
  process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : undefined;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTitle(title: string, brandName: string): string {
  const withoutBrand = title.replace(new RegExp(`^${brandName}\\s+`, "i"), "");
  return withoutBrand.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

interface REIProduct {
  brandName: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  onSale: boolean;
  url: string;
}

async function extractProducts(page: import("playwright").Page): Promise<REIProduct[]> {
  return page.evaluate(() => {
    const products: Array<{
      brandName: string; title: string; price: number;
      compareAtPrice: number | null; onSale: boolean; url: string;
    }> = [];

    // REI product tiles
    const tiles = document.querySelectorAll('[data-ui="product-card"], [class*="ProductCard"], li[class*="product"]');
    tiles.forEach((tile) => {
      try {
        const brandEl = tile.querySelector('[data-ui="product-brand"], [class*="brand"]');
        const titleEl = tile.querySelector('[data-ui="product-title"], [class*="title"], h3, h4');
        const priceEl = tile.querySelector('[data-ui="sale-price"], [class*="sale"], [class*="price"]');
        const originalPriceEl = tile.querySelector('[data-ui="original-price"], [class*="original"], [class*="compare"]');
        const linkEl = tile.querySelector("a[href]");

        if (!titleEl || !linkEl) return;

        const brandName = brandEl?.textContent?.trim() ?? "";
        const fullTitle = titleEl.textContent?.trim() ?? "";
        const href = (linkEl as HTMLAnchorElement).href;
        const priceText = priceEl?.textContent?.trim() ?? "";
        const originalText = originalPriceEl?.textContent?.trim() ?? "";

        const price = parseFloat(priceText.replace(/[^0-9.]/g, ""));
        const originalPrice = parseFloat(originalText.replace(/[^0-9.]/g, ""));

        if (isNaN(price) || price <= 0) return;

        const onSale = !isNaN(originalPrice) && originalPrice > price;

        products.push({
          brandName,
          title: fullTitle,
          price,
          compareAtPrice: onSale ? originalPrice : null,
          onSale,
          url: href,
        });
      } catch {
        // skip malformed tile
      }
    });

    return products;
  });
}

async function upsertSeller(product: REIProduct, brandKey: string): Promise<boolean> {
  const normalizedTitle = normalizeTitle(product.title, product.brandName);
  const words = normalizedTitle.split(/\s+/).filter((w) => w.length > 3);
  if (words.length === 0) return false;

  const existing = await prisma.product.findFirst({
    where: {
      brand: brandKey,
      AND: words.slice(0, 4).map((w) => ({
        title: { contains: w, mode: "insensitive" as const },
      })),
    },
    select: { id: true, sellers: true },
  });

  if (!existing) return false;

  const sellers: Seller[] = JSON.parse(existing.sellers || "[]");
  const idx = sellers.findIndex((s) => s.seller === "rei");

  const entry: Seller = {
    seller: "rei",
    displayName: "REI",
    url: product.url,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    onSale: product.onSale,
  };

  if (idx >= 0) {
    sellers[idx] = entry;
  } else {
    sellers.push(entry);
  }

  await prisma.product.update({
    where: { id: existing.id },
    data: { sellers: JSON.stringify(sellers) },
  });

  return true;
}

export async function scrapeREI(): Promise<{ found: number; matched: number }> {
  console.log(`[${BRAND_DISPLAY}] Starting scrape...`);

  const browser = await chromium.launch({
    headless: true,
    ...(CHROME_PATH && { executablePath: CHROME_PATH }),
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
  });

  let totalFound = 0;
  let totalMatched = 0;

  try {
    for (const { brandKey, reiSlug } of REI_BRANDS) {
      const url = `${BASE_URL}/brand/${reiSlug}?cat=mens-clothing`;
      const page = await context.newPage();

      try {
        console.log(`[${BRAND_DISPLAY}] Scraping ${reiSlug} men's clothing`);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await delay(3000);

        const products = await extractProducts(page);
        console.log(`[${BRAND_DISPLAY}] Found ${products.length} products for ${reiSlug}`);
        totalFound += products.length;

        for (const product of products) {
          const matched = await upsertSeller(product, brandKey);
          if (matched) totalMatched++;
        }
      } catch (err) {
        console.error(`[${BRAND_DISPLAY}] Error for ${reiSlug}:`, err instanceof Error ? err.message.slice(0, 100) : err);
      } finally {
        await page.close();
        await delay(2000);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`[${BRAND_DISPLAY}] Done. ${totalFound} found, ${totalMatched} matched`);
  return { found: totalFound, matched: totalMatched };
}
