import type { AppColor } from "@/lib/normalize/colors/canonical";

// DUER brand color dictionary — jeans-only catalog, all colorways image-verified 2026-06-04.
//
// Color source: colorSource="tag-or-title", colorTagPrefix="color_"
// Tags use mixed-case values (e.g. "color_Heritage Rinse", "color_zephyr");
// the scraper normalizes to Title Case before passing to the resolver.
//
// All 8 color names require explicit entries — none resolve via canonical keyword scan.
//
// Color taxonomy:
//   Dark indigo washes → navy:  Heritage Rinse, Rinse, Galactic
//   Medium/light washes → blue: Undertow, Outback, Breeze
//   Grey washed denim  → grey:  Vortex
//   Black              → black: auto-resolves via canonical; explicit for step-1 speed

export const DUER_COLORS: Record<string, AppColor> = {

  // ── DARK INDIGO WASHES → navy ──────────────────────────────────────────────
  // "heritage" is not in the modifier set, so stripModifiers("heritage rinse") → unchanged.
  // Neither token matches a canonical keyword → would fall to UnknownColor without this entry.
  "heritage rinse":   "navy",   // dark raw-indigo wash (image: deep navy-blue denim)
  "rinse":            "navy",   // classic raw/dark indigo rinse (image: near-black indigo)
  "galactic":         "navy",   // deepest dark wash in the DUER lineup (image: dark navy)

  // ── MEDIUM / LIGHT WASHES → blue ──────────────────────────────────────────
  "undertow":         "blue",   // medium blue wash (image: classic medium-blue denim)
  "outback":          "blue",   // faded medium blue (image: worn-in medium blue — name evokes terrain, not color)
  "breeze":           "blue",   // very light blue wash (image: pale/ice-blue denim)

  // ── GREY WASHED DENIM → grey ──────────────────────────────────────────────
  "vortex":           "grey",   // washed charcoal-grey denim (image: distinct grey tone)

  // ── NEUTRALS ──────────────────────────────────────────────────────────────
  "black":            "black",  // auto-resolves via canonical keyword; explicit for step-1 speed
};
