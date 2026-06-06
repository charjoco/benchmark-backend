// resolveAppColor(rawColor, brandKey, productHandle) — maps a raw Shopify color string
// to a canonical AppColor value.
//
// Returns the matched AppColor, or null if unresolvable (and logs to UnknownColor table).
//
// Resolution order — first match wins:
//   Step 0: UnknownColor.resolved manual override (admin DB correction path)
//   Step 1: Brand exact-match dictionary (lib/brands/{brand}/colors.ts)
//   Step 2: Common exact-match dictionary (lib/normalize/colors/common.ts)
//   Step 3: Slash notation decomposition (two-tone colorways)
//   Step 3b: Ampersand " & " decomposition (H&B two-tone colorways)
//   Step 4: Strip modifiers → common dictionary
//   Step 5: Strip modifiers → canonical keyword scan
//   Step 6: Canonical keyword scan without stripping
//   Step 7: Log to UnknownColor table, return null
//
// ⚠ The canonical keyword scan (steps 5–6) iterates ALL_APP_COLORS in specificity order,
// not Object.keys(CANONICAL_KEYWORDS). Do not alter the iteration without updating ALL_APP_COLORS.

import { prisma } from "@/lib/prisma";
import { ALL_APP_COLORS, CANONICAL_KEYWORDS } from "./canonical";
import type { AppColor } from "./canonical";
import { COMMON_COLOR_DICT } from "./common";
import { stripModifiers } from "./modifiers";
import { GREYSON_COLORS } from "@/lib/brands/greyson/colors";
import { VUORI_COLORS } from "@/lib/brands/vuori/colors";
import { TRAVIS_MATHEW_COLORS } from "@/lib/brands/travis-mathew/colors";
import { JOHNNIE_O_COLORS } from "@/lib/brands/johnnie-o/colors";
import { RHONE_COLORS } from "@/lib/brands/rhone/colors";
import { BYLT_COLORS } from "@/lib/brands/bylt/colors";
import { TEN_THOUSAND_COLORS } from "@/lib/brands/ten-thousand/colors";
import { HB_COLORS } from "@/lib/brands/holderness-bourne/colors";
import { LINKSOUL_COLORS } from "@/lib/brands/linksoul/colors";
import { FAHERTY_COLORS } from "@/lib/brands/faherty/colors";
import { MACK_WELDON_COLORS } from "@/lib/brands/mack-weldon/colors";
import { MOTT_AND_BOW_COLORS } from "@/lib/brands/mott-and-bow/colors";
import { AG_JEANS_COLORS } from "@/lib/brands/ag-jeans/colors";
import { DUER_COLORS } from "@/lib/brands/duer/colors";
import { PAIGE_COLORS } from "@/lib/brands/paige/colors";

// Lowercase + trim + collapse internal whitespace. Applied before all dictionary lookups.
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

// Normalize all keys in a brand color dict to match the resolver's normalize() output.
// Brand files may use mixed-case or Title-Case keys (e.g. BYLT uses "Vapor", "Light-Mauve").
// Without this, lookups always fail because the resolver looks up with a lowercased norm.
// A no-op for already-lowercase dicts — safe to apply universally.
function normalizeKeys(dict: Record<string, AppColor>): Record<string, AppColor> {
  const out: Record<string, AppColor> = {};
  for (const [k, v] of Object.entries(dict)) out[normalize(k)] = v;
  return out;
}

// Static brand color map — add an entry here when a new brand color file is created.
// Keys are normalized at build time so brand files can use any casing without breaking lookups.
// Intentionally not dynamic imports: runtime failures from missing files are caught at
// build time rather than silently returning null during a scrape.
const BRAND_COLOR_MAPS: Partial<Record<string, Record<string, AppColor>>> = {
  "greyson":           normalizeKeys(GREYSON_COLORS),
  "vuori":             normalizeKeys(VUORI_COLORS),
  "travis-mathew":     normalizeKeys(TRAVIS_MATHEW_COLORS),
  "johnnie-o":         normalizeKeys(JOHNNIE_O_COLORS),
  "rhone":             normalizeKeys(RHONE_COLORS),
  "bylt":              normalizeKeys(BYLT_COLORS),
  "ten-thousand":      normalizeKeys(TEN_THOUSAND_COLORS),
  "holderness-bourne": normalizeKeys(HB_COLORS),
  "linksoul":          normalizeKeys(LINKSOUL_COLORS),
  "faherty":           normalizeKeys(FAHERTY_COLORS),
  "mack-weldon":       normalizeKeys(MACK_WELDON_COLORS),
  "mott-and-bow":      normalizeKeys(MOTT_AND_BOW_COLORS),
  "ag-jeans":          normalizeKeys(AG_JEANS_COLORS),
  "duer":              normalizeKeys(DUER_COLORS),
  "paige":             normalizeKeys(PAIGE_COLORS),
};

function isValidAppColor(value: string): value is AppColor {
  return (ALL_APP_COLORS as readonly string[]).includes(value);
}

// Keyword scan over ALL_APP_COLORS in priority order (specificity-ordered array).
// Uses word-boundary regex so "ink" never matches "pink", "navy" never matches "gravy", etc.
// Within a color's keyword array, longer keywords are checked first so more specific
// terms (e.g., "seafoam") win over shorter ones (e.g., "sea") when both would match.
function scanCanonicalKeywords(input: string): AppColor | null {
  const normalized = normalize(input);
  for (const color of ALL_APP_COLORS) {
    const keywords = [...CANONICAL_KEYWORDS[color]].sort((a, b) => b.length - a.length);
    for (const keyword of keywords) {
      if (new RegExp(`\\b${keyword}\\b`, "i").test(normalized)) {
        return color;
      }
    }
  }
  return null;
}

// Upsert an unresolved color into the UnknownColor table.
// productHandle is first-seen only — it is NOT in the update payload, matching the
// schema intent that the field points to one example product for debugging.
async function logUnknown(
  brandKey: string,
  rawColorName: string,
  productHandle: string,
): Promise<void> {
  try {
    await prisma.unknownColor.upsert({
      where: { brandKey_rawColorName: { brandKey, rawColorName } },
      create: { brandKey, rawColorName, productHandle, count: 1 },
      update: { count: { increment: 1 } },
      // lastSeen auto-updates via @updatedAt; productHandle stays at first-seen value
    });
  } catch (err) {
    console.error("[color/resolver] step 7 DB error — unknown color not logged:", err);
  }
}

// Resolve a single color component without logging and without recursive slash decomposition.
// Used internally by step 3 to resolve each half of a slash-notation colorway.
// Covers steps 0–2 and 4–6; intentionally skips step 3 (no recursion) and step 7 (no logging).
async function resolveComponent(
  raw: string,
  brandKey: string,
): Promise<AppColor | null> {
  const norm = normalize(raw);
  if (!norm) return null;

  // Step 0: manual override
  try {
    const override = await prisma.unknownColor.findUnique({
      where: { brandKey_rawColorName: { brandKey, rawColorName: raw } },
      select: { resolved: true, resolvedTo: true },
    });
    if (override?.resolved && override.resolvedTo && isValidAppColor(override.resolvedTo)) {
      return override.resolvedTo;
    }
  } catch (err) {
    console.error("[color/resolver] step 0 DB error:", err);
  }

  // Step 1: brand exact match
  const brandMap = BRAND_COLOR_MAPS[brandKey];
  if (brandMap) {
    const hit = brandMap[norm];
    if (hit) return hit;
  }

  // Step 2: common exact match
  const commonHit = COMMON_COLOR_DICT[norm];
  if (commonHit) return commonHit;

  // Steps 4–6 (no slash, no logging)
  const stripped = stripModifiers(norm);
  if (stripped && stripped !== norm) {
    const strippedCommon = COMMON_COLOR_DICT[stripped];
    if (strippedCommon) return strippedCommon;
    const strippedKeyword = scanCanonicalKeywords(stripped);
    if (strippedKeyword) return strippedKeyword;
  }

  return scanCanonicalKeywords(norm);
}

export async function resolveAppColor(
  rawColor: string,
  brandKey: string,
  productHandle: string,
): Promise<AppColor | null> {
  // Guard: null, empty string, and the literal "Unknown" are scraper placeholders,
  // not real color names. Return null without logging — they're not interesting unknowns.
  if (!rawColor || !rawColor.trim()) return null;
  const trimmed = rawColor.trim();
  const lower = trimmed.toLowerCase();
  // "unknown" and "default title" are Shopify placeholder strings, not real color names.
  if (lower === "unknown" || lower === "default title") return null;

  // Normalize for all dictionary lookups (lowercase, single spaces)
  const norm = normalize(trimmed);

  // ── Step 0: UnknownColor manual override ──────────────────────────────────
  // Allows admins to correct a color string via direct DB edit without a code deploy.
  // If resolvedTo is set but not a valid AppColor, warn and fall through — don't return garbage.
  try {
    const override = await prisma.unknownColor.findUnique({
      where: { brandKey_rawColorName: { brandKey, rawColorName: trimmed } },
      select: { resolved: true, resolvedTo: true },
    });
    if (override?.resolved && override.resolvedTo) {
      if (isValidAppColor(override.resolvedTo)) return override.resolvedTo;
      console.warn(
        `[color/resolver] invalid resolvedTo "${override.resolvedTo}" for ${brandKey}/${trimmed} — falling through`,
      );
    }
  } catch (err) {
    console.error("[color/resolver] step 0 DB error — continuing without override:", err);
  }

  // ── Step 1: Brand exact match ─────────────────────────────────────────────
  const brandMap = BRAND_COLOR_MAPS[brandKey];
  if (brandMap) {
    const hit = brandMap[norm];
    if (hit) return hit;
  }

  // ── Step 2: Common exact match ────────────────────────────────────────────
  const commonHit = COMMON_COLOR_DICT[norm];
  if (commonHit) return commonHit;

  // ── Step 3: Slash notation decomposition ─────────────────────────────────
  // Slash notation indicates a two-tone colorway (e.g., "WOLF BLUE/ARCTIC").
  // Step 1 runs first so a brand file can claim the full slash string as a single color
  // before we decompose it (e.g., a brand that uses "Red/White" as a product-line name).
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2) {
      const [left, right] = await Promise.all([
        resolveComponent(parts[0], brandKey),
        resolveComponent(parts[1], brandKey),
      ]);

      if (left && right) {
        // Both halves resolved
        return left === right ? left : "multi";
      }
      if (left && !right) {
        // Left (dominant/primary panel) resolved, right didn't.
        // Return left's color; log the unresolvable right half for review.
        await logUnknown(brandKey, parts[1], productHandle);
        return left;
      }
      if (!left && right) {
        // Right resolved, left (dominant panel) didn't.
        // We can't claim the product is the right color when the primary panel is unknown.
        // Return "multi" as a conservative fallback; log the unresolvable left half.
        await logUnknown(brandKey, parts[0], productHandle);
        return "multi";
      }
      // Neither resolved — fall through to step 4 with the original string.
      // This handles the case where "/" is part of a single color name (rare).
    }
  }

  // ── Step 3b: Ampersand two-tone decomposition ─────────────────────────────
  // H&B uses " & " as a two-tone separator ("Harbor & Maidstone Blue").
  // Only fires when no "/" was present (else-if). Same resolution logic as Step 3.
  // Step 1 ran first, so a brand dict can still claim the full "&" string as one color.
  else if (trimmed.includes(" & ")) {
    const parts = trimmed.split(" & ").map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2) {
      const [left, right] = await Promise.all([
        resolveComponent(parts[0], brandKey),
        resolveComponent(parts[1], brandKey),
      ]);

      if (left && right) {
        return left === right ? left : "multi";
      }
      if (left && !right) {
        await logUnknown(brandKey, parts[1], productHandle);
        return left;
      }
      if (!left && right) {
        await logUnknown(brandKey, parts[0], productHandle);
        return "multi";
      }
      // Neither resolved — fall through to step 4 with the original string.
    }
  }

  // ── Step 4: Strip modifiers → common dictionary ───────────────────────────
  const stripped = stripModifiers(norm);
  if (stripped && stripped !== norm) {
    const strippedCommon = COMMON_COLOR_DICT[stripped];
    if (strippedCommon) return strippedCommon;
  }

  // ── Step 5: Strip modifiers → canonical keyword scan ─────────────────────
  if (stripped && stripped !== norm) {
    const strippedKeyword = scanCanonicalKeywords(stripped);
    if (strippedKeyword) return strippedKeyword;
  }

  // ── Step 6: Canonical keyword scan without stripping ─────────────────────
  const directKeyword = scanCanonicalKeywords(norm);
  if (directKeyword) return directKeyword;

  // ── Step 7: Log unknown, return null ─────────────────────────────────────
  await logUnknown(brandKey, trimmed, productHandle);
  return null;
}
