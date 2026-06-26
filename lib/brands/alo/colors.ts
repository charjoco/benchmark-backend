import type { AppColor } from "@/lib/normalize/colors/canonical";

// Alo Yoga brand color dictionary.
//
// Color source: colorSource="option" (Shopify "Color" variant option), with
// title-suffix fallback. Dry run (2026-06-23) confirmed the Color option value
// equals the title suffix for 656/656 men's products.
//
// Most Alo color names resolve via the shared common.ts / canonical.ts dictionaries
// and need NO entry here, e.g.:
//   Espresso → brown, Bone/Ivory → beige, Garnet/Burgundy → burgundy,
//   Camel/Taupe/Chai Latte → tan, Olive Tree/Green Olive → olive,
//   Clover/Stealth Green → green, *Blue names → blue, *Grey names → grey,
//   Heather/Tonal/Wash/Dark/Light modifiers strip to a resolvable base.
//
// This file holds ONLY brand-specific names that either (a) do not resolve at all
// via the shared dicts, or (b) resolve INCORRECTLY and need an override. Every
// entry below is an unambiguous, high-confidence mapping.
//
// Ambiguous proprietary names that cannot be resolved by string alone (Gravel,
// Bluestone, Brownstone, Mushroom, Limestone, Macadamia, Winter Frost, Winter Ivy,
// Desert Sage, etc.) are NOT guessed here — they go to the vision-audit list and,
// once eyeballed, are resolved via the UnknownColor override table (resolver step 0)
// or added here, exactly like the Paige blue-wash audit.

// Vision-audited proprietary names (2026-06-23). These do not resolve via the
// shared common/canonical dicts and were assigned by hand from product imagery.
// Modifier variants (… Wash / Tonal / Heather / Pinstripe) need their OWN keys:
// the resolver checks the brand dict only against the full normalized string
// (step 1), not against the modifier-stripped form, so "gravel wash" would miss a
// bare "gravel" entry. Each audited variant is therefore listed explicitly.
export const ALO_COLORS: Record<string, AppColor> = {
  // ── Unambiguous darks/greys not covered by common/canonical ─────────────────
  "anthracite": "grey",   // coal-grey; standard anthracite = dark grey (image: dark charcoal grey)
  "titanium":   "grey",   // metallic mid-grey (image: brushed silver-grey)

  // ── Override: "charcoal" keyword would misfire to grey ───────────────────────
  // canonical scan hits "charcoal" (grey) before "green"; Alo's Charcoal Green is a
  // dark muted GREEN, not grey. Explicit override; "tonal" variant needs its own key
  // because "tonal" is not a strippable modifier.
  "charcoal green":       "green",
  "charcoal green tonal": "green",

  // ── GREY (audited) ──────────────────────────────────────────────────────────
  "gravel":        "grey",
  "gravel wash":   "grey",
  "winter frost":  "grey",
  "fog":           "grey",
  "smoky quartz":  "grey",

  // ── BLUE (audited) ──────────────────────────────────────────────────────────
  "bluestone":      "blue",
  "bluestone wash": "blue",

  // ── GREEN (audited) ─────────────────────────────────────────────────────────
  "desert sage": "green",
  "winter ivy":  "green",

  // ── BROWN (audited) ─────────────────────────────────────────────────────────
  "brownstone": "brown",

  // ── TAN (audited) ───────────────────────────────────────────────────────────
  "mushroom":         "tan",
  "mushroom heather": "tan",
  "macadamia":        "tan",
  "toasted almond":   "tan",

  // ── BEIGE (audited) ─────────────────────────────────────────────────────────
  "limestone":       "beige",
  "limestone tonal": "beige",
  "bone pinstripe":  "beige",

  // ── PINK / YELLOW (audited) ─────────────────────────────────────────────────
  "woodrose": "pink",
  "sunshine": "yellow",

  // ── MULTI (audited) ─────────────────────────────────────────────────────────
  // Three-tone colorway; the resolver only decomposes 2-part slashes, so this
  // three-way slash needs an explicit brand entry (matched at step 1 before
  // slash decomposition). "multi" is a valid AppColor in the canonical palette.
  "ivory/bone/gravel": "multi",
};
