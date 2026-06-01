import axios from "axios";
import { prisma } from "@/lib/prisma";
import { isExcludedProductType, resolveCategory } from "@/lib/normalize/category";
import { BRANDS } from "@/lib/config/brands";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  const config = BRANDS.find(b => b.brandKey === "ten-thousand");
  if (!config) throw new Error("ten-thousand brand config not found");

  const dbProducts = await prisma.product.findMany({
    where: { brand: "ten-thousand" },
    select: { id: true, title: true, handle: true, category: true, categoryOverride: true },
  });
  console.log(`DB: ${dbProducts.length} ten-thousand products`);

  // Fetch Shopify
  console.log("Fetching Shopify...");
  const allShopify: any[] = [];
  let page = 1;
  while (true) {
    try {
      const r = await axios.get<{ products: any[] }>(
        `https://www.tenthousand.cc/products.json?limit=250&page=${page}`,
        { headers: { "User-Agent": UA, Accept: "application/json" }, timeout: 20000 }
      );
      const products = r.data?.products;
      if (!products || products.length === 0) break;
      allShopify.push(...products);
      if (products.length < 250) break;
      page++;
      await sleep(600);
    } catch (err: any) {
      if (err?.response?.status === 429 || err?.response?.status === 503) {
        await sleep(30000);
        continue;
      }
      throw err;
    }
  }
  console.log(`Shopify: ${allShopify.length} products`);

  const shopifyMap = new Map<string, { product_type: string; tags: string[] }>();
  for (const p of allShopify) {
    const tags = Array.isArray(p.tags) ? p.tags
      : typeof p.tags === "string" ? p.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
    shopifyMap.set(p.handle, { product_type: p.product_type ?? "", tags });
  }

  const EXCLUDE: Array<{ id: string; title: string; category: string | null; productType: string }> = [];
  const RECATEGORIZE: Array<{ id: string; title: string; from: string | null; to: string }> = [];
  const UNCHANGED: string[] = [];
  const MISSING: Array<{ id: string; title: string; handle: string }> = [];
  const OVERRIDE_SKIP: Array<{ id: string; title: string }> = [];

  for (const p of dbProducts) {
    if (p.categoryOverride) { OVERRIDE_SKIP.push({ id: p.id, title: p.title }); continue; }
    const shopify = shopifyMap.get(p.handle);
    if (!shopify) { MISSING.push({ id: p.id, title: p.title, handle: p.handle }); continue; }
    const { product_type, tags } = shopify;

    if (isExcludedProductType("ten-thousand", product_type, tags, p.title)) {
      EXCLUDE.push({ id: p.id, title: p.title, category: p.category, productType: product_type });
      continue;
    }
    if (p.category === null) { UNCHANGED.push(p.id); continue; }

    const newCategory = resolveCategory("ten-thousand", product_type, tags, config, p.title);
    if (newCategory === null || newCategory === p.category) { UNCHANGED.push(p.id); continue; }
    RECATEGORIZE.push({ id: p.id, title: p.title, from: p.category, to: newCategory });
  }

  // Shift summary
  const shifts = new Map<string, number>();
  for (const r of RECATEGORIZE) {
    const k = `${r.from ?? "null"} → ${r.to}`;
    shifts.set(k, (shifts.get(k) ?? 0) + 1);
  }
  const byType = new Map<string, number>();
  for (const e of EXCLUDE) byType.set(e.productType || "(empty)", (byType.get(e.productType || "(empty)") ?? 0) + 1);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`EXCLUDE SET: ${EXCLUDE.length}`);
  for (const [type, cnt] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  "${type}": ${cnt}`);
  }
  console.log("\n  Full list:");
  EXCLUDE.forEach(e => console.log(`  [${e.category ?? "null"}] ${e.title} (type: ${e.productType})`));

  console.log(`\n${"=".repeat(60)}`);
  console.log(`RECATEGORIZE SET: ${RECATEGORIZE.length}`);
  for (const [shift, cnt] of [...shifts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${shift}: ${cnt}`);
  }
  if (RECATEGORIZE.length > 0) {
    console.log("\n  Full list:");
    RECATEGORIZE.forEach(r => console.log(`  ${r.from ?? "null"} → ${r.to}: "${r.title}"`));
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`UNCHANGED: ${UNCHANGED.length}`);
  console.log(`OVERRIDE_SKIP: ${OVERRIDE_SKIP.length}`);
  console.log(`MISSING from Shopify: ${MISSING.length}`);
  if (MISSING.length > 0) MISSING.slice(0, 5).forEach(m => console.log(`  "${m.title}" (${m.handle})`));

  const sum = EXCLUDE.length + RECATEGORIZE.length + UNCHANGED.length + MISSING.length + OVERRIDE_SKIP.length;
  console.log(`\nSum: ${sum} (should equal DB: ${dbProducts.length})`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
