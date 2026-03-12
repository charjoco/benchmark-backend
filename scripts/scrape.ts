import { runAllScrapers, runSingleBrand } from "@/lib/scrapers";

async function main() {
  const args = process.argv.slice(2);
  const brandIdx = args.indexOf("--brand");

  if (brandIdx !== -1 && args[brandIdx + 1]) {
    const brandKey = args[brandIdx + 1];
    console.log(`Running scraper for brand: ${brandKey}`);
    await runSingleBrand(brandKey);
  } else {
    await runAllScrapers();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Scrape failed:", err);
  process.exit(1);
});
