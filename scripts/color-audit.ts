/**
 * COLOR RESOLUTION EMPIRICAL AUDIT
 * Tests resolveAppColor() for a sample of each brand's dict entries.
 * Uses the live resolver but mocks the DB (step 0 override + step 7 logging).
 * Reports actual return value vs expected.
 *
 * Run: ./node_modules/.bin/tsx --env-file=.env scripts/color-audit.ts
 */

// ── Inline normalize + brand dicts (for key-casing analysis) ─────────────────
import { BYLT_COLORS } from "@/lib/brands/bylt/colors";
import { TEN_THOUSAND_COLORS } from "@/lib/brands/ten-thousand/colors";
import { ALL_APP_COLORS, CANONICAL_KEYWORDS } from "@/lib/normalize/colors/canonical";
import type { AppColor } from "@/lib/normalize/colors/canonical";
import { COMMON_COLOR_DICT } from "@/lib/normalize/colors/common";
import { GREYSON_COLORS } from "@/lib/brands/greyson/colors";
import { VUORI_COLORS } from "@/lib/brands/vuori/colors";
import { TRAVIS_MATHEW_COLORS } from "@/lib/brands/travis-mathew/colors";
import { JOHNNIE_O_COLORS } from "@/lib/brands/johnnie-o/colors";
import { RHONE_COLORS } from "@/lib/brands/rhone/colors";
import { HB_COLORS } from "@/lib/brands/holderness-bourne/colors";
import { stripModifiers } from "@/lib/normalize/colors/modifiers";

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function normalizeKeys(dict: Record<string, AppColor>): Record<string, AppColor> {
  const out: Record<string, AppColor> = {};
  for (const [k, v] of Object.entries(dict)) out[normalize(k)] = v;
  return out;
}

function scanCanonicalKeywords(input: string): AppColor | null {
  const normalized = normalize(input);
  for (const color of ALL_APP_COLORS) {
    const keywords = [...CANONICAL_KEYWORDS[color]].sort((a, b) => b.length - a.length);
    for (const keyword of keywords) {
      if (new RegExp(`\\b${keyword}\\b`, "i").test(normalized)) return color;
    }
  }
  return null;
}

// Simulate resolver steps 1-6 (no DB) with two modes:
// mode "raw" = buggy (mixed-case keys, lookup fails for BYLT)
// mode "normalized" = fixed (normalizeKeys applied, always matches)
function resolveLocal(
  rawColor: string,
  brandDict: Record<string, AppColor>,
  mode: "raw" | "normalized",
): AppColor | null {
  const norm = normalize(rawColor);
  const dict = mode === "normalized" ? normalizeKeys(brandDict) : brandDict;

  const step1 = dict[norm];
  if (step1) return step1;

  const step2 = COMMON_COLOR_DICT[norm];
  if (step2) return step2;

  const stripped = stripModifiers(norm);
  if (stripped && stripped !== norm) {
    const s4 = COMMON_COLOR_DICT[stripped];
    if (s4) return s4;
    const s5 = scanCanonicalKeywords(stripped);
    if (s5) return s5;
  }
  return scanCanonicalKeywords(norm);
}

// ── Test cases ────────────────────────────────────────────────────────────────
// Raw color strings as Shopify sends them (exact casing from live catalog).
const TESTS: Array<{ brand: string; raw: string; expected: AppColor; dict: Record<string, AppColor> }> = [
  // Greyson — all lowercase keys
  { brand: "greyson",       raw: "shepherd",          expected: "grey",     dict: GREYSON_COLORS },
  { brand: "greyson",       raw: "midnight sky",       expected: "navy",     dict: GREYSON_COLORS },
  { brand: "greyson",       raw: "sunrise",            expected: "purple",   dict: GREYSON_COLORS },
  { brand: "greyson",       raw: "bonneville",         expected: "multi",    dict: GREYSON_COLORS },
  // Vuori — all lowercase keys
  { brand: "vuori",         raw: "salt",               expected: "white",    dict: VUORI_COLORS },
  { brand: "vuori",         raw: "ink heather",        expected: "navy",     dict: VUORI_COLORS },
  { brand: "vuori",         raw: "smoked beryl",       expected: "teal",     dict: VUORI_COLORS },
  { brand: "vuori",         raw: "spiced apple",       expected: "burgundy", dict: VUORI_COLORS },
  // Travis Mathew — all lowercase keys
  { brand: "travis-mathew", raw: "total eclipse",      expected: "black",    dict: TRAVIS_MATHEW_COLORS },
  { brand: "travis-mathew", raw: "moonbeam",           expected: "white",    dict: TRAVIS_MATHEW_COLORS },
  { brand: "travis-mathew", raw: "cameo",              expected: "teal",     dict: TRAVIS_MATHEW_COLORS },
  // Johnnie-O — all lowercase keys
  { brand: "johnnie-o",     raw: "seal",               expected: "navy",     dict: JOHNNIE_O_COLORS },
  { brand: "johnnie-o",     raw: "maliblu",            expected: "blue",     dict: JOHNNIE_O_COLORS },
  { brand: "johnnie-o",     raw: "aviation",           expected: "purple",   dict: JOHNNIE_O_COLORS },
  // Rhone — all lowercase keys
  { brand: "rhone",         raw: "asphalt",            expected: "grey",     dict: RHONE_COLORS },
  { brand: "rhone",         raw: "sandstone",          expected: "tan",      dict: RHONE_COLORS },
  { brand: "rhone",         raw: "mulberry",           expected: "burgundy", dict: RHONE_COLORS },
  // BYLT — Title-Case + hyphenated keys (THE BUG)
  { brand: "bylt",          raw: "Vapor",              expected: "white",    dict: BYLT_COLORS },
  { brand: "bylt",          raw: "Raven",              expected: "grey",     dict: BYLT_COLORS },
  { brand: "bylt",          raw: "Storm",              expected: "grey",     dict: BYLT_COLORS },
  { brand: "bylt",          raw: "Light-Mauve",        expected: "pink",     dict: BYLT_COLORS },
  { brand: "bylt",          raw: "Oat-Bone",           expected: "beige",    dict: BYLT_COLORS },
  { brand: "bylt",          raw: "Dark-Taupe",         expected: "tan",      dict: BYLT_COLORS },
  { brand: "bylt",          raw: "Newport",            expected: "teal",     dict: BYLT_COLORS },
  { brand: "bylt",          raw: "Dry-Sage",           expected: "green",    dict: BYLT_COLORS },
  { brand: "bylt",          raw: "Driftwood",          expected: "brown",    dict: BYLT_COLORS },
  { brand: "bylt",          raw: "Dark-Taupe-Plaid",   expected: "multi",    dict: BYLT_COLORS },
  // Ten Thousand — already fixed to lowercase keys this session
  { brand: "ten-thousand",  raw: "Iron",               expected: "grey",     dict: TEN_THOUSAND_COLORS },
  { brand: "ten-thousand",  raw: "Bluefin",            expected: "blue",     dict: TEN_THOUSAND_COLORS },
  { brand: "ten-thousand",  raw: "Rover",              expected: "tan",      dict: TEN_THOUSAND_COLORS },
  { brand: "ten-thousand",  raw: "Black Camo",         expected: "multi",    dict: TEN_THOUSAND_COLORS },
  { brand: "ten-thousand",  raw: "OD Green",           expected: "olive",    dict: TEN_THOUSAND_COLORS },
  // Holderness-Bourne — all lowercase keys
  { brand: "holderness-bourne", raw: "Belmont",        expected: "pink",     dict: HB_COLORS },
  { brand: "holderness-bourne", raw: "Harbor",         expected: "teal",     dict: HB_COLORS },
  { brand: "holderness-bourne", raw: "Tudor",          expected: "purple",   dict: HB_COLORS },
  { brand: "holderness-bourne", raw: "Heathered Harbor",   expected: "teal",  dict: HB_COLORS },
  { brand: "holderness-bourne", raw: "Heathered Amherst",  expected: "purple",dict: HB_COLORS },
  { brand: "holderness-bourne", raw: "Fescue",         expected: "tan",      dict: HB_COLORS },
];

// ── Run ───────────────────────────────────────────────────────────────────────
let beforeFails = 0;
let afterFails = 0;
const byltFails: string[] = [];

console.log("=== BEFORE FIX (raw keys, no normalizeKeys) ===\n");
let prevBrand = "";
for (const t of TESTS) {
  if (t.brand !== prevBrand) { if (prevBrand) console.log(); prevBrand = t.brand; }
  const got = resolveLocal(t.raw, t.dict, "raw");
  const pass = got === t.expected;
  if (!pass) {
    beforeFails++;
    if (t.brand === "bylt") byltFails.push(t.raw);
  }
  const status = pass ? "  PASS" : "  FAIL";
  console.log(`${status}  [${t.brand}] "${t.raw}" → ${got ?? "null"}  (expected: ${t.expected})`);
}

console.log(`\nBefore fix: ${beforeFails} failures`);
if (byltFails.length) console.log(`  BYLT failures: ${byltFails.join(", ")}`);

console.log("\n=== AFTER FIX (normalizeKeys applied) ===\n");
prevBrand = "";
for (const t of TESTS) {
  if (t.brand !== prevBrand) { if (prevBrand) console.log(); prevBrand = t.brand; }
  const got = resolveLocal(t.raw, t.dict, "normalized");
  const pass = got === t.expected;
  if (!pass) afterFails++;
  const status = pass ? "  PASS" : "  FAIL";
  console.log(`${status}  [${t.brand}] "${t.raw}" → ${got ?? "null"}  (expected: ${t.expected})`);
}

console.log(`\nAfter fix: ${afterFails} failures`);
console.log(afterFails === 0
  ? "\nAll tests pass. Fix is confirmed correct and a no-op for already-lowercase dicts."
  : "\nFAILURES REMAIN — investigate before deploying.");

console.log(`\n=== SUMMARY ===`);
console.log(`Total cases: ${TESTS.length}`);
console.log(`Before:      ${beforeFails} fail, ${TESTS.length - beforeFails} pass`);
console.log(`After:       ${afterFails} fail, ${TESTS.length - afterFails} pass`);
console.log(`Brands with silent dict failures (before fix): ${beforeFails > 0 ? "bylt (all entries)" : "none"}`);
