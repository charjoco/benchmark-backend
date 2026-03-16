import { prisma } from "@/lib/prisma";
import { BRANDS } from "@/lib/config/brands";
import { scrapeShopifyBrand } from "./shopify";
import { scrapeLululemon } from "./lululemon";
import { scrapeAloYoga } from "./alo-yoga";

async function runWithLog(
  brand: string,
  fn: () => Promise<{ found: number; upserted: number }>
): Promise<void> {
  const log = await prisma.scrapeLog.create({
    data: { brand, status: "running" },
  });

  try {
    const result = await fn();
    await prisma.scrapeLog.update({
      where: { id: log.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        itemsFound: result.found,
        itemsUpserted: result.upserted,
      },
    });
    console.log(`[Scraper] ${brand}: success (${result.found} found, ${result.upserted} upserted)`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.scrapeLog.update({
      where: { id: log.id },
      data: {
        status: "error",
        finishedAt: new Date(),
        errorMessage: message,
      },
    });
    console.error(`[Scraper] ${brand}: FAILED — ${message}`);
  }
}

export async function runAllScrapers(): Promise<void> {
  console.log("[Scraper] Starting full scrape...");
  const startTime = Date.now();

  // Shopify brands (includes Vuori now)
  for (const brand of BRANDS.filter((b) => b.scraperType === "shopify")) {
    await runWithLog(brand.brandKey, () => scrapeShopifyBrand(brand));
  }

  // Playwright brands
  await runWithLog("lululemon", scrapeLululemon);
  await runWithLog("alo-yoga", scrapeAloYoga);

  // Mark products isNew = false if firstSeenAt > 14 days ago
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const staleCount = await prisma.product.updateMany({
    where: {
      isNew: true,
      firstSeenAt: { lt: fourteenDaysAgo },
    },
    data: { isNew: false },
  });

  if (staleCount.count > 0) {
    console.log(`[Scraper] Unmarked ${staleCount.count} products as no longer new`);
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`[Scraper] Full scrape complete in ${elapsed} minutes`);
}

export async function runSingleBrand(brandKey: string): Promise<void> {
  const brand = BRANDS.find((b) => b.brandKey === brandKey);

  if (!brand) throw new Error(`Unknown brand: ${brandKey}`);

  if (brand.scraperType === "shopify") {
    await runWithLog(brand.brandKey, () => scrapeShopifyBrand(brand));
  } else if (brand.brandKey === "lululemon") {
    await runWithLog("lululemon", scrapeLululemon);
  } else if (brand.brandKey === "alo-yoga") {
    await runWithLog("alo-yoga", scrapeAloYoga);
  } else {
    throw new Error(`No scraper implemented for playwright brand: ${brandKey}`);
  }
}
