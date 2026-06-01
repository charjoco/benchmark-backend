// Ten Thousand brand-specific color name → AppColor mapping.
//
// Resolution order context: this runs at step 1 (before common.ts and keyword scan).
// Only names that cannot be resolved by common.ts or the canonical keyword scan are included.
//
// Ten Thousand is a tactical/military-inspired performance brand. Many names are:
//   - Military-derived single words: Iron, Rover, Ridgeline, Fir, Basalt
//   - Tactical/outdoor terms: OD Green, Flat Dark Earth, Sulphur Spring
//   - Camo patterns: Black Camo, Digi Camo, Serpentine Camo → multi
//   - Graphic/motto prints: Iron Flag, Abstract Drift, BIG X, MANTRA → multi
//   - SKU rename variants: "Iron (Old SKU)", "Iron (New SKU)" → same as Iron
//
// Notable auto-resolve overrides:
//   "OD Green"   → olive  (auto would return "green" via "Green" keyword; OD = olive drab)
//   "Black Camo" → multi  (auto would return "black" via "Black" token; camo is a print)
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
  "Iron":               "grey",   // dark charcoal iron grey ✓
  "Iron (Old SKU)":     "grey",   // SKU rename of Iron
  "Iron (New SKU)":     "grey",   // SKU rename of Iron
  "Iron Ore":           "grey",   // iron-family naming; dark grey ore ✓
  "Basalt":             "grey",   // dark volcanic grey rock ✓
  "Granite":            "grey",   // dark speckled grey stone ✓
  "Fog":                "grey",   // light mist/overcast grey ✓
  "Carbon":             "grey",   // carbon material = dark charcoal grey ✓
  "Stone Heather":      "grey",   // "stone" + "heather" both MODIFIERS → strips to empty → fails

  // ── BLACK ─────────────────────────────────────────────────────────────────
  "Midnight (Old SKU)": "black",  // Midnight → black (common.ts); parenthetical suffix breaks lookup
  "Inkwell":            "black",  // deep ink black ✓

  // ── WHITE ─────────────────────────────────────────────────────────────────
  "Salt":               "white",  // crystalline white ✓
  "Whiteout":           "white",  // complete white ✓
  "Halo":               "white",  // luminous white ring ✓
  "Vapor":              "white",  // vapor/mist = near-white ✓

  // ── TAN ───────────────────────────────────────────────────────────────────
  "Rover":              "tan",    // confirmed: warm khaki/tan 5-Pocket Pant ✓
  "Burlap":             "tan",    // coarse natural fiber = warm tan ✓
  "Clay":               "tan",    // fired clay = warm earth tan ✓
  "Safari":             "tan",    // khaki safari tan ✓
  "Flat Dark Earth":    "tan",    // military FDE = coyote/flat tan ✓

  // ── BEIGE ─────────────────────────────────────────────────────────────────
  "Resin":              "beige",  // confirmed: very light warm cream/khaki Interval Pant ✓

  // ── OLIVE ─────────────────────────────────────────────────────────────────
  "OD Green":           "olive",  // OD = olive drab; "Green" keyword auto would → green (wrong)
  "Ridgeline":          "olive",  // confirmed: warm olive-green Tactical Shirt ✓
  "Sulphur Spring":     "olive",  // sulphur yellow-green = military olive tone ✓

  // ── GREEN ─────────────────────────────────────────────────────────────────
  "Fir":                "green",  // fir = dark evergreen tree ✓
  "Leaf":               "green",  // leaf green ✓
  "Highland":           "green",  // highland terrain = green ✓

  // ── BLUE ──────────────────────────────────────────────────────────────────
  "Bluefin":            "blue",   // TT brand name; blue-teal colorway ✓
  "Zodiac":             "blue",   // confirmed: muted steel/slate blue 5-Pocket Pant ✓
  "Brook":              "blue",   // stream/water = blue-family; name inference (no image) ✓

  // ── BROWN ─────────────────────────────────────────────────────────────────
  "Americano":          "brown",  // americano coffee = dark brown ✓

  // ── ORANGE ────────────────────────────────────────────────────────────────
  "Solar Flare":        "orange", // solar flare = vivid orange burst ✓

  // ── MULTI — camo patterns and graphic prints ───────────────────────────────
  // Camo patterns — would auto-resolve to wrong solid color via token scan
  "Black Camo":         "multi",  // "Black" token would wrongly win; camo is a print ✓
  "Digi Camo":          "multi",  // digital camouflage pattern ✓
  "Serpentine Camo":    "multi",  // serpentine camouflage pattern ✓
  "Dazzle Camo":        "multi",  // dazzle camouflage pattern ✓
  // Graphic / motto prints
  "Iron Flag":          "multi",  // graphic flag print ✓
  "Abstract Drift":     "multi",  // abstract drift pattern ✓
  "Flag":               "multi",  // graphic flag print ✓
  "BIG X":              "multi",  // graphic text print ✓
  "MANTRA":             "multi",  // graphic text print ✓
  "PR or ER":           "multi",  // graphic text print ✓
  "DO HARD THINGS":     "multi",  // graphic motto print ✓
  "Do Hard Things":     "multi",  // case variant of above ✓
};
