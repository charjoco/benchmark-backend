// Rhone brand-specific color name → AppColor mapping.
//
// Resolution order context: this runs at step 1 (before common.ts and keyword scan).
// Only names that cannot be resolved by common.ts or the canonical keyword scan are included.
//
// Sourcing:
//   - 30 base entries from UnknownColor diagnosis (top-volume unmapped Rhone colors) +
//     visual verification session 2026-05-21.
//   - 5 net-new entries added by catalog-volume check (52–104 occurrences in UnknownColor).
//   - Visual verifications noted inline. Unnotated entries = semantic inference.
//   - 9 heather/marle pairings added 2026-05-21: griffin/quicksilver/granite heather (grey),
//     sandstone heather (tan), mulberry heather (burgundy), pacific heather (blue),
//     mushroom heather (beige), rhodonite marle (pink), iron heather (grey).
//   - Deferred (≤29 count, need visual): rosewood heather, blackberry heather, baked clay heather,
//     weathervane heather, firelight heather, eden heather; also baked clay, outer space camo,
//     iron glen plaid (non-heather deferred from original pass).

import type { AppColor } from "@/lib/normalize/colors/canonical";

export const RHONE_COLORS: Record<string, AppColor> = {

  // ── WHITE ─────────────────────────────────────────────────────────────────
  "smoked pearl":        "white",  // approved 2026-05-21 (warm off-white pearl)
  "cloud":               "white",  // approved 2026-05-21

  // ── GREY ──────────────────────────────────────────────────────────────────
  "asphalt":             "grey",   // 1,144 occurrences — road asphalt = dark charcoal grey
  "asphalt heather":     "grey",   //   364 occurrences
  "gravel":              "grey",   //   624 occurrences
  "gravel heather":      "grey",   //   104 occurrences
  "iron":                "grey",   //   624 occurrences — visual: charcoal grey
  "iron heather":        "grey",   //    29 occurrences — paired; step 4 strips to brand-dict key, not common
  "griffin":             "grey",   //   208 occurrences — visual: mid-tone neutral grey
  "griffin heather":     "grey",   //    87 occurrences — paired
  "dark griffin":        "grey",   //   104 occurrences — visual: light silver-grey
  "quicksilver heather": "grey",   //    87 occurrences — quicksilver = silver/mercury
  "granite heather":     "grey",   //    58 occurrences — granite = grey speckled rock
  "stone heather":       "grey",   //   104 occurrences
  "stone marle":         "grey",   //   104 occurrences
  "london fog":          "grey",   //   130 occurrences
  "quietude":            "grey",   //   104 occurrences — calm/still = muted neutral grey

  // ── NAVY ──────────────────────────────────────────────────────────────────
  "maritime":            "navy",   //   234 occurrences
  "orbita":              "navy",   //   208 occurrences — visual: clear navy blue

  // ── BLUE ──────────────────────────────────────────────────────────────────
  "bluefin":             "blue",   //    52 occurrences
  "bluefin heather":     "blue",   //    52 occurrences — paired; heather suffix won't auto-strip to brand dict
  "pacific heather":     "blue",   //    29 occurrences — pacific ocean = blue

  // ── TEAL ──────────────────────────────────────────────────────────────────
  "aquamarine":          "teal",   //   208 occurrences — "aquamarine" ≠ "aqua" at word boundary

  // ── OLIVE ─────────────────────────────────────────────────────────────────
  "olivine":             "olive",  //   494 occurrences
  "olivine heather":     "olive",  //   156 occurrences
  "tea leaf":            "olive",  //   156 occurrences

  // ── TAN ───────────────────────────────────────────────────────────────────
  "sandstone":           "tan",    //   884 occurrences
  "sandstone heather":   "tan",    //    58 occurrences — paired
  "sandalo":             "tan",    //   156 occurrences

  // ── BEIGE ─────────────────────────────────────────────────────────────────
  "foggy taupe":         "beige",  //   754 occurrences — visual
  "foggy taupe heather": "beige",  //   156 occurrences — visual
  "birch":               "beige",  //   286 occurrences
  "linen heather":       "beige",  //   104 occurrences
  "mushroom heather":    "beige",  //    29 occurrences — mushroom = warm beige/taupe

  // ── BURGUNDY ──────────────────────────────────────────────────────────────
  "mulberry":            "burgundy", // 468 occurrences — visual
  "mulberry heather":    "burgundy", //  58 occurrences — paired
  "winetasting":         "burgundy", //  78 occurrences — wine = burgundy

  // ── PURPLE ────────────────────────────────────────────────────────────────
  "nightshade oxford":   "purple", //   104 occurrences — visual: muted lavender-purple ✓ 2026-05-21

  // ── PINK ──────────────────────────────────────────────────────────────────
  "redwood trail":       "pink",   //   130 occurrences — visual: dusty rose (surprise call)
  "discreet mauve":      "pink",   //   208 occurrences
  "rhodonite":           "pink",   //    52 occurrences — rose-colored mineral
  "rhodonite marle":     "pink",   //    29 occurrences — paired

  // ── MULTI ─────────────────────────────────────────────────────────────────
  "graphic":             "multi",  //   182 occurrences
  "graphic/gravel":      "multi",  //   104 occurrences
};
