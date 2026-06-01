/**
 * H&B BACKFILL EXECUTE
 * Applies the dry-run results to the DB:
 *   - JSON backup of all 312 affected rows to /tmp/hb-backfill-backup-<ts>.json
 *   - Transaction: DELETE 134 excluded, UPDATE 178 recategorized
 *   - Post-verify report
 *
 * Run: ./node_modules/.bin/tsx --env-file=.env scripts/hb-backfill-execute.ts
 */

import axios from "axios";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { isExcludedHBProductType, lookupHBCategory } from "@/lib/brands/holderness-bourne/categories";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchHBShopify() {
  console.log("Fetching H&B Shopify catalog...");
  const all: any[] = [];
  let page = 1;
  while (true) {
    try {
      const r = await axios.get<{ products: any[] }>(
        `https://holdernessandbourne.com/products.json?limit=250&page=${page}`,
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
  console.log(`  Fetched ${all.length} Shopify products`);
  return all;
}

async function main() {
  // ── 1. Fetch Shopify ───────────────────────────────────────────────────────
  const shopifyData = await fetchHBShopify();
  const shopifyMap = new Map<string, { product_type: string }>();
  for (const p of shopifyData) {
    shopifyMap.set(p.handle, { product_type: p.product_type ?? "" });
  }

  // ── 2. Query DB ────────────────────────────────────────────────────────────
  const dbProducts = await prisma.product.findMany({
    where: { brand: "holderness-bourne" },
    select: { id: true, title: true, handle: true, category: true, categoryOverride: true },
  });
  console.log(`DB: ${dbProducts.length} holderness-bourne products`);

  // ── 3. Classify (same logic as dry-run) ───────────────────────────────────
  const toDelete: Array<{ id: string; title: string; category: string | null }> = [];
  const toRecat:  Array<{ id: string; title: string; from: string | null; to: string }> = [];
  const unchanged: Array<{ id: string; title: string; category: string | null }> = [];

  for (const p of dbProducts) {
    if (p.categoryOverride) continue;
    const shopify = shopifyMap.get(p.handle);
    if (!shopify) continue; // missing from Shopify — leave alone

    const { product_type } = shopify;

    if (isExcludedHBProductType(product_type, p.title)) {
      toDelete.push({ id: p.id, title: p.title, category: p.category });
      continue;
    }

    const newCategory = lookupHBCategory(product_type, p.title);
    if (newCategory === null || newCategory === p.category) {
      unchanged.push({ id: p.id, title: p.title, category: p.category });
      continue;
    }

    toRecat.push({ id: p.id, title: p.title, from: p.category, to: newCategory });
  }

  console.log(`\nPre-execute classification:`);
  console.log(`  DELETE:    ${toDelete.length}`);
  console.log(`  RECAT:     ${toRecat.length}`);
  console.log(`  UNCHANGED: ${unchanged.length}`);

  const expectedDelete = 134;
  const expectedRecat  = 178;
  if (toDelete.length !== expectedDelete || toRecat.length !== expectedRecat) {
    console.error(`\nCOUNT MISMATCH — aborting.`);
    console.error(`  Expected DELETE ${expectedDelete}, got ${toDelete.length}`);
    console.error(`  Expected RECAT  ${expectedRecat}, got ${toRecat.length}`);
    process.exit(1);
  }

  // ── 4. JSON backup ─────────────────────────────────────────────────────────
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `/tmp/hb-backfill-backup-${ts}.json`;
  const backupRows = [
    ...toDelete.map(r => ({ op: "DELETE", ...r })),
    ...toRecat.map(r => ({ op: "RECAT",  ...r })),
  ];
  fs.writeFileSync(backupPath, JSON.stringify(backupRows, null, 2));
  console.log(`\nBackup written: ${backupPath}`);
  console.log(`  Backup rows: ${backupRows.length} (expected 312)`);
  if (backupRows.length !== 312) {
    console.error("Backup row count mismatch — aborting.");
    process.exit(1);
  }

  // ── 5. Execute in transaction ──────────────────────────────────────────────
  console.log(`\nExecuting transaction...`);
  const deleteIds = toDelete.map(r => r.id);
  const recatUpdates = toRecat.map(r => ({ id: r.id, to: r.to }));

  // Group recats by target category — one updateMany per category instead of 178 individual updates
  const recatByCategory = new Map<string, string[]>();
  for (const { id, to } of recatUpdates) {
    if (!recatByCategory.has(to)) recatByCategory.set(to, []);
    recatByCategory.get(to)!.push(id);
  }
  console.log(`  Recat groups: ${[...recatByCategory.entries()].map(([k, v]) => `${k}: ${v.length}`).join(", ")}`);

  await prisma.$transaction(async (tx) => {
    // DELETE excluded products — single query
    const deleted = await tx.product.deleteMany({
      where: { id: { in: deleteIds } },
    });
    if (deleted.count !== deleteIds.length) {
      throw new Error(`DELETE count mismatch: expected ${deleteIds.length}, got ${deleted.count}`);
    }

    // UPDATE recategorized products — one updateMany per target category
    let totalUpdated = 0;
    for (const [category, ids] of recatByCategory.entries()) {
      const result = await tx.product.updateMany({
        where: { id: { in: ids } },
        data: { category },
      });
      totalUpdated += result.count;
    }
    if (totalUpdated !== recatUpdates.length) {
      throw new Error(`UPDATE count mismatch: expected ${recatUpdates.length}, got ${totalUpdated}`);
    }

    console.log(`  Deleted: ${deleted.count}`);
    console.log(`  Updated: ${totalUpdated}`);
  });

  console.log("Transaction committed.");

  // ── 6. Post-verify ─────────────────────────────────────────────────────────
  console.log("\n=== POST-VERIFY ===");

  const remaining = await prisma.product.findMany({
    where: { brand: "holderness-bourne" },
    select: { id: true, title: true, handle: true, category: true },
  });

  // Gate 1: total count
  const totalRemaining = remaining.length;
  const expectedTotal = dbProducts.length - toDelete.length; // 470 - 134 = 336
  console.log(`\nGate 1 — Total count: ${totalRemaining} (expected ${expectedTotal})`);
  console.log(totalRemaining === expectedTotal ? "  PASS" : "  FAIL ← INVESTIGATE");

  // Gate 2: category distribution
  const dist = new Map<string, number>();
  for (const p of remaining) {
    const k = p.category ?? "null";
    dist.set(k, (dist.get(k) ?? 0) + 1);
  }
  const nullCount = dist.get("null") ?? 0;
  console.log(`\nGate 2 — Category distribution:`);
  for (const [cat, cnt] of [...dist.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${cnt}`);
  }
  console.log(`  NULL categories: ${nullCount} (expected 0)`);
  console.log(nullCount === 0 ? "  PASS" : "  FAIL ← INVESTIGATE");

  // Gate 3: polos populated
  const polosCount = dist.get("polos") ?? 0;
  console.log(`\nGate 3 — Polos populated: ${polosCount} (expected ~168+)`);
  console.log(polosCount >= 168 ? "  PASS" : "  FAIL ← INVESTIGATE");

  // Gate 4: shirts reduced
  const shirtsCount = dist.get("shirts") ?? 0;
  // 222 shirts - 168 recat - 31 excluded = ~23
  console.log(`\nGate 4 — Shirts reduced: ${shirtsCount} (expected ~23)`);
  console.log(shirtsCount <= 30 ? "  PASS" : "  FAIL ← INVESTIGATE");

  // Gate 5: excluded rows truly gone — scan for excluded patterns
  const usOpenRemaining = remaining.filter(p => p.title.toLowerCase().includes("u.s. open"));
  const boysHandles = remaining.filter(p => {
    // Boys products would have been deleted; spot-check by title prefix isn't available
    // but we can verify none of the deleted IDs remain
    return false; // checked via ID absence below
  });
  const deletedIdsSet = new Set(deleteIds);
  const deletedStillPresent = remaining.filter(p => deletedIdsSet.has(p.id));

  console.log(`\nGate 5 — Excluded rows gone:`);
  console.log(`  U.S. Open titles remaining: ${usOpenRemaining.length} (expected 0)`);
  console.log(`  Deleted IDs still present:  ${deletedStillPresent.length} (expected 0)`);
  if (usOpenRemaining.length === 0 && deletedStillPresent.length === 0) {
    console.log("  PASS");
  } else {
    console.log("  FAIL ← INVESTIGATE");
    for (const p of usOpenRemaining) console.log(`    STILL PRESENT: [U.S. Open] ${p.title}`);
  }

  // Gate 6: spot-checks
  console.log(`\nGate 6 — Spot-checks:`);

  // 5 recatted polos (shirts→polos)
  const recatToPolos = toRecat.filter(r => r.to === "polos").slice(0, 5);
  for (const r of recatToPolos) {
    const row = remaining.find(p => p.id === r.id);
    const ok = row?.category === "polos";
    console.log(`  ${ok ? "PASS" : "FAIL"} shirts→polos: "${r.title}" → ${row?.category ?? "MISSING"}`);
  }

  // Anson Chino Pant (shorts→pants)
  const ansonPant = toRecat.find(r => r.title.toLowerCase().includes("anson") && r.to === "pants");
  if (ansonPant) {
    const row = remaining.find(p => p.id === ansonPant.id);
    console.log(`  ${row?.category === "pants" ? "PASS" : "FAIL"} Anson Chino Pant → ${row?.category ?? "MISSING"}`);
  } else {
    console.log(`  WARN Anson Chino Pant not found in recat list`);
  }

  // Sullivan Quarter-Snap (sweaters→zips)
  const sullivan = toRecat.find(r => r.title.toLowerCase().includes("sullivan") && r.to === "zips");
  if (sullivan) {
    const row = remaining.find(p => p.id === sullivan.id);
    console.log(`  ${row?.category === "zips" ? "PASS" : "FAIL"} Sullivan Quarter-Snap → ${row?.category ?? "MISSING"}`);
  } else {
    console.log(`  WARN Sullivan Quarter-Snap not found in recat list`);
  }

  // 5 deleted gone (incl. a U.S. Open item and a Boys item)
  const deletedUSOpen = toDelete.find(r => r.title.toLowerCase().includes("u.s. open"));
  const deletedBoys   = toDelete.find(r => r.title.toLowerCase().includes("boys") ||
    // Boys products don't have "Boys" in title typically — they have it in product_type.
    // Just grab the first 2 deleted items.
    false);
  const spot5deleted = [
    deletedUSOpen,
    toDelete.find(r => r !== deletedUSOpen && r !== deletedBoys),
    toDelete.find(r => r !== deletedUSOpen && r !== toDelete[1]),
    deletedBoys ?? toDelete[2],
    toDelete[3],
  ].filter(Boolean).slice(0, 5);

  for (const r of spot5deleted) {
    if (!r) continue;
    const stillPresent = remaining.find(p => p.id === r.id);
    console.log(`  ${!stillPresent ? "PASS" : "FAIL"} Deleted gone: "${r.title}" (was [${r.category ?? "null"}])`);
  }

  // 5 unchanged items still present with same category
  const spot5unchanged = unchanged.slice(0, 5);
  for (const r of spot5unchanged) {
    const row = remaining.find(p => p.id === r.id);
    const ok = row?.category === r.category;
    console.log(`  ${ok ? "PASS" : "FAIL"} Unchanged: "${r.title}" still [${row?.category ?? "MISSING"}]`);
  }

  console.log("\n=== BACKFILL COMPLETE ===");
  console.log(`Backup: ${backupPath}`);
  console.log(`Deleted: ${toDelete.length} | Recatted: ${toRecat.length} | Remaining: ${totalRemaining}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
