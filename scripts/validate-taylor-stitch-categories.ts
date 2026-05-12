/**
 * Validation-only dry run for Taylor Stitch category mapping.
 * Runs the full dispatch logic against /tmp/taylor-stitch-products.json.
 * No DB writes. No Prisma. Just the catalog + categories.ts logic.
 *
 * Run: npx tsx scripts/validate-taylor-stitch-categories.ts
 */

import * as fs from "fs";
import {
  isArchivedProduct,
  isExcludedTaylorStitchTitle,
  TS_EXCLUDED_PRODUCT_TYPES,
  lookupTaylorStitchCategory,
} from "@/lib/brands/taylor-stitch/categories";

const TS_WOMENS_TAGS = new Set(["women", "womens", "women's"]);

interface ShopifyProduct {
  id: number;
  title: string;
  product_type: string;
  tags: string[];
}

const raw = JSON.parse(fs.readFileSync("/tmp/taylor-stitch-products.json", "utf8"));
const products: ShopifyProduct[] = raw.products;

console.log(`Total products in catalog: ${products.length}\n`);

// Counters
const counts = {
  excluded_archive: 0,
  excluded_womens: 0,
  excluded_type: 0,
  excluded_title: 0,
  categorized: 0,
  vision_fallback: 0,
};

const byCat: Record<string, number> = {};
const byExcludedType: Record<string, number> = {};

// Samples for each branch of each disambiguation function
const samples: Record<string, { title: string; type: string; tags: string[] }[]> = {
  wovens_jackets:    [],
  wovens_longsleeve: [],
  wovens_shirts:     [],
  knits_polos:       [],
  knits_hoodies:     [],
  knits_zips:        [],
  knits_sweatshirts: [],
  knits_sweaters:    [],
  knits_longsleeve:  [],
  knits_shirts:      [],
  outerwear_vests:   [],
  outerwear_shirts:  [],
  outerwear_jackets: [],
  bottoms_shorts:    [],
  bottoms_pants:     [],
};

// False-positive check for blazer/sportcoat title exclusion on non-ARCHIVE products
const titleExclusionFalsePositiveCandidates: { title: string; type: string }[] = [];

for (const p of products) {
  const tags = Array.isArray(p.tags) ? p.tags : [];
  const title = p.title ?? "";
  const productType = p.product_type ?? "";
  const normalized = productType.toLowerCase().trim();

  // Step 1: ARCHIVE
  if (isArchivedProduct(tags)) {
    counts.excluded_archive++;
    continue;
  }

  // Step 2: gender — women's exclusion (approximate, matches scraper logic)
  if (tags.some((t) => TS_WOMENS_TAGS.has(t.toLowerCase()))) {
    counts.excluded_womens++;
    continue;
  }

  // Step 3: product_type exclusion
  if (TS_EXCLUDED_PRODUCT_TYPES.has(normalized)) {
    counts.excluded_type++;
    byExcludedType[productType] = (byExcludedType[productType] ?? 0) + 1;
    continue;
  }

  // Step 4: title keyword exclusion (Blazer, Sportcoat)
  if (isExcludedTaylorStitchTitle(title)) {
    counts.excluded_title++;
    // Flag if it doesn't look like an actual blazer/sportcoat (false positive check)
    const looksLegit = title.toLowerCase().includes("blazer") || title.toLowerCase().includes("sportcoat");
    if (!looksLegit) {
      titleExclusionFalsePositiveCandidates.push({ title, type: productType });
    }
    continue;
  }

  // Step 5: categorize
  const category = lookupTaylorStitchCategory(productType, tags, title);

  if (category) {
    counts.categorized++;
    byCat[category] = (byCat[category] ?? 0) + 1;

    // Collect branch samples (cap at 5 per branch)
    const sampleEntry = { title, type: productType, tags };
    const n = normalized;
    if (n === "wovens") {
      const t = title.toLowerCase();
      const tagSet = new Set(tags.map((x) => x.toLowerCase()));
      if (t.includes("overshirt") || t.includes("shirt jacket") || tagSet.has("shirt jackets")) {
        if (samples.wovens_jackets.length < 5) samples.wovens_jackets.push(sampleEntry);
      } else if (tagSet.has("long sleeve") || t.includes("long sleeve")) {
        if (samples.wovens_longsleeve.length < 5) samples.wovens_longsleeve.push(sampleEntry);
      } else {
        if (samples.wovens_shirts.length < 5) samples.wovens_shirts.push(sampleEntry);
      }
    } else if (n === "knits") {
      const t = title.toLowerCase();
      const tagSet = new Set(tags.map((x) => x.toLowerCase()));
      if (t.includes("polo") || tagSet.has("polos")) {
        if (samples.knits_polos.length < 5) samples.knits_polos.push(sampleEntry);
      } else if (t.includes("hoodie") || t.includes("hooded")) {
        if (samples.knits_hoodies.length < 5) samples.knits_hoodies.push(sampleEntry);
      } else if (t.includes("zip")) {
        if (samples.knits_zips.length < 5) samples.knits_zips.push(sampleEntry);
      } else if (tagSet.has("sweatshirts")) {
        if (samples.knits_sweatshirts.length < 5) samples.knits_sweatshirts.push(sampleEntry);
      } else if (tagSet.has("sweaters")) {
        if (samples.knits_sweaters.length < 5) samples.knits_sweaters.push(sampleEntry);
      } else if (t.includes("henley") && tagSet.has("long sleeve")) {
        if (samples.knits_longsleeve.length < 5) samples.knits_longsleeve.push(sampleEntry);
      } else if (tagSet.has("long sleeve")) {
        if (samples.knits_longsleeve.length < 5) samples.knits_longsleeve.push(sampleEntry);
      } else {
        if (samples.knits_shirts.length < 5) samples.knits_shirts.push(sampleEntry);
      }
    } else if (n === "outerwear") {
      const t = title.toLowerCase();
      const tagSet = new Set(tags.map((x) => x.toLowerCase()));
      if (t.includes("vest")) {
        if (samples.outerwear_vests.length < 5) samples.outerwear_vests.push(sampleEntry);
      } else if (t.includes("overshirt") || t.includes("shirt jacket") || tagSet.has("shirt jackets")) {
        if (samples.outerwear_shirts.length < 5) samples.outerwear_shirts.push(sampleEntry);
      } else {
        if (samples.outerwear_jackets.length < 5) samples.outerwear_jackets.push(sampleEntry);
      }
    } else if (n === "bottoms") {
      const tagSet = new Set(tags.map((x) => x.toLowerCase()));
      if (tagSet.has("shorts")) {
        if (samples.bottoms_shorts.length < 5) samples.bottoms_shorts.push(sampleEntry);
      } else {
        if (samples.bottoms_pants.length < 5) samples.bottoms_pants.push(sampleEntry);
      }
    }
  } else {
    counts.vision_fallback++;
  }
}

// ─── Output ───────────────────────────────────────────────────────────────────

console.log("=== EXCLUSION SUMMARY ===");
console.log(`  ARCHIVE tag:        ${counts.excluded_archive}  (expected ~3,273)`);
console.log(`  Women's tags:       ${counts.excluded_womens}`);
console.log(`  Product type:       ${counts.excluded_type}`);
console.log(`  Title keyword:      ${counts.excluded_title}  (Blazer / Sportcoat)`);
console.log(`  ─────────────────────`);
console.log(`  Total excluded:     ${counts.excluded_archive + counts.excluded_womens + counts.excluded_type + counts.excluded_title}`);

console.log("\n=== CATEGORIZATION SUMMARY ===");
console.log(`  Categorized:        ${counts.categorized}`);
console.log(`  Vision fallback:    ${counts.vision_fallback}  (expected ~0 for known types)`);
Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) =>
  console.log(`    ${cat.padEnd(12)} ${n}`)
);

console.log("\n=== PRODUCT TYPE EXCLUSION BREAKDOWN ===");
Object.entries(byExcludedType).sort((a, b) => b[1] - a[1]).forEach(([type, n]) =>
  console.log(`  ${n.toString().padStart(4)}  "${type || "(empty)"}"`)
);

console.log("\n=== DISAMBIGUATION BRANCH SAMPLES ===");
for (const [branch, list] of Object.entries(samples)) {
  if (list.length === 0) {
    console.log(`\n[${branch}] — 0 samples (branch may be empty in non-archive catalog)`);
    continue;
  }
  console.log(`\n[${branch}]`);
  list.forEach((s) => console.log(`  "${s.title}" [${s.type}]`));
}

console.log("\n=== FALSE POSITIVE CHECK: title exclusion on non-obvious titles ===");
if (titleExclusionFalsePositiveCandidates.length === 0) {
  console.log("  None — all title-excluded products contain 'blazer' or 'sportcoat'.");
} else {
  console.log(`  WARNING: ${titleExclusionFalsePositiveCandidates.length} potential false positive(s):`);
  titleExclusionFalsePositiveCandidates.forEach((p) =>
    console.log(`    "${p.title}" [${p.type}]`)
  );
}

console.log("\n=== VISION FALLBACK PRODUCTS (if any) ===");
if (counts.vision_fallback === 0) {
  console.log("  None — all non-excluded products resolved to a category.");
} else {
  console.log(`  ${counts.vision_fallback} products fell through to vision. Check product types above.`);
}
