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
  const { fetchUnreadEmails } = await import("./lib/gmail");
  const { processEmails } = await import("./lib/email-parser");

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

  // Remove women's products that slipped through earlier filter bugs
  // Wipe all BYLT and Rhone products — they'll be re-scraped cleanly with the new type filter
  const byltWipe = await prisma.product.deleteMany({ where: { brand: "bylt" } });
  if (byltWipe.count > 0) console.log(`[Migration] Wiped ${byltWipe.count} BYLT products for clean rescrape`);
  const rhoneWipe = await prisma.product.deleteMany({ where: { brand: "rhone" } });
  if (rhoneWipe.count > 0) console.log(`[Migration] Wiped ${rhoneWipe.count} Rhone products for clean rescrape`);

  // Remove any remaining women's products by title prefix
  const womensPrefixDelete = await prisma.product.deleteMany({
    where: { title: { startsWith: "Women" } },
  });
  if (womensPrefixDelete.count > 0) {
    console.log(`[Migration] Deleted ${womensPrefixDelete.count} women's products (title prefix)`);
  }
  // Remove by keyword
  const womensKeywordDelete = await prisma.product.deleteMany({
    where: { OR: [{ title: { contains: "women's" } }, { title: { contains: "skirt" } }, { title: { contains: "Rally Skirt" } }] },
  });
  if (womensKeywordDelete.count > 0) {
    console.log(`[Migration] Deleted ${womensKeywordDelete.count} women's products (keyword match)`);
  }

  console.log("[Scheduler] Registering crons: scrape (3AM + 11AM CST), email poll (every hour)");

  // Poll Gmail inbox every hour for new brand emails
  cron.schedule("0 * * * *", async () => {
    console.log("[Email] Polling Gmail inbox...");
    try {
      const since = new Date(Date.now() - 65 * 60 * 1000); // last 65 min (slight overlap)
      const emails = await fetchUnreadEmails(since);
      if (emails.length > 0) {
        await processEmails(emails);
      } else {
        console.log("[Email] No new emails");
      }
    } catch (err) {
      console.error("[Email] Poll failed:", err instanceof Error ? err.message : err);
    }
  });

  // 3:00 AM CST = 09:00 UTC
  cron.schedule("0 9 * * *", async () => {
    console.log("[Scheduler] Running 3AM CST scrape...");
    try {
      await runAllScrapers();
    } catch (err) {
      console.error("[Scheduler] 3AM scrape failed:", err);
    }
  });

  // 11:00 AM CST = 17:00 UTC
  cron.schedule("0 17 * * *", async () => {
    console.log("[Scheduler] Running 11AM CST scrape...");
    try {
      await runAllScrapers();
    } catch (err) {
      console.error("[Scheduler] 11AM scrape failed:", err);
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
