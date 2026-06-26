// Alo Yoga dispatch dry run — DB-FREE. Runs the built resolver logic over the
// cached products.json snapshot (/tmp/alo_all.json) without touching Postgres.
//
// Replicates lib/normalize/colors/resolver.ts steps 1–6 (brand dict → common →
// 2-part slash → modifier-strip → canonical scan), skipping the DB-backed steps
// 0 (override) and 7 (logUnknown). Category logic uses the real built functions.
//
// Run:  npx tsx --tsconfig tsconfig.json scripts/alo-dryrun.ts
import { readFileSync } from "fs";
import { ALL_APP_COLORS, CANONICAL_KEYWORDS, type AppColor } from "@/lib/normalize/colors/canonical";
import { COMMON_COLOR_DICT } from "@/lib/normalize/colors/common";
import { stripModifiers } from "@/lib/normalize/colors/modifiers";
import { ALO_COLORS } from "@/lib/brands/alo/colors";
import { isExcludedAloProductType, lookupAloCategory } from "@/lib/brands/alo/categories";

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
const brandDict: Record<string, AppColor> = {};
for (const [k, v] of Object.entries(ALO_COLORS)) brandDict[norm(k)] = v;

function scanCanonical(input: string): AppColor | null {
  const n = norm(input);
  for (const color of ALL_APP_COLORS) {
    const kws = [...CANONICAL_KEYWORDS[color]].sort((a, b) => b.length - a.length);
    for (const kw of kws) if (new RegExp(`\\b${kw}\\b`, "i").test(n)) return color;
  }
  return null;
}
function resolveComponent(raw: string): AppColor | null {
  const n = norm(raw);
  if (!n) return null;
  if (brandDict[n]) return brandDict[n];               // step 1
  if (COMMON_COLOR_DICT[n]) return COMMON_COLOR_DICT[n]; // step 2
  const stripped = stripModifiers(n);                   // steps 4–6
  if (stripped && stripped !== n) {
    if (COMMON_COLOR_DICT[stripped]) return COMMON_COLOR_DICT[stripped];
    const sk = scanCanonical(stripped);
    if (sk) return sk;
  }
  return scanCanonical(n);
}
// Full resolve incl. 2-part slash decomposition (step 3). No DB (steps 0, 7).
function resolveColor(raw: string): AppColor | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "unknown" || lower === "default title") return null;
  const n = norm(trimmed);
  if (brandDict[n]) return brandDict[n];
  if (COMMON_COLOR_DICT[n]) return COMMON_COLOR_DICT[n];
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2) {
      const left = resolveComponent(parts[0]);
      const right = resolveComponent(parts[1]);
      if (left && right) return left === right ? left : "multi";
      if (left && !right) return left;
      if (!left && right) return "multi";
    }
  }
  const stripped = stripModifiers(n);
  if (stripped && stripped !== n) {
    if (COMMON_COLOR_DICT[stripped]) return COMMON_COLOR_DICT[stripped];
    const sk = scanCanonical(stripped);
    if (sk) return sk;
  }
  return scanCanonical(n);
}

type P = {
  title: string; handle: string; product_type: string; tags: string[];
  options: { name: string; values: string[] }[];
  images: { src: string }[];
};
const all: P[] = JSON.parse(readFileSync("/tmp/alo_all.json", "utf8"));

const catCounts: Record<string, number> = {};
let included = 0, nullCat = 0;
const womensLeak: string[] = [], accLeak: string[] = [], tankLeak: string[] = [];
const unresolvedColors = new Map<string, { handle: string; image: string; count: number }>();
const colorByProduct: { title: string; category: string; color: AppColor | null }[] = [];

for (const p of all) {
  if (isExcludedAloProductType(p.product_type, p.title)) continue;
  included++;
  // safety leak checks (should all be 0 by construction)
  if (/^Women:/.test(p.product_type)) womensLeak.push(p.title);
  if (/^Men:Accessories:/.test(p.product_type)) accLeak.push(p.title);
  if (p.product_type === "Men:Tops:Tanks") tankLeak.push(p.title);

  const cat = lookupAloCategory(p.product_type, p.tags, p.title);
  if (cat) catCounts[cat] = (catCounts[cat] ?? 0) + 1; else nullCat++;

  const colorOpt = p.options.find((o) => o.name === "Color");
  const rawColor = colorOpt?.values?.[0] ?? "";
  const resolved = resolveColor(rawColor);
  colorByProduct.push({ title: p.title, category: cat ?? "NULL", color: resolved });
  if (!resolved) {
    const ex = unresolvedColors.get(rawColor);
    if (ex) ex.count++;
    else unresolvedColors.set(rawColor, { handle: p.handle, image: p.images?.[0]?.src ?? "(no image)", count: 1 });
  }
}

console.log("=== RESOLVER DRY RUN (DB-free) ===");
console.log("included (passed men's gate + basic-tier cut):", included);
console.log("category counts:", JSON.stringify(catCounts, null, 2));
console.log("total categorized:", Object.values(catCounts).reduce((a, b) => a + b, 0), "| null-category:", nullCat);
console.log("");
console.log("SAFETY: women's leak:", womensLeak.length, "| accessories leak:", accLeak.length, "| tanks leak:", tankLeak.length);
console.log("");
const totalColors = colorByProduct.length;
const unresolvedTotal = [...unresolvedColors.values()].reduce((a, b) => a + b.count, 0);
console.log("COLOR: products:", totalColors, "| resolved:", totalColors - unresolvedTotal, "| UNRESOLVED:", unresolvedTotal, `(${unresolvedColors.size} distinct names)`);
console.log("");
console.log("=== COLOR AUDIT LIST (unresolved — need human/vision assignment) ===");
const sorted = [...unresolvedColors.entries()].sort((a, b) => b[1].count - a[1].count);
for (const [name, info] of sorted) {
  console.log(`${String(info.count).padStart(3)}  "${name}"`);
  console.log(`     sample: https://www.aloyoga.com/products/${info.handle}`);
  console.log(`     image:  ${info.image}`);
}
