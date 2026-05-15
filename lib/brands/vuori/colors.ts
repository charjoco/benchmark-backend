import type { AppColor } from "@/lib/normalize/colors/canonical";

// Vuori brand-specific color overrides.
// Keys are lowercase normalized (matching resolver's normalize() output).
export const VUORI_COLORS: Record<string, AppColor> = {

  // ── OLIVE (override) ──────────────────────────────────────────────────────
  // Vuori's "sage" matches their mountain-tone army palette, not pure green.
  // Overrides the common.ts default of green.
  "sage":           "olive",

  // ── GREY ──────────────────────────────────────────────────────────────────
  // confirmed: light grey
  "moonlight":      "grey",
  "sea fog":        "grey",
  "river rock":     "grey",
  // sable = dark brown-black fur; reads as near-black grey in athleisure context
  "sable":          "grey",
  // confirmed: light heathered grey tee; "platinum" isn't in canonical keywords
  "platinum heather": "grey",

  // ── WHITE ─────────────────────────────────────────────────────────────────
  // salt = off-white / salt flat white; brand map not re-checked after modifier strip,
  // so add the heathered compound explicitly
  "salt":           "white",
  "salt heather":   "white",

  // ── NAVY ──────────────────────────────────────────────────────────────────
  // corrected: mirage image showed blue/grey patterned boardshorts — reads navy
  "mirage":         "navy",
  // ink = dark blue-black, navy bucket
  "ink":            "navy",

  // ── BLUE ──────────────────────────────────────────────────────────────────
  // corrected: maui image showed blue floral boardshorts, not teal
  "maui":           "blue",
  "blue coast":     "blue",

  // ── GREEN ─────────────────────────────────────────────────────────────────
  "viridian":       "green",
  "agate green":    "green",
  // confirmed: dark hunter green plaid shirt (step6 kw would catch "evergreen" but adding
  // here keeps the brand map as the readable source of truth for Vuori's named palette)
  "evergreen":      "green",
  // lake = clear blue water; no canonical keyword matches "lake" so must be explicit
  "lake":           "blue",

  // ── TAN ───────────────────────────────────────────────────────────────────
  // confirmed: warm camel/tan
  "trench":         "tan",

  // ── BROWN ─────────────────────────────────────────────────────────────────
  "french roast":   "brown",
  "java":           "brown",

  // ── PINK ──────────────────────────────────────────────────────────────────
  // cerise = vivid cherry pink
  "cerise":         "pink",

  // ── PURPLE ────────────────────────────────────────────────────────────────
  // raisin = deep grape-purple
  "raisin":         "purple",
};
