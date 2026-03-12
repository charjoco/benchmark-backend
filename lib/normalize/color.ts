import type { ColorBucket } from "@/types";

// Priority-ordered: first match wins. Order matters!
// Navy must come before Grey (navy heather → Navy, not Grey)
const COLOR_RULES: Array<{ keywords: string[]; bucket: ColorBucket }> = [
  {
    keywords: [
      "black", "onyx", "obsidian", "graphite", "ink", "jet", "caviar",
      "ebony", "carbon", "iron", "shadow", "nightfall", "midnight black",
    ],
    bucket: "Black",
  },
  {
    keywords: [
      "white", "ivory", "cream", "bone", "ecru", "snow", "chalk",
      "off-white", "natural", "bright white", "optic", "eggshell",
    ],
    bucket: "White",
  },
  {
    keywords: [
      "navy", "dark blue", "marine", "nautical",
    ],
    bucket: "Navy",
  },
  {
    keywords: [
      "grey", "gray", "heather", "ash", "smoke", "silver", "slate",
      "fog", "cement", "stone", "pebble", "flint", "charcoal", "pewter",
      "cloud", "birch", "oatmeal",
    ],
    bucket: "Grey",
  },
  {
    keywords: [
      "blue", "cobalt", "azure", "sapphire", "ocean", "sky", "teal",
      "coastal", "lagoon", "cerulean", "indigo", "denim", "chambray",
      "electric blue", "royal blue", "cornflower", "airforce",
    ],
    bucket: "Blue",
  },
  {
    keywords: [
      "green", "olive", "sage", "forest", "army", "moss", "hunter",
      "camo", "camouflage", "pine", "botanical", "eucalyptus", "cypress",
      "fern", "basil", "seaweed", "kelp", "reed", "juniper",
    ],
    bucket: "Green",
  },
  {
    keywords: [
      "brown", "tan", "camel", "sand", "khaki", "taupe", "mocha",
      "coffee", "espresso", "caramel", "walnut", "chestnut", "driftwood",
      "bark", "timber", "hazel", "oak", "acorn", "cognac",
    ],
    bucket: "Brown",
  },
  {
    keywords: [
      "red", "burgundy", "maroon", "wine", "crimson", "scarlet",
      "cherry", "merlot", "garnet", "brick", "ruby",
    ],
    bucket: "Red",
  },
  {
    keywords: [
      "orange", "peach", "apricot", "amber", "clay", "copper",
      "sunset", "terra cotta", "burnt orange", "rust",
    ],
    bucket: "Orange",
  },
  {
    keywords: [
      "yellow", "gold", "mustard", "lemon", "butter", "wheat",
      "straw", "saffron", "chartreuse",
    ],
    bucket: "Yellow",
  },
  {
    keywords: [
      "purple", "violet", "plum", "lavender", "eggplant", "mauve",
      "mulberry", "grape", "lilac", "amethyst",
    ],
    bucket: "Purple",
  },
  {
    keywords: [
      "pink", "rose", "blush", "salmon", "coral", "magenta",
      "fuchsia", "flamingo", "carnation", "dusty pink",
    ],
    bucket: "Pink",
  },
  {
    keywords: [
      "stripe", "stripes", "camo", "camouflage", "print", "printed",
      "pattern", "multi", "tie dye", "tie-dye", "plaid", "check",
    ],
    bucket: "Multi",
  },
];

export function extractColorBucket(rawColorName: string): ColorBucket {
  const normalized = rawColorName.toLowerCase().trim();

  for (const rule of COLOR_RULES) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        return rule.bucket;
      }
    }
  }

  return "Other";
}

export function logUnmappedColor(brand: string, colorName: string): void {
  if (extractColorBucket(colorName) === "Other") {
    console.warn(`[COLOR] Unmapped: ${brand} -> "${colorName}"`);
  }
}

// Map ColorBucket to a display hex color for UI swatches
export const COLOR_BUCKET_HEX: Record<ColorBucket, string> = {
  Black: "#1a1a1a",
  White: "#f5f5f5",
  Grey: "#9ca3af",
  Navy: "#1e3a5f",
  Blue: "#3b82f6",
  Green: "#4d7c0f",
  Brown: "#92400e",
  Red: "#dc2626",
  Orange: "#ea580c",
  Yellow: "#ca8a04",
  Purple: "#7c3aed",
  Pink: "#ec4899",
  Multi: "linear-gradient(135deg, #f00 0%, #0f0 50%, #00f 100%)",
  Other: "#6b7280",
};
