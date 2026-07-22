/**
 * Seed the ExclusionCache table from an IP that CAN reach a brand's collection endpoints.
 * Shopify serves some collections (e.g. TravisMathew's collegiate-collection) as 404/empty to
 * Railway's datacenter IP, so the scraper's live fetch there fails open. Run this from a local IP
 * that gets 200 to prime the cache; the deployed scraper then falls back to it.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/seed-exclusion-cache.ts [brandKey]   (default travis-mathew)
 *
 * Seeds excludeCollectionHandles + licensedCollectionHandles for the brand. Idempotent (upsert).
 */
import "dotenv/config";
import axios from "axios";
import { prisma } from "@/lib/prisma";
import { BRANDS } from "@/lib/config/brands";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const RETRY = [3000, 8000, 20000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchIds(domain: string, handle: string): Promise<Set<string> | null> {
  const ids = new Set<string>();
  for (let page = 1; ; page++) {
    let ok = false;
    for (let a = 0; a <= RETRY.length; a++) {
      if (a > 0) { console.log(`    ${handle} p${page}: retry ${a}/${RETRY.length} in ${RETRY[a - 1] / 1000}s`); await sleep(RETRY[a - 1]); }
      try {
        const res = await axios.get<{ products?: { id: number }[] }>(
          `https://${domain}/collections/${handle}/products.json?limit=250&page=${page}`,
          { headers: { "User-Agent": UA, Accept: "application/json" }, timeout: 20000 }
        );
        const ps = res.data?.products ?? [];
        for (const p of ps) ids.add(String(p.id));
        ok = true;
        if (ps.length < 250) return ids;
        break;
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 404) { console.log(`    ${handle}: 404 from this IP`); return ids.size ? ids : null; }
        // 429/5xx/timeout → retry
      }
    }
    if (!ok) return null; // exhausted retries on this page
    await sleep(800);
  }
}

async function main() {
  const brandKey = process.argv[2] ?? "travis-mathew";
  const brand = BRANDS.find((b) => b.brandKey === brandKey);
  if (!brand) throw new Error(`unknown brand: ${brandKey}`);
  const handles = [...(brand.excludeCollectionHandles ?? []), ...(brand.licensedCollectionHandles ?? [])];
  console.log(`Seeding ExclusionCache for ${brandKey} (${brand.domain}) from local IP.\nHandles: ${handles.join(", ") || "(none)"}\n`);

  for (const handle of handles) {
    const ids = await fetchIds(brand.domain, handle);
    if (!ids || ids.size === 0) { console.log(`  SKIP '${handle}': live fetch failed/empty — not seeding`); continue; }
    await prisma.exclusionCache.upsert({
      where: { brand_handle: { brand: brandKey, handle } },
      create: { brand: brandKey, handle, ids: [...ids], source: "seed" },
      update: { ids: [...ids], source: "seed", fetchedAt: new Date() },
    });
    console.log(`  SEEDED '${handle}': ${ids.size} IDs`);
  }

  const rows = await prisma.exclusionCache.findMany({ where: { brand: brandKey }, orderBy: { handle: "asc" },
    select: { brand: true, handle: true, source: true, fetchedAt: true, ids: true } });
  console.log(`\nExclusionCache rows for ${brandKey}:`);
  for (const r of rows) console.log(`  ${r.brand}/${r.handle}  source=${r.source}  ids=${r.ids.length}  fetchedAt=${r.fetchedAt.toISOString()}`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect(); process.exit(1); });
