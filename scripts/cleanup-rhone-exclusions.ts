/**
 * One-time cleanup: delete Rhone products that were categorized before the
 * NBA and tailored-blazer exclusion rules shipped (fix(rhone) 2026-05-21).
 *
 * Background: the scraper's Step 2 precheck.category shortcut means
 * already-categorized products bypass isExcludedProductType() on subsequent
 * scrapes. This script clears the back catalog so the exclusion rules take
 * full effect.
 *
 * Both exclusion checks are title-only — no Shopify catalog snapshot needed.
 *
 *   isRhoneNBAProduct:     /\bnba\b/i on title
 *   isRhoneTailoredBlazer: /\bblazers?\b/i on title.split(" -- ")[0]
 *
 * Expected counts (from live catalog as of 2026-05-21):
 *   NBA:     99 products
 *   Blazers: 30 products
 *   Total:  ~129
 *
 * Usage:
 *   # 1. Preview — no EXPECTED_COUNT needed:
 *   DATABASE_URL=... npx tsx scripts/cleanup-rhone-exclusions.ts
 *
 *   # 2. Execute — set EXPECTED_COUNT to the preview total to unlock:
 *   DATABASE_URL=... EXPECTED_COUNT=<N> npx tsx scripts/cleanup-rhone-exclusions.ts
 *
 * Guardrails:
 *   - Preview mode prints full stats and exits without deleting.
 *   - EXPECTED_COUNT must match preview count exactly to proceed.
 *   - Wrapped in a transaction; rolls back if deleteMany count deviates.
 *   - Products with categoryOverride are always skipped and surfaced.
 *   - Post-delete verification re-runs both checks against remaining rows.
 */

import * as fs from "fs";
import { prisma } from "@/lib/prisma";
import { isExcludedRhoneProductType } from "@/lib/brands/rhone/categories";

// ─── Configuration ────────────────────────────────────────────────────────────

const EXPECTED_COUNT = process.env.EXPECTED_COUNT ? parseInt(process.env.EXPECTED_COUNT, 10) : null;
const DRY_RUN = EXPECTED_COUNT === null;

// ─── Exclusion reason detection ───────────────────────────────────────────────

type ExclusionReason = "nba_title" | "blazer_title";

function detectExclusionReason(title: string): ExclusionReason | null {
  if (/\bnba\b/i.test(title)) return "nba_title";
  const productName = title.split(" -- ")[0];
  if (/\bblazers?\b/i.test(productName)) return "blazer_title";
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== RHONE EXCLUSIONS CLEANUP ===\n");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no deletes)" : `EXECUTE (expected: ${EXPECTED_COUNT})`}\n`);

  // Phase 1: fetch DB candidates — all Rhone products that are categorized or stub
  const candidates = await prisma.product.findMany({
    where: {
      brand: "rhone",
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

  // Phase 2: classify each candidate
  const toDelete: typeof candidates = [];
  const withOverride: typeof candidates = [];
  const byReason: Record<ExclusionReason, number> = { nba_title: 0, blazer_title: 0 };
  const byCategory: Record<string, number> = {};

  for (const p of candidates) {
    const reason = detectExclusionReason(p.title);
    if (!reason) continue;

    if (p.categoryOverride) {
      withOverride.push(p);
      continue;
    }

    toDelete.push(p);
    byReason[reason]++;
    const cat = p.visionFailed && !p.category ? "(visionFailed stub)" : (p.category ?? "(null)");
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }

  // Phase 3: preview output (always runs)
  console.log("=== DELETION PREVIEW ===\n");
  console.log(`Total targeted for deletion: ${toDelete.length}`);

  console.log("\nBy exclusion reason:");
  console.log(`  ${byReason.nba_title.toString().padStart(5)}  NBA title (\\bnba\\b)`);
  console.log(`  ${byReason.blazer_title.toString().padStart(5)}  tailored blazer title (\\bblazers?\\b on product name)`);

  console.log("\nBy current DB category:");
  Object.entries(byCategory).sort((a, b) => b[1] - a[1])
    .forEach(([cat, n]) => console.log(`  ${n.toString().padStart(5)}  ${cat}`));

  if (withOverride.length > 0) {
    console.log(`\ncategoryOverride (SKIPPED — manual review required): ${withOverride.length}`);
    withOverride.forEach((p) => console.log(`  [override: ${p.categoryOverride}] ${p.title}`));
  } else {
    console.log(`\ncategoryOverride conflicts: none — safe to proceed`);
  }

  const sample = [...toDelete].sort(() => Math.random() - 0.5).slice(0, 20);
  console.log("\n20 random sample titles:");
  sample.forEach((p) => {
    const state = p.visionFailed && !p.category ? "visionFailed" : (p.category ?? "null");
    const reason = detectExclusionReason(p.title);
    console.log(`  [${state}] [${reason}] ${p.title}`);
  });

  if (DRY_RUN) {
    console.log("\nDRY RUN complete. No changes made.");
    console.log(`→ Re-run with EXPECTED_COUNT=${toDelete.length} to execute.`);
    await prisma.$disconnect();
    return;
  }

  // Phase 4: backup — write full row data to /tmp before any delete fires
  const backupPath = `/tmp/rhone-cleanup-backup-${Date.now()}.json`;
  const backupPayload = toDelete.map((p) => ({
    ...p,
    exclusionReason: detectExclusionReason(p.title),
  }));
  fs.writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2));
  console.log(`\nBackup written to: ${backupPath}  (${toDelete.length} rows, local /tmp only)`);

  // Phase 5: count guard
  if (toDelete.length !== EXPECTED_COUNT) {
    console.error(
      `\nABORTED: count mismatch. Expected ${EXPECTED_COUNT}, got ${toDelete.length}. ` +
      `Re-run without EXPECTED_COUNT to preview and get the correct count.`
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  // Phase 6: transactional delete
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

  // Phase 7: post-delete verification
  console.log("=== POST-DELETE VERIFICATION ===");

  const remaining = await prisma.product.findMany({
    where: {
      brand: "rhone",
      OR: [{ category: { not: null } }, { visionFailed: true }],
    },
    select: { id: true, handle: true, title: true, category: true, visionFailed: true },
  });

  let stillExcluded = 0;
  for (const p of remaining) {
    if (detectExclusionReason(p.title)) stillExcluded++;
  }

  if (stillExcluded === 0) {
    console.log("✓ Zero excluded products remain in DB. Cleanup confirmed clean.");
  } else {
    console.log(`WARNING: ${stillExcluded} excluded products still present. Investigate.`);
  }

  console.log(`Remaining Rhone products in DB: ${remaining.length}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("\nFATAL:", e.message ?? e);
  await prisma.$disconnect();
  process.exit(1);
});
