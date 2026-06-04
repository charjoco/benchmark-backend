import type { AppColor } from "@/lib/normalize/colors/canonical";

// AG Jeans brand color dictionary — 150+ opaque wash names.
// AG uses geographic (CASTRO VALLEY), abstract (FATHOM, VIPER), cocktail (NEGRONI),
// year-aged (15 YEARS VOLCANIC), and sulfur-dyed (SULFUR COASTAL MOSS) color names.
// None resolve via the standard pipeline without explicit entries.
//
// Methodology (2026-06-03):
//   [img] = product image viewed and wash color confirmed visually
//   [AG:Color] = AG's own Color: product tag used as ground truth
//   [yr] = year-aged wash: 1-9yr → navy (dark indigo), 10+yr → blue (lighter fade)
//   [suf] = sulfur-dyed: descriptor after "SULFUR" or "X YRS SULFUR" indicates hue
//
// "BUNDLED" color (4 bundle-deal products): placeholder with no real colorway — not
// included here; resolves to null and logs as UnknownColor.

export const AG_JEANS_COLORS: Record<string, AppColor> = {

  // ── BLACK ──────────────────────────────────────────────────────────────────
  "fathom":                         "black",   // [img] pure flat black
  "vintage ink":                    "black",   // [img] near-black with very subtle blue cast
  "1 year doheny":                  "black",   // [AG:Black] black-base indigo 1yr
  "10 years cassil":                "black",   // [AG:Black] black-base 10yr
  "17 years hammond":               "black",   // [AG:Black] aged black denim
  "3 years flight night":           "grey",    // [img] near-black raw selvedge; [AG:Grey] — trusting tag over visual
  "cypress lake":                   "black",   // [AG:Black]
  "marble tan":                     "black",   // [AG:Black] counterintuitive name — trusting AG tag
  "peterson":                       "black",   // [AG:Black]
  "rattlesnake":                    "black",   // [AG:Black]
  "yoru":                           "black",   // [AG:Black] "yoru" = night in Japanese
  "7 yrs sulfur pure black":        "black",   // [AG:Black]
  "sulfur pure black":              "black",   // [AG:Black]
  "sulfur super black":             "black",   // [AG:Black]
  "sulfur fossil grey":             "black",   // [AG:Black] AG tags Black despite "grey" in name
  "sulfur antique black":           "black",   // [AG:Black]

  // ── NAVY ───────────────────────────────────────────────────────────────────
  // Dark indigo washes — visually confirmed or 1-9yr indigo-base aged washes
  "monument":                       "navy",    // [img] very dark indigo
  "viper":                          "navy",    // [img] dark indigo
  "midlands":                       "navy",    // [img] dark indigo
  "crucial":                        "navy",    // [img] dark indigo on model
  "crusade":                        "navy",    // [img] dark blue on model
  "castro valley":                  "navy",    // [img] dark faded blue
  "negroni":                        "navy",    // [img] dark blue (cocktail name ≠ cocktail color)
  "old fashioned":                  "navy",    // [img] medium-dark blue
  "stellar":                        "navy",    // [img] near-black; AG:Blue — dark blue family
  "1 year post":                    "navy",    // [img] raw selvedge very dark indigo
  "akira":                          "navy",    // [img] selvedge dark indigo [AG:Blue]
  "raw":                            "navy",    // [AG:Blue] raw/unwashed = darkest indigo
  "1 year fremont":                 "navy",    // [AG:Blue] [yr] 1yr
  "2 years chelton":                "navy",    // [AG:Blue] [yr] 2yr
  "2 years emmet":                  "navy",    // [AG:Blue] [yr] 2yr
  "2 years eureka":                 "navy",    // [AG:Blue] [yr] 2yr
  "2 years prose":                  "navy",    // [AG:Blue] [yr] 2yr
  "3 years golden hour":            "navy",    // [AG:Blue] [yr] 3yr
  "4 years diaz":                   "navy",    // [AG:Blue] [yr] 4yr
  "4 years martel":                 "navy",    // [AG:Blue] [yr] 4yr
  "5 years getaway":                "navy",    // [AG:Blue] [yr] 5yr
  "5 years underwood":              "navy",    // [AG:Blue] [yr] 5yr
  "6 years el paso":                "navy",    // [AG:Blue] [yr] 6yr
  "6 years ferry":                  "navy",    // [AG:Blue] [yr] 6yr
  "6 years sideways":               "navy",    // [AG:Blue] [yr] 6yr
  "8 years roca":                   "navy",    // [AG:Blue] [yr] 8yr
  "8 years manchester":             "navy",    // [AG:Blue] [yr] 8yr
  "9 years alton":                  "navy",    // [AG:Blue] [yr] 9yr
  "9 years reward":                 "navy",    // [AG:Blue] [yr] 9yr
  "7 years sulfur modern navy":     "navy",    // [AG:Blue] [suf] explicit "navy"
  "7 years sulfur after dusk":      "navy",    // [AG:Blue] [suf] after dusk = dark blue
  "sulfur after dusk":              "navy",    // [AG:Blue] [suf]

  // ── BLUE ───────────────────────────────────────────────────────────────────
  // Medium to light indigo/blue washes — 10+yr aged or verified medium washes
  "sequel":                         "blue",    // [img] medium classic blue
  "ashfield":                       "blue",    // [img] medium faded blue
  "grove":                          "blue",    // [img] medium blue
  "highlight":                      "blue",    // [img] very light/pale blue
  "saltillo":                       "blue",    // [img] very light blue
  "20 years barrett":               "blue",    // [img] very light, near-bleached
  "15 years volcanic":              "blue",    // [img] light-medium blue
  "10 years raymond":               "blue",    // [AG:Blue] [yr] 10yr
  "11 years robust":                "blue",    // [AG:Blue] [yr] 11yr
  "11 years capra":                 "blue",    // [AG:Blue] [yr] 11yr
  "14 years bloomington":           "blue",    // [AG:Blue] [yr] 14yr
  "15 years rafael":                "blue",    // [AG:Blue] [yr] 15yr
  "15 years merrick":               "blue",    // [AG:Blue] [yr] 15yr
  "16 years pegasus":               "blue",    // [AG:Blue] [yr] 16yr
  "16 years calafia":               "blue",    // [AG:Blue] [yr] 16yr
  "17 years sommelier":             "blue",    // [AG:Blue] [yr] 17yr
  "18 years keynote":               "blue",    // [AG:Blue] [yr] 18yr
  "18 years vienna":                "blue",    // [AG:Blue] [yr] 18yr
  "19 years juniper":               "blue",    // [AG:Blue] [yr] 19yr
  "19 years mobius":                "blue",    // [AG:Blue] [yr] 19yr
  "19 years coyote":                "blue",    // [AG:Blue] [yr] 19yr
  "19 years garden grove":          "blue",    // [AG:Blue] [yr] 19yr
  "20 years nomad":                 "blue",    // [AG:Blue] [yr] 20yr
  "21 years stargaze distressed":   "blue",    // [AG:Blue] [yr] 21yr
  "22 years tanner":                "blue",    // [AG:Blue] [yr] 22yr
  "22 years golden state":          "blue",    // [AG:Blue] [yr] 22yr very light
  "24 years plunge":                "blue",    // [AG:Blue] [yr] 24yr palest
  "7 years vintage cornflower":     "blue",    // [AG:Blue] [yr] cornflower = light blue
  "7 years sulfur fresh blue":      "blue",    // [AG:Blue] [suf] explicit blue
  "7 years sulfur soft blue":       "blue",    // [AG:Blue] [suf] soft blue
  "sulfur fresh blue":              "blue",    // [AG:Blue] [suf]
  "sulfur soft blue":               "blue",    // [AG:Blue] [suf]
  "sulfur pier blue":               "blue",    // [AG:Blue] [suf] pier blue = medium-light
  "sulfur ashline":                 "blue",    // [AG:Blue] [suf] despite "ash" in name
  "7 years sulfur ashline":         "blue",    // [AG:Blue] prefixed form also present in catalog
  "7 yrs sul stone barrack":        "grey",    // abbreviated "7 Yrs Sulfur Stone Barrack"; stone=grey
  "sulfur marine haze":             "blue",    // [AG:Blue] [suf] marine = blue
  // Geographic/abstract — all AG:Blue, unverified, default to blue (medium wash range)
  "alameda":                        "blue",    // [AG:Blue]
  "assante":                        "blue",    // [AG:Blue]
  "banner":                         "blue",    // [AG:Blue]
  "barton":                         "blue",    // [AG:Blue]
  "bellingham":                     "blue",    // [AG:Blue]
  "benson":                         "blue",    // [AG:Blue]
  "bishop":                         "blue",    // [AG:Blue]
  "bolton":                         "blue",    // [AG:Blue]
  "camillo":                        "blue",    // [AG:Blue]
  "carlson":                        "blue",    // [AG:Blue]
  "chaparral":                      "blue",    // [AG:Blue]
  "colfax":                         "blue",    // [AG:Blue]
  "gower":                          "blue",    // [AG:Blue]
  "greensboro":                     "blue",    // [AG:Blue]
  "hastings":                       "blue",    // [AG:Blue]
  "horsetail":                      "blue",    // [AG:Blue]
  "manzanita":                      "blue",    // [AG:Blue]
  "mastodon":                       "blue",    // [AG:Blue]
  "maze":                           "blue",    // [AG:Blue]
  "moorten":                        "blue",    // [AG:Blue]
  "normandy":                       "blue",    // [AG:Blue]
  "northern vine":                  "blue",    // [AG:Blue]
  "palmer":                         "blue",    // [AG:Blue]
  "palms":                          "blue",    // [AG:Blue]
  "plateau":                        "blue",    // [AG:Blue]
  "promiseland":                    "blue",    // [AG:Blue]
  "sequoia":                        "blue",    // [AG:Blue]
  "soledad":                        "blue",    // [AG:Blue]
  "tailor":                         "blue",    // [AG:Blue]
  "takayama":                       "blue",    // [AG:Blue] Japanese place name
  "tamarack":                       "blue",    // [AG:Blue]
  "upton":                          "blue",    // [AG:Blue]
  "ventana":                        "blue",    // [AG:Blue]
  "vineyard rinse":                 "blue",    // [AG:Blue]
  "vp blix":                        "blue",    // [AG:Blue] VP = vintage premium line
  "vp mariposa":                    "blue",    // [AG:Blue]
  "yountville":                     "blue",    // [AG:Blue] Napa Valley town

  // ── GREY ───────────────────────────────────────────────────────────────────
  "westwind":                       "grey",    // [img] medium faded grey denim
  "acoustic":                       "grey",    // [AG:Grey]
  "curson":                         "grey",    // [AG:Grey]
  "gemfield":                       "grey",    // [AG:Grey]
  "glacier point":                  "grey",    // [AG:Grey]
  "half dome":                      "grey",    // [AG:Grey]
  "vp monteel":                     "grey",    // [AG:Grey]
  "5 years grandstand":             "grey",    // [AG:Grey] grey-base aged wash
  "15 years abalone":               "grey",    // [AG:Grey] abalone = iridescent grey-blue shell
  "7 years sulfur classic grey":    "grey",    // [AG:Grey]
  "7 years sulfur ironwood":        "grey",    // [AG:Grey] ironwood reads grey
  "sulfur storm grey":              "grey",    // [AG:Grey]
  "sulfur dark ash":                "grey",    // [img] very dark charcoal grey [AG:Grey]

  // ── WHITE ──────────────────────────────────────────────────────────────────
  "white":                          "white",   // [AG:White]
  "pristine":                       "white",   // [AG:White]
  "1 year sulfur chalk":            "white",   // [AG:White]

  // ── TAN / KHAKI ────────────────────────────────────────────────────────────
  // AG tags these Color:Khaki — earthy, sandy, warm-neutral denim
  "natural":                        "tan",     // [AG:Khaki] undyed natural cotton; [pipeline: beige] override
  "1 year ivory cream":             "tan",     // [AG:Khaki] ivory/cream denim
  "cafe con leche":                 "tan",     // [AG:Khaki] café au lait = warm camel-tan
  "sulfur dry dust":                "tan",     // [img] warm khaki/tan [AG:Khaki]
  "sulfur taupe grey":              "tan",     // [AG:Khaki] taupe reads more khaki than grey
  "sulfur golden hickory":          "tan",     // [AG:Khaki] golden hickory = warm sandy tan
  "sulfur sienna sand":             "tan",     // [AG:Khaki] sienna+sand = earthy tan (pipeline: orange via sienna)
  "sulfur coastal pebble":          "tan",     // [AG:Khaki] pebble = sandy beige
  "sulfur valley tan":              "tan",     // [AG:Khaki] explicit "tan"
  "7 years sulfur valley tan":      "tan",     // [AG:Khaki]
  "7 years sulfur coastal pebble":  "tan",     // [AG:Khaki]

  // ── BROWN ──────────────────────────────────────────────────────────────────
  "7 years sulfur brown slate":     "brown",   // [AG:Brown] brown slate = dark warm brown
  "7 years sulfur oak barrel":      "brown",   // [AG:Brown] oak barrel = rich brown
  "sulfur oak barrel":              "brown",   // [AG:Brown]

  // ── GREEN / OLIVE ──────────────────────────────────────────────────────────
  // AG tags these Color:Green — all earthy moss/sage/alpine olive tones
  "7 years sulfur coastal moss":    "olive",   // [AG:Green] coastal moss = army olive
  "7 years sulfur faded moss":      "olive",   // [AG:Green]
  "sulfur seaside sage":            "olive",   // [AG:Green] sage = olive green
  "sulfur dried cedar":             "olive",   // [AG:Green] cedar sulfur dye creates green tone
  "deep alpine":                    "olive",   // [AG:Green] alpine = mountain olive green

  // ── BURGUNDY ───────────────────────────────────────────────────────────────
  // pipeline catches "cranberry" via canonical keywords, but explicit entry is faster
  "7 years sulfur cranberry":       "burgundy", // [AG:Red] cranberry = dark wine/burgundy
  "sulfur cranberry":               "burgundy", // [AG:Red]
};
