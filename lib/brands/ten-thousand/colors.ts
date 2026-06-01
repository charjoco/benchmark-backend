// Ten Thousand brand-specific color name → AppColor mapping.
//
// Resolution order context: this runs at step 1 (before common.ts and keyword scan).
// Keys are lowercase normalized (matching resolver's normalize() output).
// Only names that cannot be resolved by common.ts or the canonical keyword scan are included.
//
// Ten Thousand is a tactical/military-inspired performance brand. Many names are:
//   - Military-derived single words: iron, rover, ridgeline, fir, basalt
//   - Tactical/outdoor terms: od green, flat dark earth, sulphur spring
//   - Camo patterns: black camo, digi camo, serpentine camo → multi
//   - Graphic/motto prints: iron flag, abstract drift, big x, mantra → multi
//   - SKU rename variants: "iron (old sku)", "iron (new sku)" → same as iron
//
// Notable auto-resolve overrides:
//   "od green"   → olive  (auto would return "green" via "Green" keyword; OD = olive drab)
//   "black camo" → multi  (auto would return "black" via "Black" token; camo is a print)
//
// Sourcing: all solid-color entries verified by product image where available.
//   Rover:     confirmed warm khaki/tan — 5-Pocket Pant (2026-06-01) ✓
//   Zodiac:    confirmed muted steel/slate blue — 5-Pocket Pant (2026-06-01) ✓
//   Ridgeline: confirmed warm olive-green — Tactical Shirt (2026-06-01) ✓
//   Resin:     confirmed very light warm cream/khaki — Interval Pant (2026-06-01) ✓
//   Brook:     out of stock; no color-specific image available; assigned blue by name inference

import type { AppColor } from "@/lib/normalize/colors/canonical";

export const TEN_THOUSAND_COLORS: Record<string, AppColor> = {

  // ── GREY ──────────────────────────────────────────────────────────────────
  "iron":               "grey",   // dark charcoal iron grey ✓
  "iron (old sku)":     "grey",   // SKU rename of Iron
  "iron (new sku)":     "grey",   // SKU rename of Iron
  "iron ore":           "grey",   // iron-family naming; dark grey ore ✓
  "basalt":             "grey",   // dark volcanic grey rock ✓
  "granite":            "grey",   // dark speckled grey stone ✓
  "fog":                "grey",   // light mist/overcast grey ✓
  "carbon":             "grey",   // carbon material = dark charcoal grey ✓
  "stone heather":      "grey",   // "stone" + "heather" both MODIFIERS → strips to empty → fails

  // ── BLACK ─────────────────────────────────────────────────────────────────
  "midnight (old sku)": "black",  // Midnight → black (common.ts); parenthetical suffix breaks lookup
  "inkwell":            "black",  // deep ink black ✓

  // ── WHITE ─────────────────────────────────────────────────────────────────
  "salt":               "white",  // crystalline white ✓
  "whiteout":           "white",  // complete white ✓
  "halo":               "white",  // luminous white ring ✓
  "vapor":              "white",  // vapor/mist = near-white ✓

  // ── TAN ───────────────────────────────────────────────────────────────────
  "rover":              "tan",    // confirmed: warm khaki/tan 5-Pocket Pant ✓
  "burlap":             "tan",    // coarse natural fiber = warm tan ✓
  "clay":               "tan",    // fired clay = warm earth tan ✓
  "safari":             "tan",    // khaki safari tan ✓
  "flat dark earth":    "tan",    // military FDE = coyote/flat tan ✓

  // ── BEIGE ─────────────────────────────────────────────────────────────────
  "resin":              "beige",  // confirmed: very light warm cream/khaki Interval Pant ✓

  // ── OLIVE ─────────────────────────────────────────────────────────────────
  "od green":           "olive",  // OD = olive drab; "Green" keyword auto would → green (wrong)
  "ridgeline":          "olive",  // confirmed: warm olive-green Tactical Shirt ✓
  "sulphur spring":     "olive",  // sulphur yellow-green = military olive tone ✓

  // ── GREEN ─────────────────────────────────────────────────────────────────
  "fir":                "green",  // fir = dark evergreen tree ✓
  "leaf":               "green",  // leaf green ✓
  "highland":           "green",  // highland terrain = green ✓

  // ── BLUE ──────────────────────────────────────────────────────────────────
  "bluefin":            "blue",   // TT brand name; blue-teal colorway ✓
  "zodiac":             "blue",   // confirmed: muted steel/slate blue 5-Pocket Pant ✓
  "brook":              "blue",   // stream/water = blue-family; name inference (no image) ✓

  // ── BROWN ─────────────────────────────────────────────────────────────────
  "americano":          "brown",  // americano coffee = dark brown ✓

  // ── ORANGE ────────────────────────────────────────────────────────────────
  "solar flare":        "orange", // solar flare = vivid orange burst ✓

  // ── MULTI — camo patterns and graphic prints ───────────────────────────────
  // Camo patterns — would auto-resolve to wrong solid color via token scan
  "black camo":         "multi",  // "Black" token would wrongly win; camo is a print ✓
  "digi camo":          "multi",  // digital camouflage pattern ✓
  "serpentine camo":    "multi",  // serpentine camouflage pattern ✓
  "dazzle camo":        "multi",  // dazzle camouflage pattern ✓
  // Graphic / motto prints
  "iron flag":          "multi",  // graphic flag print ✓
  "abstract drift":     "multi",  // abstract drift pattern ✓
  "flag":               "multi",  // graphic flag print ✓
  "big x":              "multi",  // graphic text print ✓
  "mantra":             "multi",  // graphic text print ✓
  "pr or er":           "multi",  // graphic text print ✓
  "do hard things":     "multi",  // graphic motto print ✓
};
