/**
 * One-time cleanup: delete Taylor Stitch products that pre-date the
 * isArchivedProduct / isExcludedTaylorStitchTitle / TS_EXCLUDED_PRODUCT_TYPES deploy.
 *
 * Background: the scraper's Step 2 precheck.category shortcut means
 * already-categorized products bypass exclusion checks on subsequent scrapes.
 * visionFailed stub rows also persist until explicitly removed.
 * This script clears both categories from the back catalog.
 *
 * Scope: products where (category IS NOT NULL OR visionFailed = true).
 *
 * Key difference from TM cleanup: tags and productType are not stored in the DB.
 * Exclusion checks that require those fields (ARCHIVE, product_type) are resolved
 * by cross-referencing with the local Shopify catalog snapshot. The catalog must
 * exist at CATALOG_PATH before running.
 *
 * Usage:
 *   # 1. Preview (DRY_RUN = true at top of file):
 *   DATABASE_URL=... npx tsx scripts/cleanup-taylor-stitch-exclusions.ts
 *
 *   # 2. After approving count, set DRY_RUN = false and EXPECTED_COUNT = <preview total>:
 *   DATABASE_URL=... npx tsx scripts/cleanup-taylor-stitch-exclusions.ts
 *
 * Guardrails:
 *   - DRY_RUN mode prints full stats and exits without deleting.
 *   - Wrapped in a transaction; rolls back if delete count deviates from EXPECTED_COUNT.
 *   - Products with categoryOverride are always skipped and surfaced for manual review.
 *   - Products not found in the catalog snapshot are flagged separately (stale entries).
 *   - Post-delete verification re-runs the full exclusion check against the DB.
 */

import * as fs from "fs";
import { prisma } from "@/lib/prisma";
import {
  isArchivedProduct,
  isExcludedTaylorStitchTitle,
  TS_EXCLUDED_PRODUCT_TYPES,
} from "@/lib/brands/taylor-stitch/categories";

// ─── Configuration ──────────────────────────────────────────────────────────

const DRY_RUN = false;
const EXPECTED_COUNT = 3259;

const CATALOG_PATH = "/tmp/taylor-stitch-products.json";

// ─── Catalog cross-reference ─────────────────────────────────────────────────

interface CatalogEntry {
  tags: string[];
  productType: string;
}

function loadCatalog(): Map<string, CatalogEntry> {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(
      `Catalog snapshot not found at ${CATALOG_PATH}. ` +
      `Fetch it first: paginate https://taylorstitch.com/products.json and save to that path.`
    );
  }
  const raw = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const byHandle = new Map<string, CatalogEntry>();
  for (const p of raw.products ?? []) {
    byHandle.set(p.handle as string, {
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
      productType: (p.product_type as string) ?? "",
    });
  }
  return byHandle;
}

// ─── Exclusion reason detection ───────────────────────────────────────────────

type ExclusionReason = "ARCHIVE" | "product_type" | "title_keyword";

function detectExclusionReason(
  title: string,
  catalogEntry: CatalogEntry | undefined
): ExclusionReason | null {
  const tags = catalogEntry?.tags ?? [];
  const productType = catalogEntry?.productType ?? "";

  if (isArchivedProduct(tags)) return "ARCHIVE";
  if (TS_EXCLUDED_PRODUCT_TYPES.has(productType.toLowerCase().trim())) return "product_type";
  if (isExcludedTaylorStitchTitle(title)) return "title_keyword";
  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== TAYLOR STITCH EXCLUSIONS CLEANUP ===\n");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no deletes)" : "EXECUTE"}\n`);

  // Phase 1: load catalog snapshot
  const catalog = loadCatalog();
  console.log(`Catalog snapshot loaded: ${catalog.size} products from ${CATALOG_PATH}\n`);

  // Phase 2: fetch DB candidates
  const candidates = await prisma.product.findMany({
    where: {
      brand: "taylor-stitch",
      OR: [
        { category: { not: null } },
        { visionFailed: true },
      ],
    },
    select: {
      id: true,
      handle: true,
      title: true,
      category: true,
      categoryOverride: true,
      visionFailed: true,
    },
  });

  console.log(`DB candidates (category NOT NULL or visionFailed): ${candidates.length}\n`);

  // Phase 3: classify each candidate
  const toDelete: typeof candidates = [];
  const withOverride: typeof candidates = [];
  const notInCatalog: typeof candidates = [];
  const byReason: Record<ExclusionReason, number> = { ARCHIVE: 0, product_type: 0, title_keyword: 0 };
  const byCategory: Record<string, number> = {};

  for (const p of candidates) {
    const catalogEntry = catalog.get(p.handle);

    // Products not in catalog snapshot — likely stale or very new; flag separately
    if (!catalogEntry) {
      notInCatalog.push(p);
      continue;
    }

    const reason = detectExclusionReason(p.title, catalogEntry);
    if (!reason) continue; // not excluded — keep in DB

    if (p.categoryOverride) {
      withOverride.push(p);
      continue;
    }

    toDelete.push(p);
    byReason[reason]++;

    const cat = p.visionFailed && !p.category ? "(visionFailed stub)" : (p.category ?? "(null)");
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }

  // Phase 4: preview output (always runs)
  console.log("=== DELETION PREVIEW ===\n");
  console.log(`Total targeted for deletion: ${toDelete.length}`);

  console.log("\nBy exclusion reason:");
  console.log(`  ${byReason.ARCHIVE.toString().padStart(5)}  ARCHIVE tag`);
  console.log(`  ${byReason.product_type.toString().padStart(5)}  excluded product_type`);
  console.log(`  ${byReason.title_keyword.toString().padStart(5)}  title keyword (Blazer/Sportcoat)`);

  console.log("\nBy current DB state:");
  Object.entries(byCategory).sort((a, b) => b[1] - a[1])
    .forEach(([cat, n]) => console.log(`  ${n.toString().padStart(5)}  ${cat}`));

  if (withOverride.length > 0) {
    console.log(`\ncategoryOverride (SKIPPED — manual review required): ${withOverride.length}`);
    withOverride.forEach((p) =>
      console.log(`  [override: ${p.categoryOverride}] ${p.title}`)
    );
  } else {
    console.log(`\ncategoryOverride conflicts: none — safe to proceed`);
  }

  if (notInCatalog.length > 0) {
    console.log(`\nNot in catalog snapshot (flagged, not deleted): ${notInCatalog.length}`);
    notInCatalog.slice(0, 10).forEach((p) =>
      console.log(`  [${p.visionFailed ? "visionFailed" : p.category}] ${p.title}`)
    );
    if (notInCatalog.length > 10) console.log(`  … and ${notInCatalog.length - 10} more`);
  }

  const sample = [...toDelete].sort(() => Math.random() - 0.5).slice(0, 20);
  console.log("\n20 random sample titles:");
  sample.forEach((p) => {
    const state = p.visionFailed && !p.category ? "visionFailed" : (p.category ?? "null");
    const entry = catalog.get(p.handle);
    const reason = detectExclusionReason(p.title, entry);
    console.log(`  [${state}] [${reason}] ${p.title}`);
  });

  if (DRY_RUN) {
    console.log("\nDRY RUN complete. No changes made.");
    console.log(`→ Set DRY_RUN = false and EXPECTED_COUNT = ${toDelete.length} to execute.`);
    await prisma.$disconnect();
    return;
  }

  // Phase 5: backup — write full row data to /tmp before any delete fires
  const backupPath = `/tmp/ts-cleanup-backup-${Date.now()}.json`;
  const backupPayload = toDelete.map((p) => ({
    ...p,
    catalogEntry: catalog.get(p.handle),
    exclusionReason: detectExclusionReason(p.title, catalog.get(p.handle)),
  }));
  fs.writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2));
  console.log(`\nBackup written to: ${backupPath}  (${toDelete.length} rows, local /tmp only)`);

  // Phase 6: count guard
  if (toDelete.length !== EXPECTED_COUNT) {
    console.error(
      `\nABORTED: count mismatch. Expected ${EXPECTED_COUNT}, got ${toDelete.length}. ` +
      `Re-run in DRY_RUN mode and update EXPECTED_COUNT.`
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  // Phase 7: transactional delete
  const ids = toDelete.map((p) => p.id);
  console.log(`\nCount matches expected (${EXPECTED_COUNT}). Executing transaction...`);

  const deleted = await prisma.$transaction(async (tx) => {
    const result = await tx.product.deleteMany({ where: { id: { in: ids } } });
    if (result.count !== EXPECTED_COUNT) {
      throw new Error(
        `Transaction rollback: deleteMany returned ${result.count}, expected ${EXPECTED_COUNT}.`
      );
    }
    return result.count;
  });

  console.log(`\nDELETED: ${deleted} products.\n`);

  // Phase 8: post-delete verification
  console.log("=== POST-DELETE VERIFICATION ===");

  const remaining = await prisma.product.findMany({
    where: {
      brand: "taylor-stitch",
      OR: [{ category: { not: null } }, { visionFailed: true }],
    },
    select: { id: true, handle: true, title: true, category: true, visionFailed: true },
  });

  let stillExcluded = 0;
  for (const p of remaining) {
    const catalogEntry = catalog.get(p.handle);
    const reason = detectExclusionReason(p.title, catalogEntry);
    if (reason) stillExcluded++;
  }

  if (stillExcluded === 0) {
    console.log("✓ Zero excluded products remain in DB. Cleanup confirmed clean.");
  } else {
    console.log(`WARNING: ${stillExcluded} excluded products still present. Investigate.`);
  }

  console.log(`Remaining TS products in DB: ${remaining.length}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("\nFATAL:", e.message ?? e);
  await prisma.$disconnect();
  process.exit(1);
});
