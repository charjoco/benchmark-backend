// AppColor is the 18-value palette for the new color normalization system.
// Values are lowercase to match the AppCategory pattern ("shirts", "navy", etc.).
export type AppColor =
  | "black"
  | "white"
  | "grey"
  | "navy"
  | "blue"
  | "green"
  | "brown"
  | "red"
  | "orange"
  | "yellow"
  | "purple"
  | "pink"
  | "multi"
  | "teal"
  | "olive"
  | "beige"
  | "tan"
  | "burgundy";

// Ordered for keyword-scan priority: more specific colors precede their parent.
// The resolver scans this array in order and returns the first keyword match, so
// "Navy Blue" → navy (navy scanned before blue), "Burgundy Red" → burgundy, etc.
export const ALL_APP_COLORS: AppColor[] = [
  "black",
  "white",
  "grey",
  "navy",      // before blue — navy is a specific subset of blue
  "blue",
  "teal",      // before green — teal is a specific blue-green
  "green",
  "olive",     // before brown — shares earthy territory with brown
  "brown",
  "burgundy",  // before red — burgundy is a specific dark red
  "red",
  "orange",
  "yellow",
  "purple",
  "pink",
  "beige",
  "tan",
  "multi",     // last — emitted programmatically by slash notation, never via keyword scan
];

// CANONICAL_KEYWORDS: single-word base color terms for each AppColor.
// Used by resolver steps 5 (post-modifier-strip scan) and 6 (direct canonical scan).
//
// Rules:
// — Single-word terms only. Multi-word compounds ("optical white", "burnt orange") go in common.ts.
// — Whole-word matching — the resolver tokenizes on whitespace and checks exact token equality.
//   "ink" will never match "pink" because tokens are compared in full, not as substrings.
// — Ambiguous words belong in common.ts, not here. common.ts sets the default mapping;
//   brand color files (lib/brands/{brand}/colors.ts) can override per-brand.
//
// ⚠ ITERATION ORDER IS LOAD-BEARING. The resolver scans ALL_APP_COLORS in order and returns
// the first AppColor whose keyword list contains a token from the input. Do not sort, transform
// through Object.entries().sort(), or otherwise reorder CANONICAL_KEYWORDS without updating
// ALL_APP_COLORS to match. Object.keys() preserves insertion order for string keys in V8,
// but the authoritative order is ALL_APP_COLORS — the resolver must iterate that array.
//
// Notable omissions and why:
//   "sage"     → common.ts default: green; vuori/colors.ts overrides to olive (mountain palette)
//   "stone"    → common.ts default: grey (Buck Mason high-volume name); also a modifier
//   "heather"  → common.ts default: grey;  also a modifier — context determines role
//   "mint"     → common.ts default: green; teal is handled by lagoon/seafoam/tidal in common.ts
//   "ivory"    → common.ts default: beige; warmer undertone than white
//   "cream"    → common.ts default: beige; borderline beige/white
//   "bone"     → common.ts default: beige; borderline beige/white
//   "midnight" → common.ts default: black (standalone); "midnight navy" compound → navy in common.ts
//   "linen"    → common.ts default: beige; also a modifier — same dual-role as stone
//   "khaki"    → tan here (chino/pants convention); override in brand file if brand means olive
//   "denim"    → common.ts: blue (denim color reads medium-blue, not dark navy)
//   "sienna"   → common.ts: orange (raw/burnt sienna reads orange-brown in athleisure)
export const CANONICAL_KEYWORDS: Record<AppColor, string[]> = {
  // Unambiguous darks
  black: ["black", "onyx", "ebony", "jet", "noir", "caviar", "obsidian"],

  // Bright whites and near-whites; cream, ivory, bone lean warmer → common.ts
  white: ["white", "snow", "chalk"],

  // Achromatic mid-tones; silver is a metallic grey in athleisure context
  // "stone" and "heather" omitted — both are modifiers AND standalone color names; see common.ts
  grey: ["grey", "gray", "charcoal", "slate", "ash", "smoke", "pewter", "graphite", "gunmetal", "silver"],

  // Dark blue; indigo skews dark enough to file as navy, not blue
  // "denim" omitted — common.ts maps denim → blue (jeans-color, not dark-navy)
  // "midnight" omitted — common.ts maps midnight → black (standalone); "midnight navy" → navy
  navy: ["navy", "indigo"],

  // Medium-to-bright blues
  blue: ["blue", "cobalt", "royal", "cornflower", "periwinkle", "sapphire", "cerulean", "azure", "sky"],

  // Saturated greens; sage omitted (see above)
  // "mint" omitted — common.ts maps mint → green (athleisure mint reads green, not teal)
  green: ["green", "emerald", "forest", "hunter", "kelly", "jade", "pine", "fern", "moss"],

  // Warm earth tones; khaki, camel, wheat are tan (lighter, not here)
  // "sienna" omitted — common.ts maps sienna → orange (raw/burnt sienna reads orange in athleisure)
  brown: ["brown", "mocha", "chocolate", "espresso", "coffee", "walnut", "chestnut", "mahogany", "umber", "cognac"],

  // Saturated warm reds; garnet goes to burgundy (darker red-purple)
  red: ["red", "crimson", "scarlet", "tomato", "cherry", "ruby", "cardinal", "poppy"],

  // Orange-adjacent tones; "burnt" omitted (always appears as "burnt orange" in practice → common.ts)
  orange: ["orange", "rust", "amber", "copper", "terracotta", "saffron", "paprika", "pumpkin"],

  // Warm light spectrum; gold is unambiguous single-word
  yellow: ["yellow", "gold", "mustard", "citron", "lemon", "sunflower", "maize", "butter"],

  // Full purple spectrum; mauve omitted (sits between pink and purple → common.ts)
  purple: ["purple", "violet", "plum", "grape", "lavender", "lilac", "orchid", "eggplant", "amethyst"],

  // Warm light reds; mauve omitted (ambiguous pink/purple boundary → common.ts)
  pink: ["pink", "blush", "rose", "salmon", "coral", "flamingo", "fuchsia", "magenta"],

  // Emitted programmatically by slash-notation decomposition in resolver step 3.
  // "multicolor" / "multicolour" keywords handle the rare case where a brand names
  // a single colorway "Multi" or "Multicolor" rather than using a slash pattern.
  multi: ["multi", "multicolor", "multicolour"],

  // Blue-green family; seafoam is an unambiguous single-word teal synonym
  // "mint" omitted — some brands file it as green; common.ts maps mint → teal as default
  teal: ["teal", "aqua", "turquoise", "cyan", "seafoam"],

  // Desaturated military-tone yellow-greens
  // "sage" omitted — common.ts maps sage → green; vuori/colors.ts overrides to olive
  // "camo" / "camouflage" omitted — multi-color pattern, not a single tone → multi
  olive: ["olive", "army", "military"],

  // Light warm neutrals; "stone" and "linen" omitted (both are modifiers → common.ts)
  // "cream", "ivory", "bone" omitted — borderline with white, resolved in common.ts
  beige: ["beige", "ecru", "sand", "oatmeal", "dune", "parchment", "natural"],

  // Medium warm neutrals — between beige (lighter) and brown (darker)
  // "khaki" placed here per chino/pants convention (most common usage in men's fashion);
  // if a brand uses "khaki" to mean olive/army, override in that brand's colors.ts
  tan: ["tan", "camel", "wheat", "latte", "khaki", "tawny", "biscuit"],

  // Dark red-wine tones; garnet included (unambiguous single-word dark red in apparel)
  burgundy: ["burgundy", "maroon", "wine", "merlot", "oxblood", "port", "garnet", "cranberry"],
};
