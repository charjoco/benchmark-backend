/**
 * Validation-only dry run for Buck Mason category mapping.
 * Runs the full dispatch logic against /tmp/buck-mason-products.json.
 * No DB writes. No Prisma. Just the catalog + categories.ts logic.
 *
 * Run: npx tsx scripts/validate-buck-mason-categories.ts
 */

import * as fs from "fs";
import {
  BM_EXCLUDED_PRODUCT_TYPES,
  isExcludedBMTag,
  isExcludedBuckMasonTitle,
  lookupBuckMasonCategory,
} from "@/lib/brands/buck-mason/categories";

interface ShopifyProduct {
  id: number;
  title: string;
  product_type: string;
  tags: string[] | string;
}

const raw = JSON.parse(fs.readFileSync("/tmp/buck-mason-products.json", "utf8"));
const products: ShopifyProduct[] = raw.products;

// Normalize tags field (BM uses arrays consistently but be safe)
function getTags(p: ShopifyProduct): string[] {
  return Array.isArray(p.tags) ? p.tags : p.tags.split(",").map((t: string) => t.trim());
}

console.log(`Total products in catalog: ${products.length}\n`);

// ─── Counters ────────────────────────────────────────────────────────────────

const counts = {
  excluded_product_type: 0,
  excluded_tag_blazer: 0,
  excluded_tag_tank: 0,
  excluded_title_keyword: 0,
  excluded_womens_gender: 0,
  categorized: 0,
  vision_fallback: 0,
};

const byCat: Record<string, number> = {};
const byExcludedType: Record<string, number> = {};

// Targeted verification tallies
let tees_polos = 0;
let sweaters_polos = 0;
let swim_shorts = 0;
let jackets_type_excluded = 0;
let vintage_tops_excluded = 0;
let vintage_bottoms_excluded = 0;

// Branch samples (cap at 5 per branch)
const samples: Record<string, { title: string; type: string; tags: string[] }[]> = {
  tees_polos:      [],
  tees_longsleeve: [],
  tees_shirts:     [],
  tees_tanks_excluded: [],
  sweaters_polos:  [],
  sweaters_zips:   [],
  sweaters_sweaters: [],
  sweats_hoodies:  [],
  sweats_zips:     [],
  sweats_pants:    [],
  sweats_shorts:   [],
  shirts_longsleeve: [],
  shirts_shirts:   [],
  swim_shorts:     [],
};

// Per-collab results
const collabResults: Record<string, { title: string; result: string }[]> = {};

// ─── Main loop ────────────────────────────────────────────────────────────────

const BM_WOMENS_TYPES = new Set([
  "womens tees", "womens shirts", "womens sweaters", "womens sweats",
  "womens outerwear", "womens pants", "womens jeans", "womens shorts",
  "womens dresses", "womens tanks", "womens skirts", "womens accessories",
]);

const BM_COLLAB_TYPES = new Set([
  "anatomica", "j.press", "j press", "brycelands",
  "lee outerwear", "lee wovens", "lee tees",
  "big yank", "mcgregor", "rocky mountain", 'y"2 leather',
]);

for (const p of products) {
  const tags = getTags(p);
  const title = p.title ?? "";
  const productType = p.product_type ?? "";
  const normalized = productType.toLowerCase().trim();
  const sampleEntry = { title, type: productType, tags };

  // Step 1: women's gender tag exclusion (approximate, matches scraper)
  if (tags.some((t) => t === "filter-gender:women") && !tags.some((t) => t === "filter-gender:men")) {
    counts.excluded_womens_gender++;
    continue;
  }

  // Step 2: product_type exclusion
  if (BM_EXCLUDED_PRODUCT_TYPES.has(normalized)) {
    counts.excluded_product_type++;
    byExcludedType[productType || "(empty)"] = (byExcludedType[productType || "(empty)"] ?? 0) + 1;

    // Targeted checks
    if (normalized === "jackets") jackets_type_excluded++;
    if (normalized === "vintage tops") vintage_tops_excluded++;
    if (normalized === "vintage bottoms") vintage_bottoms_excluded++;
    continue;
  }

  // Step 3: tag-based exclusion
  if (isExcludedBMTag(tags)) {
    const tagSet = new Set(tags.map((t) => t.toLowerCase()));
    if (tagSet.has("style--blazer")) {
      counts.excluded_tag_blazer++;
    } else if (tagSet.has("style--tanks")) {
      counts.excluded_tag_tank++;
      if (samples.tees_tanks_excluded.length < 5) samples.tees_tanks_excluded.push(sampleEntry);
    }
    continue;
  }

  // Step 3b: title-keyword exclusion (blazer/sportcoat without style--blazer tag)
  if (isExcludedBuckMasonTitle(title)) {
    counts.excluded_title_keyword++;
    continue;
  }

  // Step 4: categorize
  const category = lookupBuckMasonCategory(productType, tags, title);

  if (category) {
    counts.categorized++;
    byCat[category] = (byCat[category] ?? 0) + 1;

    // Targeted verification
    if (normalized === "tees" && category === "polos")      { tees_polos++; if (samples.tees_polos.length < 5) samples.tees_polos.push(sampleEntry); }
    if (normalized === "tees" && category === "longsleeve") { if (samples.tees_longsleeve.length < 5) samples.tees_longsleeve.push(sampleEntry); }
    if (normalized === "tees" && category === "shirts")     { if (samples.tees_shirts.length < 5) samples.tees_shirts.push(sampleEntry); }
    if (normalized === "sweaters" && category === "polos")  { sweaters_polos++; if (samples.sweaters_polos.length < 5) samples.sweaters_polos.push(sampleEntry); }
    if (normalized === "sweaters" && category === "zips")   { if (samples.sweaters_zips.length < 5) samples.sweaters_zips.push(sampleEntry); }
    if (normalized === "sweaters" && category === "sweaters") { if (samples.sweaters_sweaters.length < 5) samples.sweaters_sweaters.push(sampleEntry); }
    if (normalized === "sweats" && category === "hoodies")  { if (samples.sweats_hoodies.length < 5) samples.sweats_hoodies.push(sampleEntry); }
    if (normalized === "sweats" && category === "zips")     { if (samples.sweats_zips.length < 5) samples.sweats_zips.push(sampleEntry); }
    if (normalized === "sweats" && category === "pants")    { if (samples.sweats_pants.length < 5) samples.sweats_pants.push(sampleEntry); }
    if (normalized === "sweats" && category === "shorts")   { if (samples.sweats_shorts.length < 5) samples.sweats_shorts.push(sampleEntry); }
    if (normalized === "shirts" && category === "longsleeve") { if (samples.shirts_longsleeve.length < 5) samples.shirts_longsleeve.push(sampleEntry); }
    if (normalized === "shirts" && category === "shirts")   { if (samples.shirts_shirts.length < 5) samples.shirts_shirts.push(sampleEntry); }
    if (normalized === "swim")                              { swim_shorts++; if (samples.swim_shorts.length < 5) samples.swim_shorts.push(sampleEntry); }

    // Collab tracking
    if (BM_COLLAB_TYPES.has(normalized)) {
      if (!collabResults[productType]) collabResults[productType] = [];
      collabResults[productType].push({ title, result: category });
    }
  } else {
    counts.vision_fallback++;
    if (BM_COLLAB_TYPES.has(normalized)) {
      if (!collabResults[productType]) collabResults[productType] = [];
      collabResults[productType].push({ title, result: "null (vision fallback)" });
    }
  }
}

// ─── Output ───────────────────────────────────────────────────────────────────

console.log("=== EXCLUSION SUMMARY ===");
console.log(`  Product type excluded:   ${counts.excluded_product_type}`);
console.log(`  Tag excluded (blazer):   ${counts.excluded_tag_blazer}`);
console.log(`  Tag excluded (tank):     ${counts.excluded_tag_tank}`);
console.log(`  Title excluded (blazer): ${counts.excluded_title_keyword}  (J.Press collab without style--blazer tag)`);
console.log(`  Women's gender filter:   ${counts.excluded_womens_gender}`);
const totalExcluded = counts.excluded_product_type + counts.excluded_tag_blazer + counts.excluded_tag_tank + counts.excluded_title_keyword + counts.excluded_womens_gender;
console.log(`  ─────────────────────`);
console.log(`  Total excluded:        ${totalExcluded}`);

console.log("\n=== CATEGORIZATION SUMMARY ===");
console.log(`  Categorized:        ${counts.categorized}`);
console.log(`  Vision fallback:    ${counts.vision_fallback}`);
Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) =>
  console.log(`    ${cat.padEnd(12)} ${n}`)
);

console.log("\n=== EXCLUSION BREAKDOWN BY product_type ===");
Object.entries(byExcludedType).sort((a, b) => b[1] - a[1]).forEach(([type, n]) =>
  console.log(`  ${n.toString().padStart(4)}  "${type}"`)
);

console.log("\n=== TARGETED VERIFICATION ===");
console.log(`  Jackets type (blazers) excluded:   ${jackets_type_excluded}  (expected 6)`);
console.log(`  Tees-type polos → polos:           ${tees_polos}  (expected 17)`);
console.log(`  Sweaters-type polos → polos:       ${sweaters_polos}  (expected ~18)`);
console.log(`  Swim → shorts:                     ${swim_shorts}  (expected 14)`);
console.log(`  Vintage Tops excluded:             ${vintage_tops_excluded}  (expected 60)`);
console.log(`  Vintage Bottoms excluded:          ${vintage_bottoms_excluded}  (expected 23)`);

console.log("\n=== DISAMBIGUATION BRANCH SAMPLES ===");
for (const [branch, list] of Object.entries(samples)) {
  if (list.length === 0) {
    console.log(`\n[${branch}] — 0 samples`);
    continue;
  }
  console.log(`\n[${branch}]`);
  list.forEach((s) => {
    const styleTags = s.tags.filter((t) => t.startsWith("style--"));
    console.log(`  "${s.title}" [${s.type}] ${styleTags}`);
  });
}

console.log("\n=== COLLAB TYPE RESULTS ===");
for (const [type, results] of Object.entries(collabResults).sort()) {
  console.log(`\n[${type}]`);
  results.forEach((r) => console.log(`  ${r.result.padEnd(12)}  "${r.title}"`));
}

console.log("\n=== VISION FALLBACK PRODUCTS (non-collab) ===");
if (counts.vision_fallback === 0) {
  console.log("  None — all non-excluded, non-collab products resolved to a category.");
} else {
  console.log(`  ${counts.vision_fallback} products fell through to vision. Check product types.`);
}
