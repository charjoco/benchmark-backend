/**
 * DRY RUN: preview TravisMathew MLB products that pre-date the exclusion deploy.
 * Outputs stats and samples only — no deletes.
 * Run: npx tsx scripts/preview-tm-mlb-cleanup.ts
 */

import { prisma } from "@/lib/prisma";
import { isExcludedLicensedSports } from "@/lib/brands/travis-mathew/categories";

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
  return "(Exclude MLB tag only)";
}

async function main() {
  const products = await prisma.product.findMany({
    where: {
      brand: "travis-mathew",
      category: { not: null },
    },
    select: {
      id: true,
      title: true,
      category: true,
      categoryOverride: true,
    },
  });

  console.log(`Fetched ${products.length} categorized TM products from DB.\n`);

  const matches: typeof products = [];
  const withOverride: typeof products = [];

  for (const p of products) {
    // Tags are not stored in the DB — pass empty array; title matching catches 99% of MLB inventory.
    if (isExcludedLicensedSports("", [], p.title)) {
      if (p.categoryOverride) {
        withOverride.push(p);
      } else {
        matches.push(p);
      }
    }
  }

  // --- Summary ---
  console.log(`=== MATCHES (would be deleted) ===`);
  console.log(`Total: ${matches.length}\n`);

  // Distribution by team
  const byTeam: Record<string, number> = {};
  for (const p of matches) {
    const team = detectTeam(p.title);
    byTeam[team] = (byTeam[team] ?? 0) + 1;
  }
  console.log("By MLB team:");
  Object.entries(byTeam)
    .sort((a, b) => b[1] - a[1])
    .forEach(([team, count]) => console.log(`  ${count.toString().padStart(3)}  ${team}`));

  // Distribution by current category
  const byCat: Record<string, number> = {};
  for (const p of matches) {
    const cat = p.category ?? "(null)";
    byCat[cat] = (byCat[cat] ?? 0) + 1;
  }
  console.log("\nBy current category:");
  Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`  ${count.toString().padStart(3)}  ${cat}`));

  // 20 random sample titles
  const sample = [...matches].sort(() => Math.random() - 0.5).slice(0, 20);
  console.log("\n20 random sample titles:");
  sample.forEach((p) => console.log(`  [${p.category}] ${p.title}`));

  // --- Admin override flagging ---
  console.log(`\n=== PRODUCTS WITH categoryOverride (SKIPPED — manual review) ===`);
  if (withOverride.length === 0) {
    console.log("  None — safe to proceed.");
  } else {
    withOverride.forEach((p) =>
      console.log(`  [override: ${p.categoryOverride}] ${p.title}`)
    );
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
