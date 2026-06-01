// Holderness & Bourne brand-specific color name → AppColor mapping.
//
// Resolution order context: this runs at step 1 (before common.ts and keyword scan).
// Keys are lowercase normalized (matching resolver's normalize() output).
// Only names that cannot be resolved by common.ts or the canonical keyword scan need entries.
//
// H&B is a golf-lifestyle brand. Color names are drawn from New England prep school towns,
// coastal geography, and the sport of golf. Many appear unexpected from the name alone:
//   Belmont → pink  (not a sandy New England town color — it's a signature hot-pink polo color)
//   Harbor  → teal  (not grey-blue; H&B's Harbor is a vivid teal/aqua)
//   Andover → blue  (slate/denim blue, not the school's crimson)
//   Tudor   → purple (lavender, not the red-brick architectural reference)
//
// Image-verified entries (2026-06-01):
//   Belmont:    confirmed hot-pink polo ✓
//   Harbor:     confirmed vivid teal/aqua polo ✓
//   Andover:    confirmed slate/denim blue vest ✓
//   Tudor:      confirmed lavender/lilac polo ✓
//   Fescue:     confirmed warm khaki pant ✓
//   Nectarine:  confirmed pale blush/peach polo ✓
//   Ivy:        confirmed dark charcoal-green polo ✓
//   Atlantic:   confirmed rich royal/cobalt blue crewneck ✓
//   Bedford:    confirmed light sky-blue houndstooth polo ✓
//   Russet:     confirmed terracotta/brick-orange polo ✓
//   Liberty:    confirmed vivid red pullover (U.S. Open Jackson) ✓
//   California Spruce: confirmed muted teal-green shorts ✓
//   Heathered Abaco:   confirmed mint seafoam crewneck sweater ✓
//   Heathered Skye:    confirmed baby/sky-blue crewneck sweater ✓
//   Heathered North Sea: confirmed heathered mid-blue crewneck sweater ✓
//   Heathered Amherst: confirmed rich grape-purple quarter-zip ✓
//
// Auto-resolving colors (no entry needed — verified by resolver path):
//   Navy, White, Black, Gray/Grey → keyword scan ✓
//   Maidstone Blue, Vista Blue, Horizon Blue, Pacific Blue → "blue" keyword ✓
//   Heathered Maidstone/Vista/Horizon Blue → strip "heathered" → keyword ✓
//   Heathered Navy/Gray/Dark Navy → strip modifiers → keyword ✓
//   Dune, Heathered Dune, Heathered Light Dune → strip modifiers → "dune" → common.ts → beige ✓
//   Charcoal, Heathered Charcoal → common.ts → grey ✓
//   Cabernet, Heathered Cabernet → common.ts → burgundy ✓
//   Heathered Lavender → strip "heathered" → "lavender" → common.ts → purple ✓
//   Heathered Chestnut → strip "heathered" → "chestnut" → common.ts → brown ✓
//   Liberty Red, Heathered Liberty Red → "red" keyword ✓
//   Faded Mauve → strip "faded" → "mauve" → common.ts → pink ✓
//   Cascade Green → "green" keyword ✓
//   Iron Gray → "gray" keyword ✓ (Iron not in MODIFIERS, keyword scan matches "gray")
//
// "&" two-tone colors resolve via Step 3b (" & " decomposition) using these base entries:
//   "Harbor & Maidstone Blue" → Harbor(teal) + Maidstone Blue(blue) → multi ✓
//   "Belmont & Horizon Blue" → Belmont(pink) + Horizon Blue(blue) → multi ✓
//   "Tudor & White" → Tudor(purple) + White(white) → multi ✓
//   etc.

import type { AppColor } from "@/lib/normalize/colors/canonical";

export const HB_COLORS: Record<string, AppColor> = {

  // ── PINK ──────────────────────────────────────────────────────────────────
  "belmont":            "pink",   // confirmed: hot-pink polo ✓
  "heathered belmont":  "pink",   // heathered variant — strip "heathered" → "belmont" → needs explicit
  "nectarine":          "pink",   // confirmed: pale blush/peach polo ✓
  "heathered nectarine":"pink",   // heathered variant

  // ── TEAL ──────────────────────────────────────────────────────────────────
  "harbor":             "teal",   // confirmed: vivid teal/aqua polo ✓
  "heathered harbor":   "teal",   // heathered variant
  "california spruce":  "teal",   // confirmed: muted teal-green shorts ✓
  "heathered abaco":    "teal",   // confirmed: mint seafoam crewneck sweater ✓

  // ── BLUE ──────────────────────────────────────────────────────────────────
  "andover":            "blue",   // confirmed: slate/denim blue vest ✓
  "heathered andover":  "blue",   // heathered variant
  "atlantic":           "blue",   // confirmed: rich royal/cobalt blue crewneck ✓
  "heathered atlantic": "blue",   // heathered variant
  "bedford":            "blue",   // confirmed: light sky-blue houndstooth polo ✓
  "heathered bedford":  "blue",   // heathered variant
  "heathered skye":     "blue",   // confirmed: baby/sky-blue crewneck ✓
  "heathered north sea":"blue",   // confirmed: heathered mid-blue crewneck ✓

  // ── PURPLE ────────────────────────────────────────────────────────────────
  "tudor":              "purple", // confirmed: lavender/lilac polo ✓
  "heathered amherst":  "purple", // confirmed: rich grape-purple quarter-zip ✓

  // ── GREEN ─────────────────────────────────────────────────────────────────
  "ivy":                "green",  // confirmed: dark charcoal-green polo ✓
  "heathered ivy":      "green",  // heathered variant

  // ── ORANGE ────────────────────────────────────────────────────────────────
  "russet":             "orange", // confirmed: terracotta/brick-orange polo ✓
  "heathered russet":   "orange", // heathered variant

  // ── TAN ───────────────────────────────────────────────────────────────────
  "fescue":             "tan",    // confirmed: warm khaki pant ✓

  // ── RED ───────────────────────────────────────────────────────────────────
  "liberty":            "red",    // confirmed: vivid red pullover ✓
  // Note: "liberty red" and "heathered liberty red" auto-resolve via "red" keyword — no entry needed
};
