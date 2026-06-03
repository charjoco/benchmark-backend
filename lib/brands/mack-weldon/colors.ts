import type { AppColor } from "@/lib/normalize/colors/canonical";

// Mack Weldon brand color dictionary.
// Lighter than Faherty — MW is a basics brand with mostly solid colors + heathers.
//
// Image verification performed 2026-06-02 on apparel products.
// WARMKNIT AIR Blazer confirmed: quilted puffer blazer-cut outerwear,
// unstructured construction → jackets (not exclude).
//
// Compound texture names ("True Navy - Bird's Eye", "Dark Grey - Herringbone"):
// The resolver strips the leading modifier ("true", "dark") and scans for the
// embedded color keyword ("navy", "grey") at step 5 — they resolve naturally
// without brand dict entries.
//
// Pattern/gingham names that embed a canonical color ("Picnic Gingham - Summit Blue")
// would resolve to that color at step 6, but they're multi-color patterns → override
// with explicit entries here.
//
// Size values ("XL", "S", "M", "L", "XXL") appearing in UnknownColor come from stale
// bundle/underwear DB rows with no Color option. They self-resolve when those rows are
// deleted in the backfill — no entries needed.

export const MACK_WELDON_COLORS: Record<string, AppColor> = {

  // ── NAVY / BLACK ──────────────────────────────────────────────────────────
  // "Total Eclipse" resolves to null via pipeline (neither "total" nor "eclipse"
  // are in canonical keywords after stripping). "eclipse" alone → common.ts → black,
  // but "total eclipse" as a compound isn't there. Image: very dark near-black navy.
  "total eclipse":          "navy",
  "total eclipse heather":  "navy",

  // ── GREY ──────────────────────────────────────────────────────────────────
  "monument":               "grey",   // [img] medium grey chino shorts
  "monument heather":       "grey",
  "asphalt":                "grey",   // [img] dark charcoal grey sweatshorts
  "asphalt heather":        "grey",

  // ── BLUE ──────────────────────────────────────────────────────────────────
  "desert spring":          "blue",   // [img] light powder blue terry camp shirt
  "desert spring heather":  "blue",
  "shooting star":          "blue",   // [img] medium slate/steel blue quarter-zip
  "shooting star heather":  "blue",
  "ice storm":              "blue",   // [img] medium cerulean/cornflower blue quarter-zip
  "ice storm heather":      "blue",   // [img] medium blue-grey heather sweatpant
  "oasis":                  "blue",   // [img] medium clear blue polo
  "oasis heather":          "blue",
  "gulfstream heather":     "blue",   // [img] light periwinkle-blue heather polo
  "seaplane heather":       "blue",   // [img] light blue heather quarter-zip

  // ── TEAL ──────────────────────────────────────────────────────────────────
  "wave runner":            "teal",   // [img] bright vibrant cyan/turquoise polo
  "wave runner heather":    "teal",

  // ── GREEN ─────────────────────────────────────────────────────────────────
  "greenlake":              "green",  // [img] muted medium sage-green (lighter than olive)
  "greenlake heather":      "green",
  "tannenbaum":             "green",  // [img] dark Christmas-tree forest green trunks
  "tannenbaum heather":     "green",

  // ── OLIVE ─────────────────────────────────────────────────────────────────
  "commando":               "olive",  // [img] dark army/olive green trunks
  "commando heather":       "olive",
  "burnt sage":             "olive",  // [img] light muted sage/olive sweatpants
  "burnt sage heather":     "olive",
  "cactus":                 "olive",  // [img] muted sage-olive linen shorts
  "cactus heather":         "olive",

  // ── BROWN ─────────────────────────────────────────────────────────────────
  "shroom":                 "tan",    // [img] warm tan/camel Harrington jacket (mushroom=tan)
  "shroom heather":         "tan",
  "nomad heather":          "tan",    // [img] warm oat/camel heather quarter-zip

  // ── BURGUNDY ──────────────────────────────────────────────────────────────
  "bramble":                "burgundy",   // [img] rich wine/burgundy long sleeve tee
  "bramble heather":        "burgundy",
  "lambrusco":              "burgundy",   // lambrusco = Italian red wine (color not in Shopify;
  "lambrusco heather":      "burgundy",   // semantic: lambrusco wine → burgundy)

  // ── PURPLE ────────────────────────────────────────────────────────────────
  "fig pudding":            "purple",  // [img] rich deep purple boxer briefs
  "fig pudding heather":    "purple",

  // ── WHITE / BEIGE ─────────────────────────────────────────────────────────
  "froth":                  "white",   // [img] off-white/cream chino shorts (very light)
  "froth heather":          "beige",   // [img] light cream/oatmeal heather polo (warmer undertone)

  // ── TAN ───────────────────────────────────────────────────────────────────
  "desert taupe":           "tan",     // desert taupe → "taupe" in common.ts (tan) but compound fails
  "desert taupe heather":   "tan",

  // ── MULTI — PATTERNS ─────────────────────────────────────────────────────
  // Gingham / check names that embed a canonical color word:
  // "Picnic Gingham - Summit Blue" would resolve to "blue" via canonical scan
  // at step 6 — override here so patterns → multi.
  "picnic gingham - summit blue":      "multi",
  "forest road gingham - summit blue": "multi",
  // Other pattern names that resolve incorrectly (strip → canonical hits wrong color)
  "herringbone":                        "multi",  // texture without dominant color
  "bengal stripe":                      "multi",
};
