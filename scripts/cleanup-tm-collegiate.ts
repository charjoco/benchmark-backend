/**
 * One-shot cleanup: purge the TravisMathew licensed college/pro items that leaked into the
 * live catalog while the collegiate-collection exclusion fetch was failing open under 429s
 * (see lib/scrapers/shopify.ts fail-closed fix). These are exactly the rows the scraper's
 * stale-prune will remove on the next SUCCESSFUL post-fix cron — this script just does it now
 * instead of waiting for a clean fetch to land.
 *
 *   PREVIEW (read-only, default):  npx tsx --tsconfig tsconfig.json scripts/cleanup-tm-collegiate.ts
 *   EXECUTE (after you confirm):    npx tsx --tsconfig tsconfig.json scripts/cleanup-tm-collegiate.ts --execute
 *
 * Target set is AUTHORITATIVE: the current members of TravisMathew's `collegiate-collection`
 * (the same set the scraper excludes). If that endpoint 429s through all retries, it falls back
 * to a title heuristic and LOUDLY labels the preview as heuristic so you can eyeball before go.
 *
 * ORDERING: run this AFTER the fail-closed fix is deployed. Run against the OLD code and the
 * next (buggy, fail-open) cron re-upserts these rows from the main catalog and they come back.
 * Post-fix, a failing fetch aborts the scrape (no re-upsert) and a succeeding fetch excludes
 * them — so the deletion sticks either way.
 *
 * Guardrails: preview-gated (no delete without --execute), transaction with a count guard.
 */
import "dotenv/config";
import axios from "axios";
import { prisma } from "@/lib/prisma";

const EXECUTE = process.argv.includes("--execute");
const BRAND = "travis-mathew";
const HANDLE = "collegiate-collection";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const RETRY_DELAYS_MS = [3000, 8000, 20000]; // spaced — do not hammer a rate-limiting live brand

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Authoritative: live collegiate-collection member IDs (collection is ~154 items → single page).
// Returns null if every retry failed (429/5xx/timeout) so the caller can fall back to titles.
async function fetchCollegiateIds(): Promise<Set<string> | null> {
  const url = `https://travismathew.com/collections/${HANDLE}/products.json?limit=250&page=1`;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      console.log(`  collegiate fetch: retry ${attempt}/${RETRY_DELAYS_MS.length} in ${RETRY_DELAYS_MS[attempt - 1] / 1000}s…`);
      await sleep(RETRY_DELAYS_MS[attempt - 1]);
    }
    try {
      const res = await axios.get<{ products?: { id: number }[] }>(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        timeout: 20000,
      });
      return new Set((res.data?.products ?? []).map((p) => String(p.id)));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) return new Set(); // collection gone → empty
      // 429/5xx/timeout → retry
    }
  }
  return null;
}

// Title fallback (heuristic) — only used if the authoritative fetch fully fails.
const LICENSED_TOKENS = [
  "time to tailgate", "playoffs 2.0", "fight song", "gameday", "game day", "tailgate", "collegiate",
  // schools / teams seen in the collection
  "usc", "lsu", "ucla", "asu", "alabama", "utah", "michigan", "auburn", "clemson", "oregon", "texas",
  "yankees", "red sox", "dodgers", "cubs", "royals", "braves", "mets", "phillies", "astros", "rangers",
];
function looksLicensed(title: string): boolean {
  const t = ` ${title.toLowerCase()} `;
  return LICENSED_TOKENS.some((tok) => t.includes(tok.length <= 4 ? ` ${tok} ` : tok));
}

async function main() {
  console.log(`=== TravisMathew collegiate cleanup — ${EXECUTE ? "EXECUTE" : "PREVIEW (read-only)"} ===\n`);

  const rows = await prisma.product.findMany({
    where: { brand: BRAND },
    select: { id: true, externalId: true, title: true, inStock: true },
  });

  const live = await fetchCollegiateIds();
  const authoritative = !!live && live.size > 0;
  let targets: typeof rows;
  let method: string;

  if (authoritative) {
    method = `AUTHORITATIVE — live ${HANDLE} membership (${live!.size} products)`;
    targets = rows.filter((r) => live!.has(r.externalId));
  } else {
    method = live ? "AUTHORITATIVE returned 0 — TITLE HEURISTIC fallback" : "⚠ collegiate fetch FAILED (429/timeout) — TITLE HEURISTIC fallback (may contain false positives)";
    targets = rows.filter((r) => looksLicensed(r.title));
  }

  targets.sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.title.localeCompare(b.title));

  console.log(`Method: ${method}`);
  console.log(`TravisMathew rows in DB: ${rows.length}`);
  console.log(`Would purge: ${targets.length}  (${targets.filter((t) => t.inStock).length} currently served, ${targets.filter((t) => !t.inStock).length} hidden)\n`);
  console.log("TITLES TO PURGE:");
  for (const t of targets) console.log(`  [${t.inStock ? "served" : "hidden"}] ${BRAND} — ${t.title}`);

  if (!EXECUTE) {
    console.log(`\nPREVIEW ONLY — nothing deleted. Re-run with --execute to delete these ${targets.length} rows.`);
    if (!authoritative) console.log("NOTE: this preview is a title heuristic (collegiate fetch is rate-limiting). --execute will refuse until the authoritative fetch lands.");
    await prisma.$disconnect();
    return;
  }

  // Safety: never delete off a lossy heuristic. Only the authoritative collection membership
  // is safe to purge; if the fetch is rate-limiting, retry (it lands reliably from the deployed
  // Railway env / post-fix) rather than deleting title false positives like "West Texas Wind Tee".
  if (!authoritative) {
    console.error("\nREFUSING TO EXECUTE: collegiate-collection fetch failed, so the target set is a title heuristic that may include false positives. Re-run when the fetch succeeds (method line reads AUTHORITATIVE).");
    await prisma.$disconnect();
    process.exit(1);
  }

  if (targets.length === 0) {
    console.log("\nNothing to delete.");
    await prisma.$disconnect();
    return;
  }

  const ids = targets.map((t) => t.id);
  const deleted = await prisma.$transaction(async (tx) => {
    const res = await tx.product.deleteMany({ where: { id: { in: ids } } });
    if (res.count !== ids.length) throw new Error(`rollback: deleted ${res.count}, expected ${ids.length}`);
    return res.count;
  });
  console.log(`\nDELETED ${deleted} rows.`);

  const remaining = await prisma.product.count({ where: { brand: BRAND, inStock: true } });
  console.log(`TravisMathew served now: ${remaining}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("\nFATAL:", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
