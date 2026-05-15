// MODIFIERS: words that qualify a base color without being the color themselves.
//
// Strip strategy — FRONT and BACK of the token array only, never the middle:
//
//   "Heather Navy"          → strip front ("Heather") → "Navy"           → navy ✓
//   "Midnight Blue Heather" → strip back  ("Heather") → "Midnight Blue"  → navy via common.ts ✓
//   "Heather Midnight Blue" → strip front ("Heather") → "Midnight Blue"  → navy via common.ts ✓
//   "Heather Stone Blue"    → strip front ("Heather"), NOT "Stone" (middle) → "Stone Blue" → common.ts ✓
//
// Side effect: any word in this set that also appears as a standalone color name must be
// covered by common.ts or canonical.ts. Examples: "Stone" → beige, "Heather" → grey,
// "Linen" → beige. If a modifier-word appears standalone and has no common.ts entry,
// it will fall to UnknownColor after modifier stripping produces an empty string.

export const MODIFIERS: Set<string> = new Set([
  // Texture / weave descriptors
  "heather", "heathered", "marl", "melange", "twist", "slub", "linen", "texture", "stripe",

  // Wash / treatment descriptors
  "vintage", "washed", "faded", "acid", "bleached", "dip-dye", "tie-dye", "distressed", "aged", "worn",

  // Mineral / material descriptors
  "stone", "mineral",

  // Tone qualifiers — degree or temperature of a color, never the color itself
  "true", "rich", "deep", "dark", "light", "pale", "soft", "muted", "dusty", "warm", "cool", "mid",
]);

// Strips modifier tokens from the front and back of a color string.
// Splitting is on whitespace; hyphenated tokens (e.g., "dip-dye") are treated as a single unit.
// Middle tokens are never removed — only the outermost layer on each side is peeled.
//
// The while loops are iterative: each loop advances one token per iteration and re-checks
// the condition before advancing again. "Charcoal Slub Stripe" → front loop stops at
// "Charcoal" (not a modifier), back loop strips "Stripe" then "Slub", stops at "Charcoal" → "Charcoal".
// Single-pass removal would require two separate strip operations to remove both trailing modifiers.
export function stripModifiers(input: string): string {
  const tokens = input.trim().split(/\s+/);
  let start = 0;
  let end = tokens.length - 1;

  while (start <= end && MODIFIERS.has(tokens[start].toLowerCase())) {
    start++;
  }
  while (end >= start && MODIFIERS.has(tokens[end].toLowerCase())) {
    end--;
  }

  return tokens.slice(start, end + 1).join(" ");
}
