import type { AppColor } from "@/lib/normalize/colors/canonical";

// Paige brand color dictionary — men's denim jeans catalog, image-audited 2026-06-04.
//
// Color source: colorSource="title", separator " - " (default)
// Title format: "<Style> <Inseam?> <Cut> Jean - <ColorName>"
// Example: "Transcend Federal 32 Inch Slim Straight Jean - Holoway"
//
// Paige uses two color group categories (from colorGroup:* tags):
//   colorGroup:Blues       → denim washes (all proprietary place/person names)
//   colorGroup:Solid Color → non-wash solid colors (blacks, greys, whites, neutrals, etc.)
//   colorGroup:Whites      → white denim
//
// ── RESOLUTION NOTES ────────────────────────────────────────────────────────────────────────
// Auto-resolvable without brand dict (not listed here):
//   Black, Black Shadow, Black Twill    → black  (step 6: \bblack\b keyword)
//   Crisp White                         → white  (step 6: \bwhite\b keyword)
//   Khaki Twill                         → tan    (step 6: \bkhaki\b keyword)
//   Muted Cherry                        → red    (step 4: strip "muted" → "cherry" → common.ts)
//   Natural Stone                       → beige  (step 4: strip "stone" → "natural" → common.ts)
//   Olive Branch, Olive Twill           → olive  (step 6: \bolive\b keyword)
//   Pale Silver                         → grey   (step 4: strip "pale" → "silver" → common.ts)
//   Pewter Stone                        → grey   (step 4: strip "stone" → "pewter" → common.ts)
//   True Navy                           → navy   (step 2: exact match in common.ts)
//   Vintage Pale Beige                  → beige  (step 5: strip "vintage"+"pale" → "beige" → keyword)
//
// All remaining names (Blues-group proprietary names + ambiguous Solid Color names) require
// explicit entries. Blues-group names are place/person names with no color semantics —
// none auto-resolve via canonical keyword scan.
//
// ── BLUES GROUP NOTE ────────────────────────────────────────────────────────────────────────
// Paige groups all denim washes under "colorGroup:Blues" regardless of actual color.
// Image-audited 2026-06-06 — all 58 washes checked against shop.paige.com product photos.
// Results: navy=21, blue=26, grey=9, white=1, black=1.
// ────────────────────────────────────────────────────────────────────────────────────────────

export const PAIGE_COLORS: Record<string, AppColor> = {

  // ── BLUES GROUP: DENIM WASHES (image-audited 2026-06-06) ─────────────────────
  // All proprietary place/person wash names; no color semantics in the names themselves.
  // "destructed" = distressed finish, not a modifier → explicit entry needed.
  "arti":             "grey",
  "bayson":           "blue",
  "benicio":          "navy",
  "bergen":           "grey",
  "berto destructed": "blue",
  "blondie":          "navy",
  "bradner":          "blue",
  "braswell":         "navy",
  "brockton":         "navy",
  "bromley":          "navy",
  "bunker":           "navy",
  "bushman":          "blue",
  "carrick":          "blue",
  "cartwright":       "blue",
  "cellar":           "navy",
  "cormac":           "navy",
  "covello":          "blue",
  "cumberland":       "blue",
  "dade":             "navy",
  "daroco":           "blue",
  "eldron":           "navy",
  "elshin":           "grey",
  "emberton":         "blue",
  "evanston":         "navy",
  "ferdinand":        "blue",
  "franjo":           "navy",
  "hansley":          "blue",
  "harlano":          "black",  // jet black denim (Paige groups in Blues collection)
  "hastings":         "navy",
  "healet":           "navy",
  "holoway":          "blue",
  "inkwell":          "navy",   // darkest indigo wash — ink = near-black pigment
  "irvington":        "navy",
  "judkins":          "blue",
  "kenmore":          "blue",
  "keppler":          "blue",
  "keswick":          "blue",
  "kian":             "grey",
  "kirkwin":          "navy",
  "laden":            "blue",
  "levine":           "blue",
  "milam":            "blue",
  "montfort":         "blue",
  "murrow":           "blue",
  "norby":            "white",  // pale off-white/ecru wash
  "pasco":            "grey",
  "pembry":           "navy",
  "remo":             "navy",
  "russ":             "navy",
  "salzedo":          "blue",
  "satler":           "navy",
  "sheldon":          "grey",
  "towry":            "blue",
  "truxton":          "grey",
  "vashon":           "grey",
  "wainwright":       "grey",
  "whitby":           "blue",
  "willard":          "blue",

  // ── SOLID COLOR GROUP: BLACKS ────────────────────────────────────────────────
  // Auto-resolves: Black, Black Shadow, Black Twill → black via step 6 \bblack\b keyword.
  // No explicit entries needed for those three.
  "carbon clay":      "grey",   // carbon = dark grey mineral; clay adds warmth → charcoal-grey denim

  // ── SOLID COLOR GROUP: GREYS ─────────────────────────────────────────────────
  // Auto-resolves: Pale Silver → grey (step 4); Pewter Stone → grey (step 4).
  "flint stone":      "grey",   // flint = dark grey mineral; "stone" strips but "flint" has no dict entry
  "harbor":           "grey",   // still-water neutral; Solid Color group (not a blue wash) → muted grey
  "shark skin":       "grey",   // sharkskin = dark smooth grey textile
  "vintage granite peak": "grey",  // granite = dark speckled grey; "vintage" strips but "granite peak" has no entry
  "vintage hail":     "grey",   // hail = light ice-grey; "vintage" strips but "hail" has no entry

  // ── SOLID COLOR GROUP: WHITES ────────────────────────────────────────────────
  // Auto-resolves: Crisp White → white via step 6 \bwhite\b keyword.
  "icecap":           "white",  // ice cap = pale white snow/ice
  "rice water":       "white",  // rice water = milky pale white

  // ── SOLID COLOR GROUP: BEIGE / TAN ───────────────────────────────────────────
  // Auto-resolves: Natural Stone → beige (step 4); Vintage Pale Beige → beige (step 5);
  //                Khaki Twill → tan (step 6).
  "dusty trail":      "tan",    // trail = earthy path; dusty = muted → warm muted tan
  "sea shell":        "beige",  // seashell = off-white with warm undertone → beige
  "vintage deep oak": "brown",  // oak wood = warm medium brown
  "sumatra blend":    "brown",  // Sumatra = dark roasty coffee brown

  // ── SOLID COLOR GROUP: NAVY / BLUE ───────────────────────────────────────────
  // Auto-resolves: True Navy → navy (step 2 common.ts exact match).
  "deep anchor":      "navy",   // anchor = nautical dark; "deep" strips → "anchor" has no entry → need explicit
  "vintage deep waters": "navy", // deep waters = dark oceanic blue; "vintage"+"deep" strip → "waters" has no entry

  // ── SOLID COLOR GROUP: GREEN / OLIVE ─────────────────────────────────────────
  // Auto-resolves: Olive Branch, Olive Twill → olive (step 6 \bolive\b keyword).
  "vintage bonsai":   "olive",  // bonsai = earthy Japanese aesthetic; muted olive-green for denim
  "vintage deep verdant": "green", // verdant = lush green; "vintage"+"deep" strip → "verdant" has no entry

  // ── SOLID COLOR GROUP: RED ───────────────────────────────────────────────────
  // Auto-resolves: Muted Cherry → red (step 4: strip "muted" → "cherry" → common.ts).
  "muted cherry":     "red",    // explicit for step-1 speed (also catches future "Cherry" standalone)

  // ── SOLID COLOR GROUP: ORANGE ────────────────────────────────────────────────
  "vintage moroccan clay": "orange", // Moroccan clay = terracotta/fired-earth → orange; "vintage" strips but "moroccan clay" has no entry

  // ── SOLID COLOR GROUP: YELLOW ────────────────────────────────────────────────
  "sunbeam":          "yellow", // sunbeam = bright warm golden-yellow

  // ── SOLID COLOR GROUP: TEAL ──────────────────────────────────────────────────
  "vintage tidal wave": "teal", // tidal wave = ocean blue-green; "vintage" strips → "tidal wave"; "tidal" in common.ts but not as exact 2-word match → needs explicit

  // ── SOLID COLOR GROUP: BURGUNDY ──────────────────────────────────────────────
  "vintage rosewood": "burgundy", // rosewood = dark reddish-brown wood → burgundy
};
