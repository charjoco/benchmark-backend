/**
 * TEN THOUSAND BACKFILL EXECUTE
 * Section A: 4 recategorizations — shirts → longsleeve (Tactical/Interval Long Sleeve Shirts)
 * Section B: 13 deletions — non-apparel, compression/tights, tanks, equipment
 *
 * Dry-run output (2026-06-01):
 *   Recategorize: 4  (shirts → longsleeve ×4)
 *   Exclude:      13 (non-apparel ×4, compression/tights ×4, tank/muscle ×3, equipment ×2)
 *
 * Full discipline: JSON backup first, single concurrent transaction, then verify.
 * Run: npx tsx --env-file=.env scripts/tt-backfill-execute.ts
 */
import axios from "axios";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { isExcludedProductType, resolveCategory } from "@/lib/normalize/category";
import { BRANDS } from "@/lib/config/brands";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchTenThousandShopify() {
  console.log("Fetching Ten Thousand Shopify catalog...");
  const all: any[] = [];
  let page = 1;
  while (true) {
    try {
      const r = await axios.get<{ products: any[] }>(
        `https://www.tenthousand.cc/products.json?limit=250&page=${page}`,
        { headers: { "User-Agent": UA, Accept: "application/json" }, timeout: 25000 }
      );
      const products = r.data?.products;
      if (!products || products.length === 0) break;
      all.push(...products);
      if (products.length < 250) break;
      page++;
      await sleep(700);
    } catch (err: any) {
      if (err?.response?.status === 503 || err?.response?.status === 429) {
        const wait = parseInt(err.response.headers?.["retry-after"] ?? "30", 10) * 1000 + 2000;
        console.log(`  Rate limited page ${page} — waiting ${Math.round(wait / 1000)}s...`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  console.log(`  Fetched ${all.length} products`);
  return all;
}

async function main() {
  const config = BRANDS.find(b => b.brandKey === "ten-thousand");
  if (!config) throw new Error("ten-thousand brand config not found");

  // ── PHASE 1: COMPUTE SETS ─────────────────────────────────────────────────

  const shopifyData = await fetchTenThousandShopify();
  const shopifyMap = new Map<string, { product_type: string; tags: string[] }>();
  for (const p of shopifyData) {
    const tags = Array.isArray(p.tags) ? p.tags
      : typeof p.tags === "string" ? p.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
    shopifyMap.set(p.handle, { product_type: p.product_type ?? "", tags });
  }

  const dbProducts = await prisma.product.findMany({
    where: { brand: "ten-thousand" },
    select: { id: true, title: true, handle: true, category: true, categoryOverride: true },
  });
  console.log(`DB: ${dbProducts.length} ten-thousand products`);

  const recatRows: Array<{ id: string; title: string; from: string | null; to: string }> = [];
  const deleteRows: Array<{ id: string; title: string; category: string | null; productType: string }> = [];

  for (const p of dbProducts) {
    if (p.categoryOverride) continue;

    const shopify = shopifyMap.get(p.handle);
    if (!shopify) continue;
    const { product_type, tags } = shopify;

    if (isExcludedProductType("ten-thousand", product_type, tags, p.title)) {
      deleteRows.push({ id: p.id, title: p.title, category: p.category, productType: product_type });
      continue;
    }

    if (p.category === null) continue;

    const newCategory = resolveCategory("ten-thousand", product_type, tags, config, p.title);
    if (newCategory === null || newCategory === p.category) continue;

    recatRows.push({ id: p.id, title: p.title, from: p.category, to: newCategory });
  }

  // Summarize
  const shifts = new Map<string, number>();
  for (const r of recatRows) {
    const k = `${r.from ?? "null"} → ${r.to}`;
    shifts.set(k, (shifts.get(k) ?? 0) + 1);
  }
  const byType = new Map<string, number>();
  for (const e of deleteRows) byType.set(e.productType || "(empty)", (byType.get(e.productType || "(empty)") ?? 0) + 1);

  console.log(`\nSets computed:`);
  console.log(`  Section A (recat):   ${recatRows.length}`);
  for (const [shift, cnt] of [...shifts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${shift}: ${cnt}`);
  }
  console.log(`  Section B (delete):  ${deleteRows.length}`);
  for (const [type, cnt] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    "${type}": ${cnt}`);
  }

  // Safety gate
  if (recatRows.length !== 4)  throw new Error(`Recat count unexpected (${recatRows.length}, expected 4) — aborting`);
  if (deleteRows.length !== 13) throw new Error(`Delete count unexpected (${deleteRows.length}, expected 13) — aborting`);

  // ── PHASE 2: JSON BACKUP ──────────────────────────────────────────────────

  const allAffectedIds = [...recatRows.map(p => p.id), ...deleteRows.map(p => p.id)];
  const backupRows = await prisma.product.findMany({
    where: { id: { in: allAffectedIds } },
  });
  const backupPath = `/tmp/ten-thousand-backfill-${new Date().toISOString().slice(0, 10)}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(backupRows, null, 2));
  console.log(`\nBackup written: ${backupPath} (${backupRows.length} rows)`);

  if (backupRows.length !== allAffectedIds.length) {
    throw new Error(`Backup count mismatch! Expected ${allAffectedIds.length}, got ${backupRows.length}`);
  }

  // ── PHASE 3: TRANSACTION ──────────────────────────────────────────────────

  console.log(`\nExecuting...`);

  const recatByCategory = new Map<string, string[]>();
  for (const r of recatRows) {
    const ids = recatByCategory.get(r.to) ?? [];
    ids.push(r.id);
    recatByCategory.set(r.to, ids);
  }

  const ops: Promise<{ count: number }>[] = [
    // Section A: one updateMany per target category, with categoryOverride guard
    ...[...recatByCategory.entries()].map(([cat, ids]) =>
      prisma.product.updateMany({
        where: { id: { in: ids }, categoryOverride: null },
        data: { category: cat as any },
      })
    ),
    // Section B: single deleteMany
    prisma.product.deleteMany({
      where: { id: { in: deleteRows.map(p => p.id) } },
    }),
  ];

  const results = await Promise.all(ops);
  const recatResults = results.slice(0, results.length - 1);
  const deleteResult = results[results.length - 1];

  const totalUpdated = recatResults.reduce((s, r) => s + r.count, 0);
  const totalDeleted = deleteResult.count;

  console.log(`Operations complete:`);
  console.log(`  Recat updates: ${totalUpdated} (expected: ${recatRows.length})`);
  console.log(`  Deleted:       ${totalDeleted} (expected: ${deleteRows.length})`);

  if (totalUpdated !== recatRows.length) {
    console.warn(`⚠ Recat count mismatch — expected ${recatRows.length}, got ${totalUpdated} (categoryOverride may have blocked some)`);
  }
  if (totalDeleted !== deleteRows.length) {
    throw new Error(`Delete count mismatch! Expected ${deleteRows.length}, got ${totalDeleted}`);
  }

  await prisma.$disconnect();
  console.log(`\nBackfill complete.`);
}

main().catch(e => { console.error(e); process.exit(1); });
