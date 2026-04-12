import { prisma } from "@/lib/prisma";
import { BRANDS } from "@/lib/config/brands";
import { scrapeShopifyBrand } from "./shopify";

async function runWithLog(
  brand: string,
  fn: () => Promise<{ found: number; upserted: number }>,
  maxAttempts = 2
): Promise<void> {
  const log = await prisma.scrapeLog.create({
    data: { brand, status: "running" },
  });

  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        const backoff = attempt * 30000; // 30s, 60s
        console.log(`[Scraper] ${brand}: retry attempt ${attempt} in ${backoff / 1000}s...`);
        await new Promise((r) => setTimeout(r, backoff));
      }

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
      return;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[Scraper] ${brand}: attempt ${attempt} failed — ${lastError}`);
    }
  }

  await prisma.scrapeLog.update({
    where: { id: log.id },
    data: { status: "error", finishedAt: new Date(), errorMessage: lastError },
  });
}

export async function runAllScrapers(): Promise<void> {
  console.log("[Scraper] Starting full scrape...");
  const startTime = Date.now();

  for (const brand of BRANDS) {
    await runWithLog(brand.brandKey, () => scrapeShopifyBrand(brand));
  }

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
  await runWithLog(brand.brandKey, () => scrapeShopifyBrand(brand));
}
