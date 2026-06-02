// Linksoul brand-specific color name → AppColor mapping.
//
// Resolution order context: this runs at step 1 (before common.ts and keyword scan).
// Keys are lowercase normalized (matching resolver's normalize() output).
//
// Entries are required for three classes of names:
//   1. Opaque names that have no canonical keyword match (mushroom, fossil, shore, etc.)
//   2. Heather/washed variants of opaque names — modifier stripping only feeds into common.ts
//      and canonical scan (Steps 4-5), NOT back into the brand dict (Step 1). Any opaque
//      name that isn't in common.ts or canonical keywords needs an explicit heather entry.
//      Exception: "huckleberry" is in common.ts as purple — "washed huckleberry" needs
//      an explicit override because common.ts would return the wrong value.
//   3. Twill variants ("twill" is NOT in MODIFIERS — no auto-stripping).
//
// Image-verified opaque colors (solid product images reviewed):
//   mushroom=tan, fossil=white, breakwater=white, shore=blue, harbor=blue, atlantic=blue,
//   juniper=blue, splash=blue, reef=grey, shell=grey, odyssey=navy, seaport=teal,
//   iris=purple, haze=purple, nomad=purple (dusty mauve), fir=olive,
//   huckleberry=burgundy (deep wine snap; overrides common.ts "purple"),
//   adobe=pink, grapefruit=pink, petal=pink
import type { AppColor } from "@/lib/normalize/colors/canonical";

export const LINKSOUL_COLORS: Record<string, AppColor> = {
  // === OPAQUE BASE COLORS (image-verified) ===
  "mushroom":   "tan",
  "fossil":     "white",
  "breakwater": "white",
  "shore":      "blue",
  "harbor":     "blue",
  "atlantic":   "blue",
  "juniper":    "blue",
  "splash":     "blue",
  "clearwater": "blue",
  "reef":       "grey",
  "shell":      "grey",
  "odyssey":    "navy",
  "seaport":    "teal",
  "iris":       "purple",
  "haze":       "purple",
  "nomad":      "purple",
  "fir":        "olive",
  "huckleberry": "burgundy",
  "adobe":      "pink",
  "grapefruit": "pink",
  "petal":      "pink",

  // === HEATHER / WASHED VARIANTS ===
  // These need explicit entries because modifier stripping doesn't re-check the brand dict.
  // Heather variants that strip to a canonical keyword or common.ts entry resolve correctly
  // without an entry here (e.g., "navy heather" → strips → "navy" → canonical ✓).
  "atlantic heather":        "blue",
  "fossil heather":          "white",
  "shore heather":           "blue",
  "splash heather":          "blue",
  "reef heather":            "grey",
  "shell heather":           "grey",
  "seaport heather":         "teal",
  "iris heather":            "purple",
  "haze heather":            "purple",
  "nomad heather":           "purple",
  "fir heather":             "olive",
  "adobe heather":           "pink",
  "grapefruit heather":      "pink",
  "petal heather":           "pink",
  "light clearwater heather": "blue",
  // Washed variants where stripped base isn't in common.ts or canonical
  "washed odyssey":          "navy",
  // Override: common.ts has huckleberry → purple; brand dict takes precedence at Step 1
  "washed huckleberry":      "burgundy",

  // === TWILL VARIANTS (twill not in MODIFIERS — explicit required) ===
  "atlantic twill":    "blue",
  "seaport twill":     "teal",
  "nomad twill":       "grey",
  "grey white twill":  "multi",
  "black iris twill":  "multi",

  // === PRINTS → MULTI (would resolve incorrectly via keyword scan) ===
  "black afternoon bloom": "multi",
  "black hibiscus":        "multi",
  "charcoal multistripe":  "multi",
  "navy daisy":            "multi",
  "navy palm flake":       "multi",
  "white heather pua":     "multi",
  "white palm flake":      "multi",

  // === PRINTS → MULTI (no canonical keyword — would resolve null without entry) ===
  "atlantic afternoon bloom": "multi",
  "blossom multistripe":      "multi",
  "coastal walking man":      "multi",
  "grapefruit linen floral":  "multi",
  "haze multistripe":         "multi",
  "horizon pacific islands":  "multi",
  "huckleberry branches":     "multi",
  "huckleberry swirls":       "multi",
  "iris stencil":             "multi",
  "juniper stencil":          "multi",
  "midnight asterisk":        "multi",
  "midnight branches":        "multi",
  "mystic flower dots":       "multi",
  "mystic linen floral":      "multi",
  "nomad asterisk":           "multi",
  "odyssey swirls":           "multi",
  "pure grey blossom":        "multi",
  "pure grey lava":           "multi",
  "pure grey swirls":         "multi",
  "pure grey vacation":       "multi",
  "reef multistripe":         "multi",
  "salmon micro stripe":      "multi",
  "seaport multistripe":      "multi",
  "thistle multistripe":      "multi",
  "westport heather pua":     "multi",
};
