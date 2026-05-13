/**
 * One-time cleanup: delete Todd Snyder products that pre-date the TDS per-brand
 * category mapping deploy (lib/brands/todd-snyder/categories.ts).
 *
 * Background: the scraper's Step 2 precheck.category shortcut means
 * already-categorized products bypass exclusion checks on subsequent scrapes.
 * visionFailed stub rows also persist until explicitly removed.
 * This script clears both from the back catalog.
 *
 * Scope: products where (category IS NOT NULL OR visionFailed = true).
 *
 * Like the BM cleanup, tags and productType are not stored in the DB.
 * Exclusion checks that require those fields are resolved by cross-referencing
 * with the local Shopify catalog snapshot. The catalog must exist at CATALOG_PATH
 * before running. Fetch it:
 *   python3 scripts/fetch-catalog.py todd-snyder.myshopify.com > /tmp/todd-snyder-products.json
 * (Or re-use the snapshot already at /tmp/todd-snyder-products.json if current.)
 *
 * Expected scale: ~1,500+ deletions — the largest cleanup in the project to date.
 * Breakdown by pre-existing miscategorization:
 *   - Sportcoat (122) and Suit Outfit (60) types previously admitted as jackets
 *   - Dress Trousers (92) and Suit Pants (86) tags previously admitted as pants
 *   - Shoes (401+) and all accessory product_types previously admitted or vision-failed
 *   - Licensed sports (NFL/NHL/MLB) items previously admitted or vision-failed
 *
 * Usage:
 *   # 1. Preview — no env var needed:
 *   DATABASE_URL=... npx tsx scripts/cleanup-todd-snyder-exclusions.ts
 *
 *   # 2. Execute — set EXPECTED_COUNT to the preview total to unlock:
 *   DATABASE_URL=... EXPECTED_COUNT=<N> npx tsx scripts/cleanup-todd-snyder-exclusions.ts
 *
 * Guardrails:
 *   - Preview mode prints full stats and exits without deleting.
 *   - EXPECTED_COUNT env var must match preview count exactly to proceed.
 *   - Wrapped in a transaction; rolls back if deleteMany count deviates.
 *   - Products with categoryOverride are always skipped and surfaced for review.
 *   - Products not found in the catalog snapshot are flagged (stale entries).
 *   - Post-delete verification re-runs full exclusion check against remaining rows.
 */

import * as fs from "fs";
import { prisma } from "@/lib/prisma";
import {
  TDS_EXCLUDED_PRODUCT_TYPES,
  hasExcludedTDSTag,
  isExcludedTDSLicensedSports,
} from "@/lib/brands/todd-snyder/categories";

// ─── Configuration ───────────────────────────────────────────────────────────

const EXPECTED_COUNT = process.env.EXPECTED_COUNT ? parseInt(process.env.EXPECTED_COUNT, 10) : null;
const DRY_RUN = EXPECTED_COUNT === null;

const CATALOG_PATH = "/tmp/todd-snyder-products.json";

// ─── Catalog cross-reference ─────────────────────────────────────────────────

interface CatalogEntry {
  tags: string[];
  productType: string;
}

function loadCatalog(): Map<string, CatalogEntry> {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(
      `Catalog snapshot not found at ${CATALOG_PATH}. ` +
      `Run: python3 scripts/fetch-catalog.py todd-snyder.myshopify.com > ${CATALOG_PATH}`
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

type ExclusionReason = "licensed_sports" | "product_type" | "tag";

function detectExclusionReason(
  title: string,
  catalogEntry: CatalogEntry | undefined
): ExclusionReason | null {
  const tags = catalogEntry?.tags ?? [];
  const productType = catalogEntry?.productType ?? "";
  const normalized = productType.toLowerCase().trim();

  if (isExcludedTDSLicensedSports(tags, title)) return "licensed_sports";
  if (TDS_EXCLUDED_PRODUCT_TYPES.has(normalized))  return "product_type";
  if (hasExcludedTDSTag(tags))                     return "tag";

  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== TODD SNYDER EXCLUSIONS CLEANUP ===\n");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no deletes)" : `EXECUTE (expected: ${EXPECTED_COUNT})`}\n`);

  // Phase 1: load catalog snapshot
  const catalog = loadCatalog();
  console.log(`Catalog snapshot loaded: ${catalog.size} products from ${CATALOG_PATH}\n`);

  // Phase 2: fetch DB candidates
  const candidates = await prisma.product.findMany({
    where: {
      brand: "todd-snyder",
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

  const byReason: Record<ExclusionReason, number> = {
    licensed_sports: 0,
    product_type: 0,
    tag: 0,
  };
  const byCategory: Record<string, number> = {};

  // Legacy miscategorization trackers
  let sportcoat_as_jackets = 0;
  let suit_outfit_as_jackets = 0;
  let dress_trousers_as_pants = 0;
  let suit_pants_as_pants = 0;
  let shoes_categorized = 0;

  // Tag sub-reason breakdown
  const byTagReason: Record<string, number> = {};

  for (const p of candidates) {
    const catalogEntry = catalog.get(p.handle);

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

    // Legacy miscategorization tallies
    const normalized = catalogEntry.productType.toLowerCase().trim();
    const tagSet = new Set(catalogEntry.tags.map((t) => t.toLowerCase()));

    if (normalized === "sportcoat" && p.category === "jackets")       sportcoat_as_jackets++;
    if (normalized === "suit outfit" && p.category === "jackets")     suit_outfit_as_jackets++;
    if (tagSet.has("style: dress trousers") && p.category === "pants") dress_trousers_as_pants++;
    if (tagSet.has("style: suit pants") && p.category === "pants")    suit_pants_as_pants++;
    if (normalized === "shoes" || normalized === "shoe care")         shoes_categorized++;

    // Tag sub-reason
    if (reason === "tag") {
      const TRACKED_TAGS = [
        "style: dress trousers",
        "style: suit pants",
        "style: tanks",
        "style: baseball caps",
        "style: dress shirts",
        "style: oxford shirts",
        "style: poplin shirts",
        "style: dress shoes",
        "style: suit jackets",
        "style: sport coats",
        "style: sutton",
        "style: wythe",
      ];
      for (const tt of TRACKED_TAGS) {
        if (tagSet.has(tt)) {
          byTagReason[tt] = (byTagReason[tt] ?? 0) + 1;
          break; // first matching tag is the primary reason
        }
      }
    }
  }

  // Phase 4: preview output (always runs)
  console.log("=== DELETION PREVIEW ===\n");
  console.log(`Total targeted for deletion: ${toDelete.length}`);

  console.log("\nBy exclusion reason:");
  console.log(`  ${byReason.licensed_sports.toString().padStart(5)}  licensed sports (NFL/NHL/MLB)`);
  console.log(`  ${byReason.product_type.toString().padStart(5)}  excluded product_type`);
  console.log(`  ${byReason.tag.toString().padStart(5)}  excluded tag`);

  if (Object.keys(byTagReason).length > 0) {
    console.log("\n  Tag reason breakdown:");
    Object.entries(byTagReason).sort((a, b) => b[1] - a[1])
      .forEach(([tag, n]) => console.log(`    ${n.toString().padStart(5)}  ${tag}`));
  }

  console.log("\nBy current DB category:");
  Object.entries(byCategory).sort((a, b) => b[1] - a[1])
    .forEach(([cat, n]) => console.log(`  ${n.toString().padStart(5)}  ${cat}`));

  console.log("\n=== LEGACY MISCATEGORIZATION BREAKDOWN ===");
  console.log(`  ${sportcoat_as_jackets.toString().padStart(5)}  Sportcoat product_type currently in jackets`);
  console.log(`  ${suit_outfit_as_jackets.toString().padStart(5)}  Suit Outfit product_type currently in jackets`);
  console.log(`  ${dress_trousers_as_pants.toString().padStart(5)}  Style: Dress Trousers currently in pants`);
  console.log(`  ${suit_pants_as_pants.toString().padStart(5)}  Style: Suit Pants currently in pants`);
  console.log(`  ${shoes_categorized.toString().padStart(5)}  Shoes/Shoe Care product_type currently categorized or vision-failed`);

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

  const sample = [...toDelete].sort(() => Math.random() - 0.5).slice(0, 30);
  console.log("\n30 random sample titles:");
  sample.forEach((p) => {
    const state = p.visionFailed && !p.category ? "visionFailed" : (p.category ?? "null");
    const entry = catalog.get(p.handle);
    const reason = detectExclusionReason(p.title, entry);
    const productType = entry?.productType ?? "?";
    console.log(`  [${state}] [${reason}] [${productType}] ${p.title}`);
  });

  if (DRY_RUN) {
    console.log("\nDRY RUN complete. No changes made.");
    console.log(`→ Re-run with EXPECTED_COUNT=${toDelete.length} to execute.`);
    await prisma.$disconnect();
    return;
  }

  // Phase 5: backup — write full row data to /tmp before any delete fires
  const backupPath = `/tmp/tds-cleanup-backup-${Date.now()}.json`;
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
      `Re-run without EXPECTED_COUNT to preview and get the correct count.`
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
      brand: "todd-snyder",
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

  console.log(`Remaining TDS products in DB: ${remaining.length}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("\nFATAL:", e.message ?? e);
  await prisma.$disconnect();
  process.exit(1);
});
