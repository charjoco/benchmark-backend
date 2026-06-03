import type { AppColor } from "@/lib/normalize/colors/canonical";

// Mott & Bow brand color dictionary.
// All entries are lowercase to match the resolver's normalize() output.
//
// Color taxonomy for MB jeans:
//   Dark wash ("Dark Blue", "Midnight", fit-name "Crosby Dark Blue") → navy
//   Medium-to-light wash ("Medium Blue", "Light Blue", "Light/Medium Blue") → blue
//   Neutral / earth tones → grey / tan / brown per canonical convention
//   Opaque single-words → explicit entries below
//
// Fit-name prefixes ("Crosby", "Hubert", "Jay", "Wooster", "Staple", "Stone"):
//   MB embeds cut/fabric names in the Color option ("Crosby Dark Blue" = Crosby cut in
//   Dark Blue wash). The pipeline can't strip these arbitrary brand-specific prefixes,
//   so every fit-prefixed color gets an explicit entry.
//
// Slash-as-name colors ("Light/Medium Blue", "Medium/Dark Blue"):
//   These are single wash names that happen to contain a "/" — not two-tone colorways.
//   Without explicit entries the resolver would attempt slash decomposition and emit
//   "multi" (because "Light" alone doesn't resolve). Override here to the correct bucket.
//
// Bundle colors (3+ "/" segments like "Light Blue/Dark Blue/Black") are excluded
// upstream by isExcludedMBBundle() in categories.ts and never reach the color resolver.

export const MOTT_AND_BOW_COLORS: Record<string, AppColor> = {

  // ── DARK-WASH BLUES → navy ─────────────────────────────────────────────────
  // "Dark Blue" pipeline → strips "dark" → "blue" → blue (wrong for dark denim)
  "dark blue":                  "navy",

  // Slash-as-name: "Medium/Dark Blue" = between medium and dark wash → navy
  "medium/dark blue":           "navy",
  "medium / dark blue":         "navy",   // space variant seen in catalog

  // Midnight: common.ts maps "midnight" → black; dark-wash denim context → navy
  "midnight":                   "navy",
  "midnight blue":              "navy",

  // Pale indigo: pipeline strips "pale" → "indigo" → navy ✓ — added explicitly
  // so the brand dict hits at step 1 rather than falling to step 5.
  "pale indigo":                "navy",

  // Fit-prefixed darks
  "crosby dark blue":           "navy",
  "crosby medium/dark blue":    "navy",
  "hubert medium/dark blue":    "navy",
  "wooster dark blue":          "navy",
  "staple dark blue":           "navy",
  "staple medium/dark blue":    "navy",

  // ── MEDIUM-TO-LIGHT BLUES → blue ──────────────────────────────────────────
  // Slash-as-name: "Light/Medium Blue" = wash between light and medium → blue
  "light/medium blue":          "blue",

  "vintage blue":               "blue",

  // Fit-prefixed mediums
  "crosby medium/dark blue - preorder": "navy", // preorder variant
  "hubert light blue":          "blue",
  "hubert medium blue":         "blue",
  "wooster light/medium blue":  "blue",
  "wooster medium blue":        "blue",
  "staple medium blue":         "blue",
  "jay black":                  "black",   // Jay = fit name; Black = wash

  // ── GREY TONES ─────────────────────────────────────────────────────────────
  // "Cement" not in canonical or common; cement = cool mid-grey
  "cement":                     "grey",

  // Slash-as-name: "Medium/Dark Gray" = wash between medium and dark grey → grey
  "medium/dark gray":           "grey",
  "medium/dark grey":           "grey",   // spelling variant for safety

  // Fit-prefixed greys ("Stone" = fabric name for a heathered grey denim)
  "stone light gray":           "grey",
  "stone medium gray":          "grey",
  "stone medium/dark gray":     "grey",

  // ── WARM NEUTRALS ──────────────────────────────────────────────────────────
  // "Clay" not in common; clay = earthy red-brown → tan
  "clay":                       "tan",

  // "Saddle" not in common; saddle = leather tan → tan
  "saddle":                     "tan",

  // "Bone" → common.ts maps bone → beige; explicit entry for step-1 speed
  "bone":                       "beige",

  // "Apricot" not in common; apricot = warm peachy orange → orange
  "apricot":                    "orange",

  // ── GREENS ─────────────────────────────────────────────────────────────────
  // "Military Green" → pipeline: green keyword found before olive keyword → green.
  // Override to olive: military/army denim is an olive-tone fabric, not bright green.
  "military green":             "olive",
};
