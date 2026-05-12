/**
 * One-time cleanup: delete TravisMathew MLB-licensed products that pre-date
 * the isExcludedLicensedSports deploy (2026-05-11).
 *
 * Background: the scraper's Step 2 precheck.category shortcut means
 * already-categorized products bypass exclusion checks on subsequent scrapes.
 * This script clears the back catalog.
 *
 * Dry-run preview: npx tsx scripts/preview-tm-mlb-cleanup.ts
 * Execute:         DATABASE_URL=... npx tsx scripts/cleanup-licensed-sports-travis-mathew.ts
 *
 * Guardrails:
 *   - Wrapped in a transaction; rolls back if delete count deviates from EXPECTED_COUNT.
 *   - Products with categoryOverride are skipped and surfaced for manual review.
 *   - Post-delete verification query confirms zero MLB products remain categorized.
 */

import { prisma } from "@/lib/prisma";
import { isExcludedLicensedSports } from "@/lib/brands/travis-mathew/categories";

const EXPECTED_COUNT = 288;

const MLB_TEAMS = [
  "New York Yankees",     "Boston Red Sox",       "Baltimore Orioles",
  "Tampa Bay Rays",       "Toronto Blue Jays",    "Chicago White Sox",
  "Cleveland Guardians",  "Detroit Tigers",       "Kansas City Royals",
  "Minnesota Twins",      "Houston Astros",       "Los Angeles Angels",
  "Oakland Athletics",    "Sacramento Athletics", "Seattle Mariners",
  "Texas Rangers",        "Atlanta Braves",       "Miami Marlins",
  "New York Mets",        "Philadelphia Phillies","Washington Nationals",
  "Chicago Cubs",         "Cincinnati Reds",      "Milwaukee Brewers",
  "Pittsburgh Pirates",   "St Louis Cardinals",   "Arizona Diamondbacks",
  "Colorado Rockies",     "Los Angeles Dodgers",  "San Diego Padres",
  "San Francisco Giants",
];

function detectTeam(title: string): string {
  const t = title.toLowerCase();
  for (const team of MLB_TEAMS) {
    if (t.includes(team.toLowerCase())) return team;
  }
  return "(tag-only / unmatched)";
}

async function main() {
  // --- Phase 1: identify targets ---
  const candidates = await prisma.product.findMany({
    where: { brand: "travis-mathew", category: { not: null } },
    select: { id: true, title: true, category: true, categoryOverride: true },
  });

  const toDelete: typeof candidates = [];
  const withOverride: typeof candidates = [];

  for (const p of candidates) {
    if (!isExcludedLicensedSports("", [], p.title)) continue;
    if (p.categoryOverride) {
      withOverride.push(p);
    } else {
      toDelete.push(p);
    }
  }

  // --- Log the deletion summary (paper trail) ---
  console.log("=== TRAVIS-MATHEW MLB CLEANUP — EXECUTION LOG ===\n");
  console.log(`Candidates fetched: ${candidates.length}`);
  console.log(`Matched by exclusion: ${toDelete.length + withOverride.length}`);
  console.log(`Skipped (categoryOverride): ${withOverride.length}`);
  console.log(`Targeted for deletion: ${toDelete.length}\n`);

  if (withOverride.length > 0) {
    console.log("SKIPPED (manual review required):");
    withOverride.forEach((p) =>
      console.log(`  [override: ${p.categoryOverride}] ${p.title}`)
    );
    console.log();
  }

  const byCategory: Record<string, number> = {};
  const byTeam: Record<string, number> = {};
  for (const p of toDelete) {
    const cat = p.category ?? "(null)";
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    const team = detectTeam(p.title);
    byTeam[team] = (byTeam[team] ?? 0) + 1;
  }

  console.log("By category:");
  Object.entries(byCategory).sort((a, b) => b[1] - a[1])
    .forEach(([cat, n]) => console.log(`  ${n.toString().padStart(4)}  ${cat}`));

  console.log("\nBy team:");
  Object.entries(byTeam).sort((a, b) => b[1] - a[1])
    .forEach(([team, n]) => console.log(`  ${n.toString().padStart(4)}  ${team}`));

  // --- Phase 2: transaction guard ---
  if (toDelete.length !== EXPECTED_COUNT) {
    console.error(
      `\nABORTED: count mismatch. Expected ${EXPECTED_COUNT}, got ${toDelete.length}. ` +
      `Re-run preview and update EXPECTED_COUNT before executing.`
    );
    process.exit(1);
  }

  const ids = toDelete.map((p) => p.id);

  console.log(`\nCount matches expected (${EXPECTED_COUNT}). Executing transaction...`);

  const deleted = await prisma.$transaction(async (tx) => {
    const result = await tx.product.deleteMany({
      where: { id: { in: ids } },
    });
    if (result.count !== EXPECTED_COUNT) {
      throw new Error(
        `Transaction rollback: deleteMany returned ${result.count}, expected ${EXPECTED_COUNT}.`
      );
    }
    return result.count;
  });

  console.log(`\nDELETED: ${deleted} products.\n`);

  // --- Phase 3: verification ---
  console.log("=== POST-DELETE VERIFICATION ===");

  const teamSubstrings = MLB_TEAMS.map((t) => t.toLowerCase());
  const remaining = await prisma.product.findMany({
    where: {
      brand: "travis-mathew",
      category: { not: null },
    },
    select: { title: true, category: true },
  });

  const stillPresent = remaining.filter((p) =>
    teamSubstrings.some((id) => p.title.toLowerCase().includes(id))
  );

  if (stillPresent.length === 0) {
    console.log("✓ Zero MLB-titled products remain with a category. Cleanup confirmed clean.");
  } else {
    console.log(`WARNING: ${stillPresent.length} MLB products still have a category:`);
    stillPresent.forEach((p) => console.log(`  [${p.category}] ${p.title}`));
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("\nFATAL:", e.message ?? e);
  await prisma.$disconnect();
  process.exit(1);
});
