import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";
import type { Seller } from "@/types";

const BRAND_DISPLAY = "Nordstrom";
const BASE_URL = "https://www.nordstrom.com";

// Map our brand keys to Nordstrom brand filter slugs
const NORDSTROM_BRANDS: { brandKey: string; nordstromBrand: string }[] = [
  { brandKey: "vuori", nordstromBrand: "Vuori" },
  { brandKey: "lululemon", nordstromBrand: "lululemon" },
  { brandKey: "rhone", nordstromBrand: "Rhone" },
  { brandKey: "alo-yoga", nordstromBrand: "ALO" },
  { brandKey: "ten-thousand", nordstromBrand: "Ten Thousand" },
  { brandKey: "public-rec", nordstromBrand: "Public Rec" },
];

// Use macOS Chrome to bypass Akamai; fall back to Playwright's bundled Chromium on Linux
const CHROME_PATH =
  process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : undefined;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTitle(title: string, brandName: string): string {
  // Remove brand prefix from title (Nordstrom often prepends brand name)
  const withoutBrand = title.replace(new RegExp(`^${brandName}\\s+`, "i"), "");
  return withoutBrand.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function normalizeBrandKey(brandName: string): string {
  return brandName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

interface NordstromProduct {
  brandName: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  onSale: boolean;
  url: string;
}

async function extractProducts(page: import("playwright").Page): Promise<NordstromProduct[]> {
  return page.evaluate(() => {
    const products: Array<{
      brandName: string; title: string; price: number;
      compareAtPrice: number | null; onSale: boolean; url: string;
    }> = [];

    // Nordstrom product cards
    const cards = document.querySelectorAll('[data-element-id="ProductCard"]');
    cards.forEach((card) => {
      try {
        const brandEl = card.querySelector('[data-element-id="ProductBrand"]') ??
          card.querySelector('[class*="brand"]');
        const titleEl = card.querySelector('[data-element-id="ProductTitle"]') ??
          card.querySelector('[class*="title"]');
        const priceEls = card.querySelectorAll('[data-element-id*="Price"], [class*="price"]');
        const linkEl = card.querySelector("a[href]");

        if (!brandEl || !titleEl || !linkEl) return;

        const brandName = brandEl.textContent?.trim() ?? "";
        const fullTitle = titleEl.textContent?.trim() ?? "";
        const href = (linkEl as HTMLAnchorElement).href;

        // Parse prices
        const priceTexts = Array.from(priceEls).map((el) =>
          el.textContent?.trim() ?? ""
        ).filter(Boolean);

        const prices = priceTexts
          .map((t) => parseFloat(t.replace(/[^0-9.]/g, "")))
          .filter((n) => !isNaN(n) && n > 0);

        if (prices.length === 0) return;

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const onSale = prices.length > 1 && maxPrice > minPrice;

        products.push({
          brandName,
          title: fullTitle,
          price: minPrice,
          compareAtPrice: onSale ? maxPrice : null,
          onSale,
          url: href,
        });
      } catch {
        // skip malformed card
      }
    });

    return products;
  });
}

async function upsertSeller(product: NordstromProduct, brandKey: string): Promise<boolean> {
  const normalizedTitle = normalizeTitle(product.title, product.brandName);
  const words = normalizedTitle.split(/\s+/).filter((w) => w.length > 3);
  if (words.length === 0) return false;

  // Find matching product by brand + title similarity (all significant words must match)
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
  const idx = sellers.findIndex((s) => s.seller === "nordstrom");

  const entry: Seller = {
    seller: "nordstrom",
    displayName: "Nordstrom",
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

export async function scrapeNordstrom(): Promise<{ found: number; matched: number }> {
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
    for (const { brandKey, nordstromBrand } of NORDSTROM_BRANDS) {
      const url = `${BASE_URL}/search?origin=keywordsearch&keyword=${encodeURIComponent(nordstromBrand + " men activewear")}&top=72&start=0`;
      const page = await context.newPage();

      try {
        console.log(`[${BRAND_DISPLAY}] Searching "${nordstromBrand}" men activewear`);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await delay(3000);

        const products = await extractProducts(page);
        console.log(`[${BRAND_DISPLAY}] Found ${products.length} products for ${nordstromBrand}`);
        totalFound += products.length;

        for (const product of products) {
          const matched = await upsertSeller(product, brandKey);
          if (matched) totalMatched++;
        }
      } catch (err) {
        console.error(`[${BRAND_DISPLAY}] Error for ${nordstromBrand}:`, err instanceof Error ? err.message.slice(0, 100) : err);
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
