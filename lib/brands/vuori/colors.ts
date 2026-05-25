// Vuori brand-specific color name → AppColor mapping.
//
// Resolution order context: this runs at step 1 (before common.ts and keyword scan).
// Only names that cannot be resolved by common.ts or the canonical keyword scan are included.
//
// Sourcing:
//   - 21 base entries from prior UnknownColor diagnosis + visual verification sessions.
//   - 30 net-new entries added 2026-05-21: top-volume unmapped colors from UnknownColor table.
//   - 9 of the 30 required visual verification (noted inline with ✓).
//   - Remaining 21 are semantic inference from color name.
//   - Heather/marle pairs noted inline: step 4 strips modifier → checks common.ts only,
//     so brand-dict-only base colors need their heather variants explicitly listed here.

import type { AppColor } from "@/lib/normalize/colors/canonical";

export const VUORI_COLORS: Record<string, AppColor> = {

  // ── WHITE ─────────────────────────────────────────────────────────────────
  "salt":               "white",
  "salt heather":       "white",   // paired; salt is in brand dict only, not common.ts
  "light cloud":        "white",   //   319 occurrences — cloud/sky = near-white
  "vapor":              "white",   //   319 occurrences — water vapor = near-colorless white
  "cloud heather":      "white",   //   261 occurrences — cloud = white
  "limestone heather":  "beige",   //   232 occurrences — visual: warm sandy greige hoodie ✓ 2026-05-24

  // ── GREY ──────────────────────────────────────────────────────────────────
  "moonlight":          "grey",
  "sea fog":            "grey",
  "river rock":         "grey",
  // sable = dark brown-black fur; reads as near-black grey in athleisure context
  "sable":              "grey",
  "platinum heather":   "grey",
  "fog":                "grey",    //   493 occurrences — fog = grey
  "stormy":             "grey",    //   435 occurrences — stormy weather = dark grey
  "sable heather":      "grey",    //   377 occurrences — paired; sable is in brand dict only
  "dolomite heather":   "grey",    //   319 occurrences — dolomite = grey-white rock
  "flint heather":      "grey",    //   261 occurrences — flint = grey stone
  "steel":              "grey",    //   232 occurrences — steel = grey metal
  "driftwood heather":  "grey",    //   203 occurrences — visual: medium heathered grey ✓ 2026-05-21

  // ── NAVY ──────────────────────────────────────────────────────────────────
  // corrected: mirage image showed blue/grey patterned boardshorts — reads navy
  "mirage":             "navy",
  // ink = dark blue-black, navy bucket
  "ink":                "navy",
  "ink heather":        "navy",    //   638 occurrences — paired; ink is in brand dict only
  "abyss":              "navy",    //   348 occurrences — deep dark abyss = deep navy
  "nautilus":           "navy",    //   232 occurrences — nautilus = ocean/navy tones
  "deep sea":           "navy",    //   319 occurrences — deep ocean = very dark navy

  // ── BLUE ──────────────────────────────────────────────────────────────────
  // corrected: maui image showed blue floral boardshorts, not teal
  "maui":               "blue",
  "blue coast":         "blue",
  "lake":               "blue",    // no canonical keyword matches "lake"
  "light deep sea":     "blue",    //   290 occurrences — lighter variant of deep sea
  "pacific":            "blue",    //   232 occurrences — Pacific ocean = blue

  // ── TEAL ──────────────────────────────────────────────────────────────────
  "smoked beryl":       "teal",    //   754 occurrences — visual: dark teal-slate ✓ 2026-05-21
  "kashmir":            "teal",    //   522 occurrences — visual: heathered teal-blue ✓ 2026-05-21
  "kashmir heather":    "teal",    //   377 occurrences — paired; kashmir is in brand dict only

  // ── GREEN ─────────────────────────────────────────────────────────────────
  "viridian":           "green",
  "agate green":        "green",
  // confirmed: dark hunter green plaid shirt
  "evergreen":          "green",

  // ── OLIVE ─────────────────────────────────────────────────────────────────
  // Vuori's "sage" matches their mountain-tone army palette, not pure green.
  "sage":               "olive",
  "kale heather":       "olive",   //   261 occurrences — kale = dark leafy green, muted olive direction

  // ── TAN ───────────────────────────────────────────────────────────────────
  // confirmed: warm camel/tan
  "trench":             "tan",
  "winter pear":        "tan",     //   261 occurrences — visual: sandy khaki button-down ✓ 2026-05-24

  // ── BEIGE ─────────────────────────────────────────────────────────────────
  "birch":              "beige",   //   406 occurrences — visual: light cream/sand ✓ 2026-05-21
  "cashew":             "beige",   //   261 occurrences — cashew nut = cream/beige
  "smokey taupe":       "beige",   //   232 occurrences — taupe = greyish warm beige
  "suede heather":      "beige",   //   232 occurrences — visual: warm cream hoodie ✓ 2026-05-21

  // ── BROWN ─────────────────────────────────────────────────────────────────
  "french roast":       "brown",
  "java":               "brown",
  "java heather":       "brown",   //   290 occurrences — paired; java is in brand dict only
  "bark":               "brown",   //   348 occurrences — tree bark = brown
  "hazelnut":           "brown",   //   290 occurrences — visual: warm terracotta-brown ✓ 2026-05-21

  // ── BURGUNDY ──────────────────────────────────────────────────────────────
  "spiced apple":       "burgundy", //  261 occurrences — visual: deep brick-red ✓ 2026-05-21

  // ── PINK ──────────────────────────────────────────────────────────────────
  // cerise = vivid cherry pink
  "cerise":             "pink",

  // ── PURPLE ────────────────────────────────────────────────────────────────
  // raisin = deep grape-purple
  "raisin":             "purple",
};
