import { chromium } from "playwright";

const CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });

  // Intercept network requests to see what API calls Apollo makes
  const graphqlCalls: { url: string; body: string; responseSnippet: string }[] = [];
  const page = await context.newPage();

  page.on("request", (req) => {
    if (req.resourceType() === "fetch" || req.resourceType() === "xhr") {
      const url = req.url();
      if (url.includes("graphql") || url.includes("api")) {
        const body = req.postData() || "";
        if (body.includes("product") || body.includes("collection")) {
          console.log("[REQUEST]", req.method(), url);
          console.log("  body:", body.slice(0, 200));
        }
      }
    }
  });

  page.on("response", async (res) => {
    const url = res.url();
    if ((url.includes("graphql") || url.includes("/api/")) && res.status() === 200) {
      try {
        const text = await res.text();
        if (text.includes('"product"') || text.includes('"collection"') || text.includes('"edges"')) {
          graphqlCalls.push({
            url,
            body: "",
            responseSnippet: text.slice(0, 500),
          });
          console.log("[RESPONSE]", url);
          console.log("  snippet:", text.slice(0, 300));
        }
      } catch {}
    }
  });

  // Try their men's top-level page
  console.log("=== Navigating to /mens ===");
  await page.goto("https://www.aloyoga.com/mens", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await new Promise((r) => setTimeout(r, 6000));

  const info = await page.evaluate(() => ({
    title: document.title,
    url: window.location.href,
    // Count visible products
    productCount: document.querySelectorAll("[class*='ProductCard'], [class*='product-card'], [data-testid*='product']").length,
    // First few links that look like collection/product links
    links: Array.from(document.querySelectorAll("a[href*='/collections/'], a[href*='/products/']"))
      .slice(0, 20)
      .map((a) => (a as HTMLAnchorElement).href),
  }));

  console.log("\n=== PAGE INFO ===");
  console.log("Title:", info.title);
  console.log("URL:", info.url);
  console.log("Product cards:", info.productCount);
  console.log("Collection/product links:", info.links.slice(0, 10));

  console.log(`\n=== Total API calls intercepted: ${graphqlCalls.length} ===`);

  await browser.close();
})();
