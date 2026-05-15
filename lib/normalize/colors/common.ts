// Cross-brand marketing name → AppColor mapping.
//
// Used in resolver step 2 (exact match before modifier stripping) and
// step 4 (exact match on modifier-stripped form).
//
// All keys are lowercase; the resolver lowercases input before lookup.
// Multi-word entries (e.g., "midnight navy") require the full lowercased phrase to match exactly.
//
// Brand files in lib/brands/{brand}/colors.ts can override any entry here for
// brand-specific marketing language. The canonical example:
//   "sage" → green here (the broad athleisure default)
//   vuori/colors.ts overrides sage → olive (Vuori's mountain-tone palette uses sage as army-olive)
//
// Note: many single-word entries here are also in CANONICAL_KEYWORDS (e.g., "charcoal" → grey).
// The redundancy is intentional — common.ts step 2 resolves them faster (exact hash lookup at
// step 2 vs. tokenize + iterate at step 5/6). Keeping them here also makes this file a
// readable reference for the full cross-brand color vocabulary.

import type { AppColor } from "./canonical";

export const COMMON_COLOR_DICT: Record<string, AppColor> = {

  // ── BLACK ─────────────────────────────────────────────────────────────────
  "jet black":  "black",
  "onyx":       "black",
  "ebony":      "black",
  "caviar":     "black",
  "obsidian":   "black",
  "coal":       "black",
  "pitch":      "black",
  "noir":       "black",
  "eclipse":    "black",
  // "midnight" alone → black (deepest standalone interpretation)
  // "midnight navy" compound → navy (see Navies section below)
  "midnight":   "black",

  // ── WHITE ─────────────────────────────────────────────────────────────────
  "optical white":  "white",
  "bright white":   "white",
  "off white":      "white",
  "off-white":      "white",
  // ivory, cream, bone → beige (warmer undertone; see Beige section)

  // ── GREY ──────────────────────────────────────────────────────────────────
  "charcoal":   "grey",
  "slate":      "grey",
  "smoke":      "grey",
  "ash":        "grey",
  "silver":     "grey",
  "dove":       "grey",
  "pewter":     "grey",
  "gunmetal":   "grey",
  "concrete":   "grey",
  "shale":      "grey",
  "mist":       "grey",
  "meteor":     "grey",
  "thunder":    "grey",
  "storm":      "grey",
  // "heather" standalone → grey; when it prefixes another color ("Heather Navy"),
  // the modifier pass strips it and resolves the base color instead
  "heather":    "grey",
  // "stone" standalone → grey (high-volume Buck Mason colorway — their stone is a warm grey).
  // When "stone" qualifies another color ("Stone Blue"), the modifier pass strips it first.
  "stone":      "grey",
  // "seal" and "arctic" are intentionally omitted — their color interpretation varies by brand
  // (grey, near-white, or light blue depending on context). Handle in per-brand color files.

  // ── NAVY ──────────────────────────────────────────────────────────────────
  "midnight navy":  "navy",
  "true navy":      "navy",
  "blazer navy":    "navy",
  "navy blazer":    "navy",
  "deep navy":      "navy",
  // indigo skews dark enough in athleisure context to file as navy rather than blue
  "indigo":         "navy",

  // ── BLUE ──────────────────────────────────────────────────────────────────
  "royal":          "blue",
  "royal blue":     "blue",
  "cobalt":         "blue",
  "sky":            "blue",
  "sky blue":       "blue",
  "cornflower":     "blue",
  "cerulean":       "blue",
  "azure":          "blue",
  // denim reads as a medium jeans-blue, not dark navy
  "denim":          "blue",
  "chambray":       "blue",
  // Greyson proprietary names — included here so any future brand using the same
  // terminology resolves correctly without requiring a brand-specific file
  "wolf":           "blue",
  "wolf blue":      "blue",
  "maltese":        "blue",
  "maltese blue":   "blue",

  // ── TEAL ──────────────────────────────────────────────────────────────────
  "lagoon":         "teal",
  "seafoam":        "teal",
  "aqua":           "teal",
  "turquoise":      "teal",
  "tidal":          "teal",
  "peacock":        "teal",
  "caribbean":      "teal",
  "mineral blue":   "teal",

  // ── GREEN ─────────────────────────────────────────────────────────────────
  "forest":         "green",
  "emerald":        "green",
  "hunter":         "green",
  "kelly":          "green",
  "kelly green":    "green",
  "forest green":   "green",
  "pine":           "green",
  "moss":           "green",
  "jade":           "green",
  "fern":           "green",
  // "mint" → green (athleisure mint reads as a bright green, not teal;
  // teal tones are captured by lagoon/seafoam/tidal above)
  "mint":           "green",
  "cypress":        "green",
  "balsam":         "green",
  "grove":          "green",
  "marsh":          "green",
  "oregano":        "green",
  // "sage" → green by default. Vuori's brand file overrides this to olive because
  // their sage colorway matches their mountain-tone army palette, not a pure green.
  // If another brand's "sage" should map to olive, add it to that brand's colors.ts.
  "sage":           "green",

  // ── OLIVE ─────────────────────────────────────────────────────────────────
  "army":           "olive",
  "military":       "olive",
  "camouflage":     "olive",
  "camo":           "olive",
  "fatigue":        "olive",
  "loden":          "olive",

  // ── BROWN ─────────────────────────────────────────────────────────────────
  "chocolate":      "brown",
  "mocha":          "brown",
  "coffee":         "brown",
  "espresso":       "brown",
  "walnut":         "brown",
  "cocoa":          "brown",
  "chestnut":       "brown",
  "cognac":         "brown",
  "toast":          "brown",
  "truffle":        "brown",
  "pecan":          "brown",
  "tobacco":        "brown",
  "cedar":          "brown",
  "cinnamon":       "brown",
  // Vuori / Greyson earthy palette marketing name
  "shiitake":       "brown",

  // ── BURGUNDY ──────────────────────────────────────────────────────────────
  "merlot":         "burgundy",
  "port":           "burgundy",
  "oxblood":        "burgundy",
  "wine":           "burgundy",
  "garnet":         "burgundy",
  "maroon":         "burgundy",
  "bordeaux":       "burgundy",
  "claret":         "burgundy",
  "cabernet":       "burgundy",
  "cranberry":      "burgundy",

  // ── RED ───────────────────────────────────────────────────────────────────
  "crimson":        "red",
  "scarlet":        "red",
  "tomato":         "red",
  "chili":          "red",
  "cardinal":       "red",
  "cherry":         "red",
  "brick":          "red",
  "ruby":           "red",
  "poppy":          "red",

  // ── ORANGE ────────────────────────────────────────────────────────────────
  "rust":           "orange",
  "terracotta":     "orange",
  "amber":          "orange",
  "burnt orange":   "orange",
  // "burnt" alone almost always means burnt orange in athleisure context
  "burnt":          "orange",
  "pumpkin":        "orange",
  // sienna reads orange-brown in athleisure (raw sienna = warm orange, burnt sienna = red-orange)
  "sienna":         "orange",
  "tangerine":      "orange",
  "clay":           "orange",
  "saffron":        "orange",
  "paprika":        "orange",
  // copper in non-metallic apparel context reads as a warm orange-brown
  "copper":         "orange",

  // ── YELLOW ────────────────────────────────────────────────────────────────
  "gold":           "yellow",
  "mustard":        "yellow",
  "citron":         "yellow",
  "lemon":          "yellow",
  "sunflower":      "yellow",
  "honey":          "yellow",
  "goldenrod":      "yellow",
  "butter":         "yellow",
  "maize":          "yellow",

  // ── PURPLE ────────────────────────────────────────────────────────────────
  "lavender":       "purple",
  "violet":         "purple",
  "plum":           "purple",
  "grape":          "purple",
  "amethyst":       "purple",
  "eggplant":       "purple",
  "aubergine":      "purple",
  "huckleberry":    "purple",
  "fig":            "purple",
  "lilac":          "purple",
  "orchid":         "purple",

  // ── PINK ──────────────────────────────────────────────────────────────────
  "blush":          "pink",
  "rose":           "pink",
  "salmon":         "pink",
  // coral sits on the orange-pink boundary; filed as pink per men's fashion convention
  // (coral polos and shorts read as a warm pink, not orange, in this market)
  "coral":          "pink",
  "flamingo":       "pink",
  // mauve sits between pink and purple; pink is the more common bucket in athleisure
  "mauve":          "pink",
  "peach":          "pink",
  "dusty pink":     "pink",
  "fuchsia":        "pink",
  "magenta":        "pink",

  // ── BEIGE ─────────────────────────────────────────────────────────────────
  "ecru":           "beige",
  "cream":          "beige",
  "bone":           "beige",
  "ivory":          "beige",
  "eggshell":       "beige",
  "pearl":          "beige",
  "vanilla":        "beige",
  "oatmeal":        "beige",
  "sand":           "beige",
  "dune":           "beige",
  "parchment":      "beige",
  "natural":        "beige",
  // "linen" also exists in the modifier set (strips from "Linen Blue" → "Blue"). The resolver
  // runs step 2 (this lookup) BEFORE modifier stripping, so standalone "Linen" hits this entry
  // and returns beige correctly. "Linen Blue" misses here (no compound entry), then the modifier
  // pass strips "linen" and the base "blue" resolves via canonical keywords.
  "linen":          "beige",

  // ── TAN ───────────────────────────────────────────────────────────────────
  "khaki":          "tan",
  "camel":          "tan",
  "wheat":          "tan",
  "latte":          "tan",
  "hazel":          "tan",
  "caramel":        "tan",
  "biscotti":       "tan",
  // nude in men's athleisure = a medium warm skin-tone neutral, firmly in tan territory
  "nude":           "tan",
  // taupe is a grey-beige; filed as tan per spec (closer to warm neutral than cool grey)
  "taupe":          "tan",
  "tawny":          "tan",
  "biscuit":        "tan",
  // Vuori marketing name — a warm camel/aspen-wood tone
  "aspen":          "tan",
};
