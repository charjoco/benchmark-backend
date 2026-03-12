export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NODE_ENV === "test"
  ) {
    return;
  }

  const { default: cron } = await import("node-cron");
  const { runAllScrapers } = await import("./lib/scrapers");

  console.log("[Scheduler] Registering daily scrape cron (3:00 AM)");

  cron.schedule("0 3 * * *", async () => {
    console.log("[Scheduler] Running daily scrape...");
    try {
      await runAllScrapers();
    } catch (err) {
      console.error("[Scheduler] Daily scrape failed:", err);
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
