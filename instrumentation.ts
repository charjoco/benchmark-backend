export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NODE_ENV === "test"
  ) {
    return;
  }

  const { default: cron } = await import("node-cron");
  const { runAllScrapers } = await import("./lib/scrapers");
  const { prisma } = await import("./lib/prisma");

  // Fix product URLs that still point to myshopify.com domains
  const urlFixes: { brand: string; from: string; to: string }[] = [
    { brand: "vuori", from: "vuori-clothing.myshopify.com", to: "vuoriclothing.com" },
    { brand: "bylt", from: "bylt-apparel.myshopify.com", to: "byltbasics.com" },
    { brand: "buck-mason", from: "buck-mason-usa.myshopify.com", to: "buckmason.com" },
  ];
  for (const { brand, from, to } of urlFixes) {
    const products = await prisma.product.findMany({
      where: { brand, productUrl: { contains: from } },
      select: { id: true, productUrl: true },
    });
    for (const p of products) {
      await prisma.product.update({
        where: { id: p.id },
        data: { productUrl: p.productUrl.replace(from, to) },
      });
    }
    if (products.length > 0) {
      console.log(`[Migration] Fixed ${products.length} ${brand} URLs (${from} → ${to})`);
    }
  }

  console.log("[Scheduler] Registering cron: scrape every hour");

  // Scrape all brands every hour
  cron.schedule("0 * * * *", async () => {
    console.log("[Scheduler] Running hourly scrape...");
    try {
      await runAllScrapers();
    } catch (err) {
      console.error("[Scheduler] Hourly scrape failed:", err);
    }
  });

  if (process.env.RUN_SCRAPE_ON_STARTUP === "true") {
    setTimeout(async () => {
      console.log("[Scheduler] Running startup scrape...");
      try {
        await runAllScrapers();
      } catch (err) {
        console.error("[Scheduler] Startup scrape failed:", err);
      }
    }, 5000);
  }
}
