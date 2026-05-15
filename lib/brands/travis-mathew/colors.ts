import type { AppColor } from "@/lib/normalize/colors/canonical";

// TravisMathew brand-specific color overrides.
// Keys are lowercase normalized (matching resolver's normalize() output).
export const TRAVIS_MATHEW_COLORS: Record<string, AppColor> = {

  // ── BLACK ─────────────────────────────────────────────────────────────────
  "total eclipse":  "black",

  // ── WHITE ─────────────────────────────────────────────────────────────────
  // confirmed: off-white/cream hoodie
  "moonbeam":       "white",

  // ── GREY ──────────────────────────────────────────────────────────────────
  // confirmed: light grey shorts
  "sleet":          "grey",
  "quiet shade":    "grey",
  "micro chip":     "grey",

  // ── NAVY ──────────────────────────────────────────────────────────────────
  "mood indigo":    "navy",

  // ── BLUE ──────────────────────────────────────────────────────────────────
  // confirmed: sky blue polo
  "arona":          "blue",
  // confirmed: blue floral boardshorts
  "coronet":        "blue",
  "bering sea":     "blue",
  "pacific coast":  "blue",

  // ── TEAL ──────────────────────────────────────────────────────────────────
  // corrected: image showed teal/mint green polo, not beige as originally spec'd
  "cameo":          "teal",

  // ── BEIGE ─────────────────────────────────────────────────────────────────
  "birch":          "beige",
};
