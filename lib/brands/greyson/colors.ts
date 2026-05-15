import type { AppColor } from "@/lib/normalize/colors/canonical";

// Greyson brand-specific color overrides.
// Keys are lowercase normalized (matching resolver's normalize() output).
// wolf/maltese/wolf blue/maltese blue are in common.ts — no need to repeat here.
export const GREYSON_COLORS: Record<string, AppColor> = {

  // ── GREY ──────────────────────────────────────────────────────────────────
  // dark charcoal heather on performance tees (the highest-volume garment type);
  // presents as solid black on fleece but grey is the representative bucket
  "shepherd":       "grey",

  // ── NAVY ──────────────────────────────────────────────────────────────────
  "midnight sky":   "navy",
  // confirmed: dark navy patterned hoodie
  "fjord":          "navy",
  // confirmed: dark navy base on tropical print (women's sample but color is clear)
  "aegean":         "navy",

  // ── BLUE ──────────────────────────────────────────────────────────────────
  // confirmed: classic medium blue
  "falcon":         "blue",
  "bluestone":      "blue",
  // confirmed: cornflower blue polo (not purple, despite the flower name)
  "delphinium":     "blue",
  // confirmed: cornflower/powder blue solid quarter-zip
  "heron":          "blue",
  // confirmed: bright royal blue hoodie
  "iona":           "blue",
  // confirmed: cornflower blue polo (prior session)
  "seahorse":       "blue",

  // ── WHITE ─────────────────────────────────────────────────────────────────
  // confirmed: bright white
  "arctic":         "white",

  // ── GREY ──────────────────────────────────────────────────────────────────
  "anthracite":     "grey",
  "stingray":       "grey",
  "riverstone":     "grey",
  "shadow":         "grey",
  // confirmed: dark charcoal zip sweater
  "scareb":         "grey",

  // ── PURPLE ────────────────────────────────────────────────────────────────
  // confirmed: lavender/purple patterned polo (nothing like a sunrise — Greyson uses
  // abstract color names from their seasonal palette, not descriptive names)
  "sunrise":        "purple",

  // ── TEAL ──────────────────────────────────────────────────────────────────
  // confirmed: dark teal/forest green
  "jesper":         "teal",

  // ── GREEN ─────────────────────────────────────────────────────────────────
  // agave = muted teal-green succulent reference; reads green in golf context
  "agave":          "green",

  // ── OLIVE ─────────────────────────────────────────────────────────────────
  // camp = camp/army green
  "camp":           "olive",

  // ── PINK ──────────────────────────────────────────────────────────────────
  "bloom":          "pink",
  "pink sky":       "pink",

  // ── MULTI ─────────────────────────────────────────────────────────────────
  // confirmed: multi-stripe polo (pink/teal/lavender panels)
  "bonneville":     "multi",
  // confirmed: blue/white cloud print hoodie
  "heaven":         "multi",
};
