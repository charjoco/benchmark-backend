import type { AppCategory } from "@/types";

/**
 * Todd Snyder has the cleanest Style: tag system in the brand set.
 * Every disambiguation function uses Style: tags as the primary signal,
 * with Sleeve Length: tags and title keywords as fallbacks only where needed.
 *
 * Full tailored line (Sportcoat, Suit Outfit, TS SUITING, Dress Shirt, suit
 * separates) is excluded by product_type. Dress Trousers and Suit Pants are
 * excluded by tag within the Pants type. Licensed sports (NFL, NHL Fanatics
 * collabs, MLB Yankees) are excluded by league tag + title fallback.
 *
 * Champion collab (~30 products) is explicitly NOT licensed sports — it carries
 * the Collaboration tag but no NFL/NHL/MLB league tags. Resolves normally through
 * Sweatshirt / Shorts / Sweatpant / T-Shirt disambiguation.
 *
 * Prefix note: TDS_ = Todd Snyder. Avoids collision with TS_ = Taylor Stitch
 * in lib/normalize/category.ts where both brand files are imported.
 */

// ─── Product-type exclusion set ───────────────────────────────────────────────

export const TDS_EXCLUDED_PRODUCT_TYPES = new Set([
  // Footwear
  "shoes", "shoe care", "footwear",

  // Full tailored line — strict exclusion per editorial decision
  "sportcoat", "suit outfit", "suit", "ts suiting", "suit pant", "dress shirt",

  // Accessories family
  "jewelry", "grooming", "ts suit access", "socks", "hat", "tie", "bag", "bags",
  "accessory", "belt", "watch", "watches", "sunglasses", "gloves", "scarf",
  "pocket square", "wallet", "ts coldweather", "cold weather", "luggage", "umbrella",
  "misc access", "misc accessories", "suit accessories",

  // Underwear / lounge
  "ts lounge",

  // Non-product
  "gift card",

  // Empty
  "",
]);

// ─── Tag-based exclusion set ──────────────────────────────────────────────────

// Applied as a pre-gate before any disambiguation function is called.
// These tags identify formal / excluded garments that share a product_type
// with legitimate menswear (e.g. Dress Trousers within Pants, Tanks within T-Shirt).
const TDS_EXCLUDED_TAGS_SET = new Set([
  "style: dress trousers",   // formal pants within Pants type (~92 products)
  "style: suit pants",       // suit pants within Pants type (~86 products)
  "style: tanks",            // tank tops within T-Shirt and Sweater types
  "style: baseball caps",    // MLB caps — defense-in-depth alongside Hat product-type exclusion
  "style: dress shirts",     // formal dress shirts within Shirt type
  "style: oxford shirts",    // formal — exclude
  "style: poplin shirts",    // formal — exclude
  "style: dress shoes",
  "style: suit jackets",     // belt-and-suspenders for sportcoats outside the Sportcoat type
  "style: sport coats",
  "style: sutton",           // TS's Sutton sport coat / trouser line
  "style: wythe",            // TS's Wythe slim-fit suit line
]);

export function hasExcludedTDSTag(tags: string[]): boolean {
  return tags.some((tag) => TDS_EXCLUDED_TAGS_SET.has(tag.toLowerCase()));
}

// ─── Licensed sports exclusion ────────────────────────────────────────────────

function hasLeagueWord(title: string, league: string): boolean {
  return new RegExp(`\\b${league}\\b`).test(title);
}

export function isExcludedTDSLicensedSports(tags: string[], title: string): boolean {
  const tagSet = new Set(tags);
  if (tagSet.has("NFL") || tagSet.has("NHL") || tagSet.has("MLB")) return true;

  // Title fallback: word-boundary match catches products with stray league names but missing tags
  if (hasLeagueWord(title, "NFL") || hasLeagueWord(title, "NHL") || hasLeagueWord(title, "MLB")) return true;
  if (title.includes("Fanatics")) return true;

  // 'New Era' rule is Todd Snyder-specific. TDS's only New Era products are MLB-licensed caps
  // (Yankees, Dodgers, Red Sox in current catalog). Do not generalize to other brands without
  // verifying their New Era inventory — New Era manufactures non-MLB caps for other partners.
  if (title.includes("New Era")) return true;

  return false;
}

// ─── Direct MAP: unambiguous single-destination types ─────────────────────────

const MAP: Record<string, AppCategory> = {
  "polo":      "polos",
  "ts swim":   "shorts",
  "shorts":    "shorts",
  "sweatpant": "pants",
};

// ─── TS KNITS disambiguation (206 products) ───────────────────────────────────

// TS KNITS is Todd Snyder's broadest knit umbrella: tees, polos, crewneck
// sweatshirts, hoodies, matching-set tops and bottoms, track jackets, and
// licensed sports items. Licensed sports products (NHL Kings, Rangers; NFL Jets)
// are excluded upstream before this function is reached.
//
// Resolution order rationale:
//   1. Vests before Coats & Outerwear — the Fleece Lodge Vest carries both tags;
//      vest must win to prevent mis-routing to jackets.
//   2. Jackets before Zips — Nylon Harrington, Woolrich Sherpa Full-Zip, and
//      Italian Crochet Full-Zip all carry both Style: Coats & Outerwear and zip tags;
//      outerwear jacket semantics win over zip closure.
//   3. Polo tags before Style: Shirts — several knit polo-collar shirts carry
//      both Style: Knit Polos and Style: Shirts; polo wins.
//   4. Matching Set last — title-based fallback only after all style tags exhausted.
function resolveTsKnits(tags: string[], title: string): AppCategory | null {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  const t = title.toLowerCase();

  // Vests must precede Coats & Outerwear: the Fleece Lodge Vest carries both tags.
  if (tagSet.has("style: vests"))
    return "vests";

  // Jackets: Style: Coats & Outerwear and Short Jackets are outerwear regardless
  // of zip closure. Must fire before the zip branch.
  if (tagSet.has("style: coats & outerwear") || tagSet.has("style: short jackets") || tagSet.has("style: jackets") || tagSet.has("style: tech jackets"))
    return "jackets";

  if (tagSet.has("style: shirt jackets") || tagSet.has("style: overshirts"))
    return "jackets";

  // Tees: Style: Tees Henleys & Tanks covers waffle tees, pocket tees, henleys.
  // Tanks are excluded upstream by hasExcludedTDSTag.
  if (tagSet.has("style: t-shirts") || tagSet.has("style: tees henleys & tanks"))
    return "shirts";

  // Henleys in TS KNITS (e.g. Lightweight Mini Waffle Henley).
  // Consistent with T-Shirt type's henleys → longsleeve convention.
  if (tagSet.has("style: henleys"))
    return "longsleeve";

  // Polo tags before Style: Shirts — knit polo-collar shirts carry both tags;
  // polo silhouette wins (e.g. Knit Cotton Dress Shirt, Pique Shirt).
  if (tagSet.has("style: knit polos") || tagSet.has("style: polos") || tagSet.has("style: button-down polos"))
    return "polos";

  if (tagSet.has("style: hoodies"))
    return "hoodies";

  if (tagSet.has("style: crewnecks") || tagSet.has("style: sweatshirts") || tagSet.has("style: long sleeve sweatshirts"))
    return "hoodies";

  if (tagSet.has("style: zip-ups") || tagSet.has("style: half zips") || tagSet.has("style: full zips"))
    return "zips";

  if (tagSet.has("style: casual pants") || tagSet.has("style: sweatpants") || tagSet.has("style: leisure pants"))
    return "pants";

  if (tagSet.has("style: shorts") || tagSet.has("style: sweatshorts") || tagSet.has("style: casual shorts") || tagSet.has("style: drawstring shorts"))
    return "shorts";

  // Style: Shirts catch-all — knit shirt-style tops with no polo/hoodie/zip signal
  // (e.g. Travel Terry Shirt). Fires after polo branch so polo-collar shirts go to polos.
  if (tagSet.has("style: shirts"))
    return "shirts";

  // Matching Set: title-based fallback for items with only the set tag and no other signal.
  // Items tagged Hoodies/Crewnecks/T-Shirts/etc. already resolved via those branches.
  if (tagSet.has("style: matching set")) {
    if (t.includes("short") || t.includes("swim")) return "shorts";
    if (t.includes("pant") || t.includes("jogger")) return "pants";
    return "shirts"; // matching-set top with no clearer signal → tee silhouette
  }

  return null;
}

// ─── Shirt disambiguation (364 products) ─────────────────────────────────────

// Style: Dress Shirts, Oxford Shirts, Poplin Shirts excluded upstream by hasExcludedTDSTag.
// Shirt Jackets and Overshirts → jackets (worn as outer layer).
// Denim Shirts → longsleeve (TS denim shirts are exclusively long-sleeve).
// Remaining: Sleeve Length: tag determines long vs. short; default → shirts.
function resolveShirt(tags: string[], _title: string): AppCategory {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));

  if (tagSet.has("style: shirt jackets") || tagSet.has("style: overshirts"))
    return "jackets";

  if (tagSet.has("style: denim shirts"))
    return "longsleeve";

  if (tagSet.has("style: knit polos") || tagSet.has("style: button-down polos") || tagSet.has("style: polos"))
    return "polos";

  if (tagSet.has("sleeve length: long sleeve"))
    return "longsleeve";

  if (tagSet.has("sleeve length: short sleeve"))
    return "shirts";

  return "shirts";
}

// ─── Sweater disambiguation (324 products) ────────────────────────────────────

// Covers crewneck sweaters, sweater polos, cardigans, zip-up sweaters, and
// cashmere/merino hoodies. Style: Tanks excluded upstream.
// Polo tags checked first — sweater polos have both Style: Sweater Polos and
// Style: Sweaters, so polo branch must fire before the sweaters catch-all.
function resolveSweater(tags: string[]): AppCategory {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));

  if (tagSet.has("style: sweater polos") || tagSet.has("style: polo") || tagSet.has("style: polos") || tagSet.has("style: knit polos"))
    return "polos";

  if (tagSet.has("style: hoodies"))
    return "hoodies";

  if (tagSet.has("style: zip-ups") || tagSet.has("style: zip-up") || tagSet.has("style: full zips") || tagSet.has("style: half zips"))
    return "zips";

  if (tagSet.has("style: vests"))
    return "vests";

  if (tagSet.has("style: cardigans") || tagSet.has("style: crewneck sweaters") || tagSet.has("style: sweaters"))
    return "sweaters";

  return "sweaters";
}

// ─── Outerwear disambiguation (127 products) ──────────────────────────────────

// Outerwear type is almost entirely jackets and coats. The only exception is
// 5 vest products (tagged Style: Vests).
function resolveOuterwear(tags: string[]): AppCategory {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  if (tagSet.has("style: vests")) return "vests";
  return "jackets";
}

// ─── Sweatshirt disambiguation (55 products) ──────────────────────────────────

// Sweatshirt type includes hoodies, crewneck sweatshirts, and zip-up fleeces.
// Crewneck sweatshirts → hoodies (consistent with ASRV/Taylor Stitch convention).
function resolveSweatshirt(tags: string[]): AppCategory {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));

  if (tagSet.has("style: hoodies")) return "hoodies";

  if (tagSet.has("style: zip-ups") || tagSet.has("style: half zips") || tagSet.has("style: full zips"))
    return "zips";

  // Style: Crewneck (no 's') appears on Champion crewnecks; Crewnecks (with 's') on house products
  if (tagSet.has("style: crewnecks") || tagSet.has("style: crewneck")) return "hoodies";

  return "hoodies"; // catch-all: remaining sweatshirts are crewneck fleeces → hoodies
}

// ─── T-Shirt disambiguation (40 products) ────────────────────────────────────

// Style: Tanks excluded upstream. Henleys are always long-sleeve.
// Sleeve Length: tag determines long vs. short; default → shirts.
function resolveTShirt(tags: string[]): AppCategory {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));

  if (tagSet.has("style: henleys")) return "longsleeve";
  if (tagSet.has("sleeve length: long sleeve")) return "longsleeve";

  return "shirts";
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Returns the AppCategory for a Todd Snyder product, or null for vision fallback.
 *
 * Exclusion checks here are defense-in-depth — the primary gates live in
 * isExcludedProductType() in lib/normalize/category.ts. Products that reach
 * this function through a path that bypasses the dispatcher are still safely
 * handled: licensed sports → null (vision), excluded types/tags → null (vision).
 */
export function lookupToddSnyderCategory(
  productType: string,
  tags: string[],
  title = ""
): AppCategory | null {
  // 1. Licensed sports — defense-in-depth
  if (isExcludedTDSLicensedSports(tags, title)) return null;

  const normalized = productType.toLowerCase().trim();

  // 2. Product-type exclusions — defense-in-depth
  if (TDS_EXCLUDED_PRODUCT_TYPES.has(normalized)) return null;

  // 3. Tag-based exclusions — dress trousers, suit pants, tanks, sport coats, etc.
  if (hasExcludedTDSTag(tags)) return null;

  // 4. Direct MAP: unambiguous single-destination types
  if (normalized in MAP) return MAP[normalized as keyof typeof MAP];

  // 5–11. Disambiguation by product type
  if (normalized === "ts knits")   return resolveTsKnits(tags, title);
  if (normalized === "shirt")      return resolveShirt(tags, title);
  if (normalized === "sweater")    return resolveSweater(tags);
  if (normalized === "outerwear")  return resolveOuterwear(tags);
  if (normalized === "pants")      return "pants"; // tag exclusions (dress trousers, suit pants) already handled above
  if (normalized === "sweatshirt") return resolveSweatshirt(tags);
  if (normalized === "t-shirt")    return resolveTShirt(tags);

  // 12. Vision fallback — unknown types (Knits, TS + Champion Knits, Matching Set standalone)
  return null;
}
