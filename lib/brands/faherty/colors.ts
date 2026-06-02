import type { AppColor } from "@/lib/normalize/colors/canonical";

// Faherty brand color dictionary.
//
// Modifier stripping (resolver steps 4-5) strips heather/melange/etc. and re-checks
// common.ts + canonical keywords — NOT this brand dict. So every Faherty-specific base color
// that isn't in common.ts/canonical needs an explicit "X heather" / "X melange" entry here.
//
// "twill" is not in the MODIFIERS set — "Fall Evergreen Twill" must appear explicitly.
//
// Image-verified colors are marked [img]. Color verification performed 2026-06-01.
// Blazer verification: all 24 blazer products (Inlet Knit Blazer, Knit Blazer, Highland Knit
// Blazer, Movement Linen Blazer) are unstructured soft-construction sport coats → jackets.

export const FAHERTY_COLORS: Record<string, AppColor> = {

  // ── BLACK ─────────────────────────────────────────────────────────────────
  "heathered black":           "black",
  "heathered black twill":     "black",
  "ridge black":               "black",
  "faded black":               "black",
  "mountain black":            "black",
  "black sky":                 "grey",   // very dark charcoal, not pure black in context
  "black sky melange":         "black",

  // ── WHITE ─────────────────────────────────────────────────────────────────
  "sea salt":                  "white",  // light mineral white
  "whitecap":                  "white",
  "boneyard white":            "white",
  "natural":                   "beige",  // common.ts has "natural": "beige" — explicit for safety

  // ── GREY ──────────────────────────────────────────────────────────────────
  "fossil":                    "grey",   // [img] silver-grey shorts (NOT white; grey confirmed)
  "fossil heather":            "grey",
  "granite":                   "grey",
  "granite heather":           "grey",   // [img] mid-grey heather
  "great falls heather":       "grey",   // compound; "great falls" → not resolvable without entry
  "dusty iron":                "grey",
  "dusty iron heather":        "grey",   // [img] dark charcoal-grey heather polo
  "mountain coal":             "grey",   // [img] very dark charcoal (not black; confirmed)
  "flint":                     "grey",   // flint stone = silver-grey
  "light flint":               "grey",
  "flintstone":                "grey",
  "offshore storm":            "grey",   // "storm" → common.ts → grey
  "coal smoke melange":        "grey",
  "medium grey melange":       "grey",
  "heather grey":              "grey",
  "light heather grey":        "grey",
  "silver ash heather":        "grey",
  "ice grey":                  "grey",
  "lakeshore grey":            "grey",
  "rainier grey heather":      "grey",
  "cave grey heather":         "grey",
  "pebble grey heather":       "grey",
  "rocky grey":                "grey",
  "graphite tide":             "grey",
  "wind grey":                 "grey",
  "alpine grey herringbone":   "grey",
  "wolf sands herringbone":    "tan",    // sand-colored tweed — closer to tan

  // ── NAVY ──────────────────────────────────────────────────────────────────
  // "blue nights" would resolve to "blue" via canonical keyword scan at step 6;
  // Faherty's Blue Nights is consistently a dark navy → override at step 1.
  "blue nights":               "navy",
  "midnight skies heather":    "navy",   // dark night-sky heather
  "night ocean melange":       "navy",
  "navy ridge melange":        "navy",
  "deep navy melange":         "navy",
  "abyss navy":                "navy",
  "island navy":               "navy",
  "look out navy":             "navy",
  "ravine navy":               "navy",
  "dune navy":                 "navy",
  "playa navy":                "navy",
  "marine navy":               "navy",
  "brighton navy":             "navy",
  "brighton navy twill":       "navy",
  "navy ink twill":            "navy",
  "navy twilight herringbone": "navy",
  "10-year wash":              "navy",   // indigo pocket tee wash
  "deadstock wash":            "navy",
  "brookshore wash":           "navy",
  "storm river wash":          "navy",
  "hendricks indigo wash":     "navy",
  "belmar coast wash":         "navy",
  "eastern shore wash":        "navy",
  "indigo ocean wash":         "navy",
  "riverbend wash":            "navy",
  "indigo rising sky":         "navy",   // indigo dye = navy
  "navy night melange":        "navy",

  // ── BLUE ──────────────────────────────────────────────────────────────────
  "deep marine":               "blue",   // [img] washed chambray medium blue linen shirt
  "patina pool":               "blue",   // [img] light sky/powder blue shorts
  "tradewinds":                "blue",   // [img] medium indigo denim wash 5-pocket pant
  "alaskan blue":              "blue",
  "alaskan blue twill":        "blue",
  "glacier blue twill":        "blue",
  "rocky blue":                "blue",
  "blue isle":                 "blue",
  "dusk blue":                 "blue",
  "cardiff blue heather":      "blue",
  "huron blue melange":        "blue",
  "light blue melange":        "blue",
  "antilles blue":             "blue",   // Caribbean blue, not green
  "mautan blue":               "blue",
  "oceancrest wash":           "blue",
  "harbor blue":               "blue",

  // ── TEAL ──────────────────────────────────────────────────────────────────
  "sea break":                 "teal",   // [img] muted mint-teal sweater polo
  "pacific tides":             "teal",   // [img] rich medium teal embroidered linen shirt
  "summer isle":               "teal",   // [img] light mint/seafoam hoodie
  "hull teal":                 "teal",
  "ocean glass":               "teal",
  "ocean glass twill":         "teal",
  "sea cavern":                "teal",

  // ── GREEN ─────────────────────────────────────────────────────────────────
  "fall evergreen":            "green",  // [img] rich dark forest green
  "fall evergreen twill":      "green",
  "fall evergreen heather":    "green",
  "spruce":                    "green",  // [img] medium forest/army green linen shirt
  "island spruce":             "green",
  "mountain branch heather":   "green",  // compound name, strip fails → explicit
  "biscayne green":            "green",
  "aspen green":               "green",
  "aspen green melange":       "green",
  "light pine":                "green",  // "pine" canonical → green ✓; explicit for compound
  "maine forest":              "green",
  "agona green":               "green",  // Surf Ghana Ghana green

  // ── OLIVE ─────────────────────────────────────────────────────────────────
  // Sage → common.ts default: green. Faherty's Coastal Sage and Sage Cliff are army-olive.
  // Override here at step 1 (before common.ts step 2) for these specific compound names.
  "coastal sage":              "olive",  // [img] muted sage/army green shorts
  "coastal sage heather":      "olive",
  "sage cliff":                "olive",  // [img] light olive/khaki-green shorts
  "sage cliff heather":        "olive",
  "timber":                    "olive",  // [img] warm olive-brown khaki camp shirt
  "timber heather":            "olive",
  "timber twill":              "olive",
  "olive brush melange":       "olive",
  "olive valley":              "olive",
  "olive night":               "olive",
  "terrain olive":             "olive",
  "desert olive":              "olive",
  "mountain olive":            "olive",
  "trail olive":               "olive",
  "surplus olive":             "olive",
  "faded olive":               "olive",
  "faded leaf melange":        "olive",
  "olive lake herringbone":    "olive",
  "moss stone melange":        "olive",
  "dusty sage hilo":           "olive",

  // ── BROWN ─────────────────────────────────────────────────────────────────
  "wood bark":                 "brown",
  "cedar valley":              "brown",
  "valley brown twill":        "brown",
  "island brown":              "brown",
  "kodiak brown":              "brown",
  "elk brown":                 "brown",
  "trail brown heather":       "brown",
  "walnut branch":             "brown",  // "walnut" → common.ts brown; explicit compound
  "maple brown":               "brown",
  "chestnut ridge":            "brown",
  "woodland herringbone":      "brown",  // woodland = warm brown-olive tweed

  // ── RED ───────────────────────────────────────────────────────────────────
  "redwood":                   "red",    // [img] warm brick/terracotta-red shorts
  "redwood heather":           "red",
  "cavern clay":               "red",    // [img] warm brick-red Surf Ghana tee
  "lava rock":                 "red",    // volcanic dark red (semantic: lava = warm red-brown)
  "lava rock heather":         "red",
  "gulf red":                  "red",
  "eclipse red":               "red",
  "sandstone red twill":       "red",

  // ── ORANGE ────────────────────────────────────────────────────────────────
  // (most orange names resolve via common.ts: rust, amber, sienna, terracotta, clay → orange)
  "dusty sienna":              "orange", // strip "dusty" → "sienna" → common.ts orange ✓

  // ── YELLOW ────────────────────────────────────────────────────────────────
  "tuscan sun":                "yellow", // [img] bright golden/mustard Surf Ghana hoodie
  "faded sun":                 "yellow",

  // ── PINK ──────────────────────────────────────────────────────────────────
  "adobe":                     "pink",   // [img] dusty blush-pink chino shorts
  "adobe heather":             "pink",
  "grapefruit":                "pink",
  "pink sand":                 "pink",
  "cedar rose":                "pink",   // cedar rose = warm blush pink
  "coastal mauve":             "pink",   // "mauve" → common.ts pink ✓; explicit compound
  "coral dawn":                "pink",

  // ── BEIGE ─────────────────────────────────────────────────────────────────
  "antique ivory":             "beige",  // base for heather variant
  "antique ivory heather":     "beige",  // [img] very light warm cream with grey heather
  "cabo blanco":               "beige",  // [img] off-white/cream Jalen Brunson hoodie
  "oat plains heather":        "beige",  // "oat plains" → not resolvable without entry
  "oat":                       "beige",
  "light sand":                "beige",
  "dorset sand":               "beige",
  "weathered sand":            "beige",
  "sandy dusk":                "beige",
  "ivory hill melange":        "beige",
  "island dune heather":       "beige",  // "dune" → canonical beige ✓; explicit compound
  "khaki stone herringbone":   "tan",    // khaki-stone tweed → closer to tan
  "sandbar coast twill":       "beige",
  "fossil grey twill":         "grey",   // grey twill (Legend Sweater Shirt)
  "soft dune heather":         "beige",

  // ── TAN ───────────────────────────────────────────────────────────────────
  "dark rye":                  "tan",    // [img] dark khaki/camel 5-pocket pant
  "dark rye heather":          "tan",
  "field brown":               "tan",    // warm khaki-tan
  "flint creek":               "tan",    // warm tan/khaki
  "utility khaki":             "tan",

  // ── MULTI — PRINTS AND PATTERNS ──────────────────────────────────────────
  // Fishscale prints
  "fishscale":                 "multi",
  "fishscale redux":           "multi",
  "midnight fishscale":        "multi",
  "island sand fishscale":     "multi",

  // Flag / patriotic
  "faded flag":                "multi",

  // Sunrise / sunset / gradient (multi-color)
  "island sunrise":            "multi",  // [img] confirmed multi-stripe high-pile fleece
  "ocean sunrise":             "multi",
  "daybreak ombre":            "multi",
  "mist sunburst":             "multi",  // sunburst = radial print
  "daybreak star nation":      "multi",  // graphic print
  "grey night stars":          "multi",  // graphic print

  // Stripe prints
  "shell point stripe":        "multi",
  "boothbay stripe":           "multi",
  "summer skies stripe":       "multi",
  "ivory desert stripe":       "multi",
  "cream flint stripe":        "multi",
  "northern depths stripe":    "multi",
  "logan creek stripe":        "multi",
  "pearl ocean stripe":        "multi",
  "navy stream stripe":        "multi",
  "beach sky stripe":          "multi",
  "ice grey surf stripe":      "multi",
  "nighttime fire stripe":     "multi",
  "white biscayne stripe":     "multi",
  "bermuda sail stripe":       "multi",
  "canyon creek stripe":       "multi",
  "coast coral stripe":        "multi",
  "coast orchid stripe":       "multi",
  "river rapids stripe":       "multi",
  "whitecap navy stripe":      "multi",
  "ivory breton stripe":       "multi",
  "white surf stripe":         "multi",
  "dune stripe":               "multi",
  "dune stripe navy":          "multi",
  "dune stripe mist":          "multi",
  "navy rose stripe":          "multi",
  "ivory spring stripe":       "multi",
  "long valley stripe":        "multi",
  "ravine waters stripe":      "multi",
  "azure beach stripe":        "multi",
  "dark cloud stripe":         "multi",
  "sea shadow stripe":         "multi",
  "moonlight point stripe":    "multi",
  "summer classic stripe":     "multi",
  "rose creek stripe":         "multi",
  "channel cove stripe":       "multi",
  "blue cape stripe":          "multi",
  "wood wall stripe":          "multi",
  "rock coast stripe":         "multi",
  "isle breeze stripe":        "multi",
  "summit creek stripe":       "multi",
  "olive safari stripe":       "multi",
  "river cliffs stripe":       "multi",
  "beach tree stripe":         "multi",
  "shore rock stripe":         "multi",
  "cannon beach stripe":       "multi",
  "cay blues block":           "multi",
  "indigo waterway stripe":    "multi",
  "blue cream suns":           "multi",
  "oat navy stripe":           "multi",
  "blue dune stripe":          "multi",
  "orchid wake stripe":        "multi",
  "blue wake stripe":          "multi",
  "desert wake stripe":        "multi",

  // Surf stripe
  "brighton navy surf stripe":     "multi",
  "charcoal heather surf stripe":  "multi",
  "winter oat surf stripe":        "multi",

  // Feeder stripes (two-tone knit)
  "blue ivory feeder":         "multi",
  "ivory sky feeder":          "multi",
  "rock grey feeder":          "multi",
  "shore sand feeder":         "multi",
  "ivory rose feeder":         "multi",
  "mountain bark feeder":      "multi",
  "coastal shore stripe":      "multi",

  // Palm / tropical prints
  "dark palm":                 "multi",
  "ivory tropic trees":        "multi",
  "ocean shore trees":         "multi",
  "sunlit palm & waves":       "multi",
  "molokai scenic tropical":   "multi",
  "ivory paradise palm":       "multi",
  "olive palm beach":          "multi",
  "navy palm check":           "multi",
  "stone palm check":          "multi",
  "sun blossom":               "yellow", // solid golden yellow (not a print)

  // Summer / tile prints
  "summer waves tile":         "multi",

  // Floral prints
  "clear sky leaf":            "multi",
  "clear waters blossom":      "multi",
  "coral beach floral":        "multi",
  "stormy sea floral":         "multi",
  "stormy sea lotus":          "multi",
  "spruce lotus tile":         "multi",
  "navy red lotus":            "multi",
  "sky beach foliage":         "multi",
  "sky blue frond":            "multi",
  "marine palm foliage":       "multi",
  "sage grove foliage":        "multi",
  "teal grove foliage":        "multi",
  "mauve tropic foliage":      "multi",
  "aspen green leaf":          "multi",
  "ivory sky rainforest":      "multi",
  "lavender sky canopy":       "multi",
  "antique berry floral":      "multi",
  "hilo rose floral print":    "multi",
  "eastern sky blossom":       "multi",
  "grapefruit linen floral":   "multi",
  "sunseeker blossom":         "multi",
  "fjord bloom":               "multi",
  "garden valley":             "multi",  // tropical print
  "graphite rainforest":       "multi",

  // Geometric / mosaic / pattern
  "rose palm mosaic":          "multi",
  "navy dusk diamond":         "multi",
  "stony beach diamond":       "multi",
  "mauve blossom geo":         "multi",
  "wood sunray block":         "multi",

  // Plaid / check / buffalo / herringbone patterns
  "atlantic stone buffalo":    "multi",
  "sedona plains plaid":       "multi",
  "eagle harbor plaid":        "multi",
  "sandy reef plaid":          "multi",
  "khaki pincheck":            "multi",
  "indigo island buffalo":     "multi",

  // Tie-dye
  "blue ravine tie dye":       "multi",
  "red ravine tie dye":        "multi",

  // Ikat / shibori / other artisan prints
  "cedar lake ikat":           "multi",
  "citrus valley":             "multi",  // shibori palma
  "citrus blossom":            "multi",
  "sankofa tile clay":         "multi",

  // Patchwork / scenic
  "habor blues patchwork":     "multi",  // (sic — Faherty uses this spelling)

  // Melange and texture that are two-tone
  "flint white melange":       "multi",  // two-tone
};
