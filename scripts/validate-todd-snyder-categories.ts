/**
 * Validation-only dry run for Todd Snyder category mapping.
 * Runs the full dispatch logic against /tmp/todd-snyder-products.json.
 * No DB writes. No Prisma. Just the catalog + categories.ts logic.
 *
 * Run: npx tsx scripts/validate-todd-snyder-categories.ts
 */

import * as fs from "fs";
import {
  TDS_EXCLUDED_PRODUCT_TYPES,
  hasExcludedTDSTag,
  isExcludedTDSLicensedSports,
  lookupToddSnyderCategory,
} from "@/lib/brands/todd-snyder/categories";

interface ShopifyProduct {
  id: number;
  title: string;
  product_type: string;
  tags: string[] | string;
}

const raw = JSON.parse(fs.readFileSync("/tmp/todd-snyder-products.json", "utf8"));
const products: ShopifyProduct[] = raw.products;

function getTags(p: ShopifyProduct): string[] {
  return Array.isArray(p.tags) ? p.tags : p.tags.split(",").map((t: string) => t.trim());
}

console.log(`Total products in catalog: ${products.length}\n`);

// ─── Counters ────────────────────────────────────────────────────────────────

const counts = {
  excluded_licensed_sports: 0,
  excluded_product_type: 0,
  excluded_tag: 0,
  categorized: 0,
  vision_fallback: 0,
};

const byCat: Record<string, number> = {};
const byExcludedType: Record<string, number> = {};

// Targeted verification tallies (matching prior validation session)
let dress_trousers_excluded = 0;
let suit_pants_excluded = 0;
let tanks_excluded = 0;
let polo_type_polos = 0;
let ts_swim_shorts = 0;
let sweatpant_type_pants = 0;
let nfl_nhl_mlb_excluded = 0;

// Branch samples (cap at 5)
const samples: Record<string, { title: string; type: string; tags: string[] }[]> = {
  tsknits_vests:         [],
  tsknits_jackets:       [],
  tsknits_polos:         [],
  tsknits_hoodies:       [],
  tsknits_zips:          [],
  tsknits_pants:         [],
  tsknits_shorts:        [],
  tsknits_shirts:        [],
  tsknits_longsleeve:    [],
  tsknits_matching_set:  [],
  tsknits_vision:        [],
  shirt_longsleeve:      [],
  shirt_shirts:          [],
  shirt_jackets:         [],
  sweater_polos:         [],
  sweater_hoodies:       [],
  sweater_zips:          [],
  sweater_sweaters:      [],
  outerwear_vests:       [],
  outerwear_jackets:     [],
  sweatshirt_hoodies:    [],
  sweatshirt_zips:       [],
  tshirt_longsleeve:     [],
  tshirt_shirts:         [],
};

// ─── Main loop ────────────────────────────────────────────────────────────────

for (const p of products) {
  const tags = getTags(p);
  const title = p.title ?? "";
  const productType = p.product_type ?? "";
  const normalized = productType.toLowerCase().trim();
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  const sampleEntry = { title, type: productType, tags };

  // Step 1: licensed sports exclusion
  if (isExcludedTDSLicensedSports(tags, title)) {
    counts.excluded_licensed_sports++;
    nfl_nhl_mlb_excluded++;
    continue;
  }

  // Step 2: product_type exclusion
  if (TDS_EXCLUDED_PRODUCT_TYPES.has(normalized)) {
    counts.excluded_product_type++;
    byExcludedType[productType || "(empty)"] = (byExcludedType[productType || "(empty)"] ?? 0) + 1;
    continue;
  }

  // Step 3: tag-based exclusion
  if (hasExcludedTDSTag(tags)) {
    counts.excluded_tag++;
    if (tagSet.has("style: dress trousers")) dress_trousers_excluded++;
    if (tagSet.has("style: suit pants"))     suit_pants_excluded++;
    if (tagSet.has("style: tanks"))          tanks_excluded++;
    continue;
  }

  // Step 4: categorize
  const category = lookupToddSnyderCategory(productType, tags, title);

  if (category) {
    counts.categorized++;
    byCat[category] = (byCat[category] ?? 0) + 1;

    // Targeted tallies
    if (normalized === "polo")      polo_type_polos++;
    if (normalized === "ts swim")   ts_swim_shorts++;
    if (normalized === "sweatpant") sweatpant_type_pants++;

    // Branch samples
    if (normalized === "ts knits") {
      if (category === "vests")    { if (samples.tsknits_vests.length < 5)    samples.tsknits_vests.push(sampleEntry); }
      if (category === "jackets")  { if (samples.tsknits_jackets.length < 5)  samples.tsknits_jackets.push(sampleEntry); }
      if (category === "polos")    { if (samples.tsknits_polos.length < 5)    samples.tsknits_polos.push(sampleEntry); }
      if (category === "hoodies")  { if (samples.tsknits_hoodies.length < 5)  samples.tsknits_hoodies.push(sampleEntry); }
      if (category === "zips")     { if (samples.tsknits_zips.length < 5)     samples.tsknits_zips.push(sampleEntry); }
      if (category === "pants")    { if (samples.tsknits_pants.length < 5)    samples.tsknits_pants.push(sampleEntry); }
      if (category === "shorts")   { if (samples.tsknits_shorts.length < 5)   samples.tsknits_shorts.push(sampleEntry); }
      if (category === "shirts")   { if (samples.tsknits_shirts.length < 5)   samples.tsknits_shirts.push(sampleEntry); }
      if (category === "longsleeve") { if (samples.tsknits_longsleeve.length < 5) samples.tsknits_longsleeve.push(sampleEntry); }
    }
    if (normalized === "shirt") {
      if (category === "longsleeve") { if (samples.shirt_longsleeve.length < 5) samples.shirt_longsleeve.push(sampleEntry); }
      if (category === "shirts")     { if (samples.shirt_shirts.length < 5)     samples.shirt_shirts.push(sampleEntry); }
      if (category === "jackets")    { if (samples.shirt_jackets.length < 5)    samples.shirt_jackets.push(sampleEntry); }
    }
    if (normalized === "sweater") {
      if (category === "polos")    { if (samples.sweater_polos.length < 5)    samples.sweater_polos.push(sampleEntry); }
      if (category === "hoodies")  { if (samples.sweater_hoodies.length < 5)  samples.sweater_hoodies.push(sampleEntry); }
      if (category === "zips")     { if (samples.sweater_zips.length < 5)     samples.sweater_zips.push(sampleEntry); }
      if (category === "sweaters") { if (samples.sweater_sweaters.length < 5) samples.sweater_sweaters.push(sampleEntry); }
    }
    if (normalized === "outerwear") {
      if (category === "vests")   { if (samples.outerwear_vests.length < 5)   samples.outerwear_vests.push(sampleEntry); }
      if (category === "jackets") { if (samples.outerwear_jackets.length < 5) samples.outerwear_jackets.push(sampleEntry); }
    }
    if (normalized === "sweatshirt") {
      if (category === "hoodies") { if (samples.sweatshirt_hoodies.length < 5) samples.sweatshirt_hoodies.push(sampleEntry); }
      if (category === "zips")    { if (samples.sweatshirt_zips.length < 5)    samples.sweatshirt_zips.push(sampleEntry); }
    }
    if (normalized === "t-shirt") {
      if (category === "longsleeve") { if (samples.tshirt_longsleeve.length < 5) samples.tshirt_longsleeve.push(sampleEntry); }
      if (category === "shirts")     { if (samples.tshirt_shirts.length < 5)     samples.tshirt_shirts.push(sampleEntry); }
    }
    if (tagSet.has("style: matching set")) {
      if (samples.tsknits_matching_set.length < 5) samples.tsknits_matching_set.push({ ...sampleEntry, type: `${productType} → ${category}` });
    }
  } else {
    counts.vision_fallback++;
    if (normalized === "ts knits") {
      if (samples.tsknits_vision.length < 5) samples.tsknits_vision.push(sampleEntry);
    }
  }
}

// ─── Output ───────────────────────────────────────────────────────────────────

const totalExcluded = counts.excluded_licensed_sports + counts.excluded_product_type + counts.excluded_tag;

console.log("=== EXCLUSION SUMMARY ===");
console.log(`  Licensed sports (NFL/NHL/MLB): ${counts.excluded_licensed_sports}`);
console.log(`  Product type excluded:         ${counts.excluded_product_type}`);
console.log(`  Tag excluded:                  ${counts.excluded_tag}`);
console.log(`  ─────────────────────`);
console.log(`  Total excluded:                ${totalExcluded}`);
console.log(`  Total processed:               ${products.length}`);

console.log("\n=== CATEGORIZATION SUMMARY ===");
console.log(`  Categorized:     ${counts.categorized}`);
console.log(`  Vision fallback: ${counts.vision_fallback}`);
Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) =>
  console.log(`    ${cat.padEnd(12)} ${n}`)
);

console.log("\n=== EXCLUSION BREAKDOWN BY product_type ===");
Object.entries(byExcludedType).sort((a, b) => b[1] - a[1]).forEach(([type, n]) =>
  console.log(`  ${n.toString().padStart(4)}  "${type}"`)
);

console.log("\n=== TARGETED VERIFICATION ===");
const checks = [
  { label: "NFL/NHL/MLB licensed sports excluded", actual: nfl_nhl_mlb_excluded, expected: "> 0" },
  { label: "Style: Dress Trousers excluded",       actual: dress_trousers_excluded, expected: "> 0" },
  { label: "Style: Suit Pants excluded",           actual: suit_pants_excluded, expected: "> 0" },
  { label: "Style: Tanks excluded",                actual: tanks_excluded, expected: "> 0" },
  { label: "Polo type → polos",                    actual: polo_type_polos, expected: "> 0" },
  { label: "TS Swim type → shorts",                actual: ts_swim_shorts, expected: "> 0" },
  { label: "Sweatpant type → pants",               actual: sweatpant_type_pants, expected: "> 0" },
];
for (const c of checks) {
  const pass = c.actual > 0;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${c.label}: ${c.actual} (expected ${c.expected})`);
}

console.log("\n=== DISAMBIGUATION BRANCH SAMPLES ===");
for (const [branch, list] of Object.entries(samples)) {
  if (list.length === 0) continue;
  console.log(`\n[${branch}]`);
  list.forEach((s) => {
    const styleTags = s.tags.filter((t) => t.toLowerCase().startsWith("style:"));
    console.log(`  "${s.title}" [${s.type}] ${styleTags.slice(0, 3).join(", ")}`);
  });
}

console.log("\n=== VISION FALLBACK PRODUCTS ===");
if (counts.vision_fallback === 0) {
  console.log("  None — all non-excluded products resolved to a category.");
} else {
  console.log(`  ${counts.vision_fallback} products fell through to vision:`);
  if (samples.tsknits_vision.length > 0) {
    console.log("  [ts knits vision fallbacks]");
    samples.tsknits_vision.forEach((s) => {
      const styleTags = s.tags.filter((t) => t.toLowerCase().startsWith("style:"));
      console.log(`    "${s.title}" → ${styleTags.slice(0, 3).join(", ")}`);
    });
  }
}
