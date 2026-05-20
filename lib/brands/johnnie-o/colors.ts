// Johnnie-O brand-specific color name → AppColor mapping.
//
// Resolution order context: this runs at step 1 (before common.ts and keyword scan).
// Only include names that cannot be resolved by common.ts or canonical keywords.
// Names already in common.ts (thunder, meteor, cedar, port, cocoa, tobacco, cranberry,
// pumpkin, mango, cinnamon) and canonical keywords (royal) are intentionally omitted.
//
// Visual verification source: product images pulled from live Shopify CDN.
// Ambiguous coastal/poetic names (Mahalo, Tarpon, Sublime, etc.) were image-checked.
// Inferred names (single-occurrence, name-based reasoning) are noted inline.

import type { AppColor } from "@/lib/normalize/colors/canonical";

export const JOHNNIE_O_COLORS: Record<string, AppColor> = {

  // ── NAVY ──────────────────────────────────────────────────────────────────
  "seal":            "navy",   // JO signature heathered navy (highest-volume colorway)
  "heather twilight":"navy",   // heathered navy blend
  "twilight":        "navy",   // deep navy tone
  "nightshadow":     "navy",   // dark navy blend (alternate spelling)
  "night shadow":    "navy",   // dark navy blend
  "majorca":         "navy",   // Mediterranean island = JO deep navy
  "sardinia":        "navy",   // Mediterranean island = navy
  "oceanside":       "navy",   // ✓ visually: navy striped polo
  "abyss":           "navy",   // deep ocean = very dark navy
  "galaxy":          "navy",   // deep space = near-navy charcoal
  "mystic":          "navy",   // dark, mysterious = navy
  "kanaloa":         "navy",   // Hawaiian ocean god (deep sea) = navy
  "barcelona":       "navy",   // coastal city = classic navy
  "star spangled":   "navy",   // ✓ visually: dark navy/pink tropical-flag print shorts
  "victory":         "navy",   // ✓ visually: solid dark navy Tour Championship polo
  "the new yorker":  "navy",   // ✓ visually: navy-background colorful print polo

  // ── BLUE ──────────────────────────────────────────────────────────────────
  "maliblu":         "blue",   // Malibu blue — JO's high-volume bright blue (36 products)
  "wake":            "blue",   // lake/surfing blue (21 products)
  "lake":            "blue",   // open-water blue (16 products)
  "mahalo":          "blue",   // ✓ visually: medium blue floral polo
  "sound side":      "blue",   // ✓ visually: blue/white stripe polo
  "verbena":         "blue",   // ✓ visually: very light blue polo
  "infinity":        "blue",   // ✓ visually: blue tropical print button-down
  "macaw":           "blue",   // ✓ visually: heathered blue quarter-zip
  "dawn":            "blue",   // ✓ visually: pale light blue shorts
  "splash":          "blue",   // ✓ visually: heathered medium blue quarter-zip
  "monsoon":         "blue",   // ✓ visually: cornflower blue shorts
  "placid":          "blue",   // ✓ visually: pale powder blue longsleeve
  "kona lake":       "blue",   // ✓ visually: blue/white fine-stripe polo
  "seychelles":      "blue",   // ✓ visually: cornflower/periwinkle blue hoodie
  "swingin":         "blue",   // ✓ visually: blue tropical print swim shorts
  "lapis":           "blue",   // lapis lazuli gemstone = deep blue
  "topaz":           "blue",   // topaz gemstone = blue
  "curacao":         "blue",   // Caribbean island = turquoise-blue
  "vista":           "blue",   // scenic overlook = blue sky
  "fountain":        "blue",   // water feature = blue

  // ── TEAL ──────────────────────────────────────────────────────────────────
  "tarpon":          "teal",   // ✓ visually: mint/aqua striped polo
  "tropical":        "teal",   // ✓ visually: pale teal/white fine-stripe polo
  "sublime":         "teal",   // ✓ visually: sage/seafoam hoodie
  "caladesi":        "teal",   // ✓ visually: light teal swim shorts (Caladesi Island, FL)
  "seaglass":        "teal",   // sea glass = blue-green teal
  "spearmint":       "teal",   // spearmint = cool mint (teal family in athleisure)
  "high tide":       "teal",   // coastal tidal water = teal
  "sanibel":         "teal",   // Sanibel Island, FL = coastal teal

  // ── GREEN ──────────────────────────────────────────────────────────────────
  "cilantro":        "green",  // ✓ visually: heathered bright green hoodie
  "mangrove":        "green",  // coastal mangrove trees = deep green
  "honeydew":        "green",  // honeydew melon = pale green
  "pesto":           "green",  // herb sauce = green
  "pistachio":       "green",  // pistachio nut = pale green
  "ponderosa":       "green",  // Ponderosa pine = forest green
  "serrano":         "green",  // serrano pepper (green in fashion context)

  // ── OLIVE ──────────────────────────────────────────────────────────────────
  "sequoia":         "olive",  // ✓ visually: heathered olive quarter-zip

  // ── GREY ──────────────────────────────────────────────────────────────────
  "haze":            "grey",   // soft hazy grey
  "chrome":          "grey",   // metallic grey
  "echo":            "grey",   // ✓ visually: pale grey/stone sweatshirt
  "quarry":          "grey",   // stone quarry = grey
  "steel":           "grey",   // steel = medium grey
  "zen":             "grey",   // peaceful, muted = grey
  "dolphin":         "grey",   // dolphin = grey marine animal
  "forged":          "grey",   // forged metal = charcoal
  "monument":        "grey",   // stone monument = grey
  "moonstruck":      "grey",   // moon = grey
  "noreaster":       "grey",   // nor'easter storm = grey
  "space":           "grey",   // outer space = dark grey
  "carbon fiber":    "grey",   // carbon fiber material = dark grey (not in common.ts)
  "pebble":          "grey",   // river pebble = grey

  // ── PINK ──────────────────────────────────────────────────────────────────
  "azalea":          "pink",   // ✓ visually: pink/white fine-stripe polo
  "lollipop":        "pink",   // ✓ visually: pale pink t-shirt
  "cabo":            "pink",   // ✓ visually: bright pink polo
  "bandana":         "pink",   // ✓ visually: dusty rose/salmon t-shirt
  "berry":           "pink",   // ✓ visually: heathered pink quarter-zip
  "conch":           "pink",   // ✓ visually: light coral/pink button-down
  "pamplemousse":    "pink",   // ✓ visually: light pink polo (pamplemousse = grapefruit in French)
  "petal":           "pink",   // flower petal = pink
  "anemone":         "pink",   // sea anemone = rose/pink
  "shelly":          "pink",   // shell pink
  "tulip":           "pink",   // tulip flower = pink
  "rosewater":       "pink",   // rosewater = delicate pink

  // ── WHITE ──────────────────────────────────────────────────────────────────
  // JO uses poetic colorway names for their print-base-white products.
  // The dominant visible color on all of these is white.
  "tide":            "white",  // ✓ visually: white polo with scattered blue dot print
  "barracuda":       "white",  // ✓ visually: white Americana novelty print polo
  "breeze":          "white",  // ✓ visually: white base with orange/blue plaid shirt
  "punch":           "white",  // ✓ visually: white polo with small pink palm-tree print
  "zona":            "white",  // ✓ visually: white polo with colorful small print
  "big texas":       "white",  // ✓ visually: white Texas-themed novelty print polo
  "show biz":        "white",  // ✓ visually: white novelty print polo
  "manhatty":        "white",  // ✓ visually: white polo with small blue/grey print

  // ── RED ───────────────────────────────────────────────────────────────────
  "lobster":         "red",    // lobster = bright red
  "snapper":         "red",    // ✓ visually: rust/brick-red plaid shirt
  "fiesta":          "red",    // fiesta = festive red

  // ── BROWN ─────────────────────────────────────────────────────────────────
  "kona":            "brown",  // Kona coffee = dark brown (JO's primary brown name)
  "whiskey":         "brown",  // whiskey = amber brown
  "grizzly":         "brown",  // grizzly bear = brown

  // ── BURGUNDY ──────────────────────────────────────────────────────────────
  "vino":            "burgundy",  // vino = wine = burgundy
  "madeira":         "burgundy",  // Madeira wine island = deep burgundy

  // ── PURPLE ────────────────────────────────────────────────────────────────
  "aviation":        "purple",  // ✓ visually: heathered lavender/purple polo
  "daybreak":        "purple",  // ✓ visually: solid lavender/lilac t-shirt (not sunrise orange)
  "thistle":         "purple",  // thistle flower = purple
  "wisteria":        "purple",  // wisteria vine = purple
  "acai":            "purple",  // acai berry = deep purple

  // ── YELLOW ────────────────────────────────────────────────────────────────
  "canary":          "yellow",  // canary bird = bright yellow
  "freesia":         "yellow",  // freesia flower = yellow

  // ── BEIGE ─────────────────────────────────────────────────────────────────
  "alpaca":          "beige",  // alpaca wool = warm cream/beige
  "almond":          "beige",  // almond = pale warm beige
  "scallop":         "beige",  // scallop shell = off-white/cream

  // ── TAN ───────────────────────────────────────────────────────────────────
  "barley":          "tan",    // barley grain = medium warm tan
};
