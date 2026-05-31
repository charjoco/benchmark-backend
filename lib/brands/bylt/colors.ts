// BYLT brand-specific color name → AppColor mapping.
//
// Resolution order context: this runs at step 1 (before common.ts and keyword scan).
// Only names that cannot be resolved by common.ts or the canonical keyword scan are included.
// NOTE: BYLT uses hyphens in color names (e.g. "Dark-Taupe", "Oat-Bone"). The modifier
// stripper splits on whitespace only, so hyphenated qualifiers are never stripped.
// Any name whose base word is only in common.ts (taupe, sage, mauve, bone, driftwood)
// must have a brand entry — it cannot auto-resolve via modifier stripping or keyword scan.
//
// Sourcing: all entries visually verified by image (2026-05-30) except where noted.
// No heather/marle variants found in BYLT's Men's product types.

import type { AppColor } from "@/lib/normalize/colors/canonical";

export const BYLT_COLORS: Record<string, AppColor> = {

  // ── WHITE ─────────────────────────────────────────────────────────────────
  "Vapor":          "white",   // confirmed: pure white tee ✓

  // ── GREY ──────────────────────────────────────────────────────────────────
  "Raven":          "grey",    // confirmed: dark charcoal thermal ✓
  "Storm":          "grey",    // confirmed: medium light grey polo ✓
  "Thunder":        "grey",    // confirmed: light-medium grey shorts ✓
  "Eminent":        "grey",    // confirmed: dark charcoal shorts ✓

  // ── BEIGE ─────────────────────────────────────────────────────────────────
  "Dove":           "beige",   // confirmed: light warm stone/beige shorts (not grey despite name) ✓
  "Dust":           "beige",   // confirmed: very light warm cream LS polo ✓
  "Oat":            "beige",   // confirmed: very light warm stone joggers ✓
  "Oat-Bone":       "beige",   // oat+bone both → beige; hyphen blocks auto-resolve

  // ── TAN ───────────────────────────────────────────────────────────────────
  "Dusty-Beige":    "tan",     // confirmed: medium khaki/tan overshirt ✓
  "Desert":         "tan",     // confirmed: warm khaki hooded LS ✓
  "Latte":          "tan",     // confirmed: warm light brown corduroy overshirt ✓
  "Sawdust":        "tan",     // confirmed: sandy warm-tan puffer jacket ✓
  "Dark-Taupe":     "tan",     // taupe → tan (common.ts); hyphen blocks auto-resolve

  // ── BLUE ──────────────────────────────────────────────────────────────────
  "Sea":            "blue",    // confirmed: medium steel/slate blue polo ✓
  "Cadet":          "blue",    // confirmed: light sky/slate blue SS button-down ✓
  "Atlantic":       "blue",    // confirmed: medium dusty blue tee ✓
  "Mercury":        "blue",    // confirmed: soft steel blue LS tee ✓

  // ── TEAL ──────────────────────────────────────────────────────────────────
  "Newport":        "teal",    // confirmed: pale mint/aqua pants ✓
  "Deep-Pacific":   "teal",    // confirmed: dark teal/slate blue LS henley ✓
  "Bay":            "teal",    // confirmed: very light mint/aqua SS button-down ✓

  // ── GREEN ─────────────────────────────────────────────────────────────────
  "Willow":         "green",   // confirmed: soft sage green camp shirt ✓
  "Dry-Sage":       "green",   // sage → green (common.ts); hyphen blocks auto-resolve
  "Dark-Sage":      "green",   // sage → green (common.ts); hyphen blocks auto-resolve

  // ── BROWN ─────────────────────────────────────────────────────────────────
  "Driftwood":      "brown",   // warm grey-brown; not in canonical keywords, must be explicit

  // ── PINK ──────────────────────────────────────────────────────────────────
  "Light-Mauve":    "pink",    // mauve → pink (common.ts); hyphen blocks auto-resolve

  // ── MULTI — pattern/print overrides ────────────────────────────────────────
  // These would auto-route to "brown" via the "taupe" keyword in common.ts.
  // Brand-dict exact match takes priority to correctly surface them as patterned.
  "Dark-Taupe-Plaid":   "multi",  // confirmed: plaid overshirt ✓
  "Windowpane-Taupe":   "multi",  // confirmed: windowpane check overshirt ✓
  "Ombre-Taupe":        "multi",  // confirmed: plaid/ombre pattern overshirt ✓
  "Taupe-Striped":      "multi",  // confirmed: pinstriped SS button-down ✓

  // Print colorways on included products (polo, button-down types) — confirmed by image.
  "Savannah-Animal":    "multi",  // confirmed: animal print (polo, button-down) ✓
  "Field-Study":        "multi",  // confirmed: abstract botanical print polo ✓
  "Lost-in-the-Woods":  "multi",  // confirmed: dark abstract print polo ✓
  "Trippy-Tropics":     "multi",  // confirmed: bold tropical print polo ✓
  "Late-Bloomer":       "multi",  // confirmed: teal/yellow floral print polo ✓
  "Fresco":             "multi",  // confirmed: blue/pink/green floral print polo ✓
  "Medal-Bronze-Flannel": "multi", // confirmed: amber/gold plaid flannel overshirt ✓
  "Falling-Flowers":    "multi",  // confirmed: white/grey subtle floral print polo ✓
  "Mosaic":             "multi",  // confirmed: blue/cream mosaic tile print polo ✓
  "Daisy-Bloom":        "multi",  // confirmed: dark charcoal floral print SS button-down ✓
  "Touch-of-Paisley":   "multi",  // paisley print button-down (name confirms pattern)
  "Petal-Patch":        "multi",  // floral patch print (polo + shorts); confirmed by name
  "Ombre-Mercury":      "multi",  // ombre gradient outerwear (name confirms ombre)
  "Ombre-Vapor":        "multi",  // ombre gradient outerwear (name confirms ombre)
  "Deep-Pacific-Storm": "multi",  // confirmed: two-tone reversible bomber jacket ✓
};
