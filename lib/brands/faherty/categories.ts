import type { AppCategory } from "@/types";

// ── EXCLUDED PRODUCT TYPES ────────────────────────────────────────────────────
// Faherty uses curly apostrophes (U+2019) in product_type strings — normalize before lookup.
const FAHERTY_EXCLUDED_TYPES = new Set([
  // Accessories
  "accessories hats",
  "accessories belts",
  "accessories sunglasses",
  "accessories gloves",
  "accessories socks",
  "accessories",
  "accessories location product",
  // Footwear
  "footwear sneakers",
  "footwear sandals",
  "footwear shoes",
  "footwear boots",
  "men's footwear",
  // Licensed / novelty
  "men's lounge",          // All 15 = NBA/NCAA licensed merchandise
  "men's location product", // 3 Yale collab items
  // Swim (editorial exclusion)
  "men's swim",
  // Underwear/sleep
  "men's underwear & sleep",
]);

// Normalize curly apostrophe + lowercase for type lookup.
function normalizeType(s: string): string {
  return s.toLowerCase().trim().replace(/’/g, "'");
}

export function isExcludedFahertyProductType(productType: string): boolean {
  return FAHERTY_EXCLUDED_TYPES.has(normalizeType(productType));
}

// ── LICENSED / TITLE-LEVEL EXCLUSIONS ────────────────────────────────────────
// NBA/NCAA licensed tees, hoodies, and button-ups spread across Men's Knits,
// Men's Hoodies & Pullovers, Men's Button Ups, and Men's Sweaters.
// Rash guards also excluded by title (Surf Ghana Long-Sleeve Rash Guard).
const LICENSED_PREFIXES = [
  // NBA teams
  "boston celtics",
  "new york knicks",
  // Player collabs
  "jalen brunson",
  // Universities — "university of X" covers UConn, Florida, Michigan, UNC, Penn, Texas
  "university of",
  // Named schools
  "notre dame",
  "penn state",
  "michigan state",
  "st. john’s",  // U+2019 curly apostrophe
  "st. john's",       // straight apostrophe fallback
  "georgetown",
  "harvard",
  "columbia ",         // trailing space avoids false positives ("colombian", etc.)
  "yale ",             // trailing space — "yale legend…", "yale high standard…"
  "syracuse university",
  "college of charleston",
  "southern methodist university",
];

export function isExcludedFahertyTitle(title: string): boolean {
  if (/\brash guard\b/i.test(title)) return true;
  const tl = title.toLowerCase();
  return LICENSED_PREFIXES.some(prefix => tl.startsWith(prefix));
}

// ── CATEGORY DISPATCH ─────────────────────────────────────────────────────────
// Dispatches Faherty's 6 apparel product_types to AppCategory.
// All curly apostrophes in product_type are normalized before switch.
export function lookupFahertyCategory(productType: string, title = ""): AppCategory | null {
  const pt = normalizeType(productType);

  // ── Men's Button Ups ──────────────────────────────────────────────────────
  // All 369 are shirts — Legend™ Sweater Shirt flannel button-ups included.
  if (pt === "men's button ups") return "shirts";

  // ── Men's Bottoms ─────────────────────────────────────────────────────────
  // Title keyword "short" reliably splits 95 shorts vs 102 pants/joggers/denim.
  if (pt === "men's bottoms") {
    return /\bshort/i.test(title) ? "shorts" : "pants";
  }

  // ── Men's Knits ───────────────────────────────────────────────────────────
  // 191 products: tees (SS + LS), henleys, polos, Sunwashed Organic Crews (lightweight tees).
  // "Sunwashed Organic Crew" = light cotton crewneck tee → shirts (confirmed via image).
  if (pt === "men's knits") {
    if (/\bpolo\b/i.test(title)) return "polos";
    if (/long[- ]sleeve/i.test(title)) return "longsleeve";
    return "shirts";
  }

  // ── Men's Sweaters ────────────────────────────────────────────────────────
  // 74 products: mostly crewnecks/cardigans, with sweater pollos, zip sweaters, and outliers.
  if (pt === "men's sweaters") {
    if (/\bpolo\b/i.test(title)) return "polos";    // Sweater Polo lines → polos
    if (/\bhoodie\b/i.test(title)) return "hoodies"; // Indigo Hoodie (1) → hoodies
    if (/quarter[- ]zip|half[- ]zip|\bzip\b/i.test(title)) return "zips"; // Quarter Zip Sweaters → zips
    if (/\bshirt\b/i.test(title)) return "shirts";   // Sweater Shirt lines → shirts
    return "sweaters";
  }

  // ── Men's Hoodies & Pullovers ─────────────────────────────────────────────
  // 99 products spanning hoodies, zip-ups, and crewneck pullovers.
  // ORDER MATTERS: hoodie wins even on "Full Zip Hoodie" / "Zip Hoodie" titles —
  // Whitewater Full Zip Hoodie, Flannel Lined Full Zip Hoodie, High Standard Fleece
  // Zip Hoodie all have a hood and land in hoodies, not zips.
  if (pt === "men's hoodies & pullovers") {
    if (/\bhoodie\b/i.test(title)) return "hoodies";
    if (/quarter[- ]zip|half[- ]zip|full[- ]zip/i.test(title)) return "zips";
    if (/\b(crewneck|crew)\b/i.test(title)) return "sweaters";
    return "hoodies"; // remaining pullovers default to hoodies
  }

  // ── Men's Outerwear ───────────────────────────────────────────────────────
  // 83 products: jackets (45), fleece (15), blazers (24, confirmed unstructured knit/linen),
  // hoodies/pullovers (7), vests (3, handled by shared vest rule in category.ts).
  if (pt === "men's outerwear") {
    if (/\bhoodie\b/i.test(title)) return "hoodies";
    // Blazers — all 24 are soft unstructured knit or linen sport coats (image-verified):
    // no structured padding, no tailoring → jackets.
    if (/\bblazer\b/i.test(title)) return "jackets";
    // Vests handled by the shared /\bvests?\b/ rule in category.ts before this dispatch.
    return "jackets"; // jackets, fleece, trucker, and default
  }

  return null;
}
