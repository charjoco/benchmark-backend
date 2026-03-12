import type { AppCategory } from "@/types";
import type { BrandConfig } from "@/lib/config/brands";

// Check zips before hoodies — a zip hoodie should be "zips" not "hoodies"
const PRIORITY_ORDER: AppCategory[] = [
  "zips",
  "shirts",
  "longsleeve",
  "hoodies",
  "sweaters",
  "shorts",
  "pants",
];

export function resolveCategory(
  productType: string,
  tags: string[],
  config: BrandConfig
): AppCategory | null {
  const normalizedType = productType.toLowerCase().trim();
  const normalizedTags = tags.map((t) => t.toLowerCase().trim());

  for (const category of PRIORITY_ORDER) {
    const mapping = config.categoryMappings[category];
    if (!mapping) continue;

    const typeMatch = mapping.productTypes?.some((pt) =>
      normalizedType.includes(pt.toLowerCase())
    );

    const tagMatch = mapping.tags?.some((tag) =>
      normalizedTags.some((t) => t.includes(tag.toLowerCase()))
    );

    if (typeMatch || tagMatch) return category;
  }

  return null;
}

export const CATEGORY_LABELS: Record<AppCategory, string> = {
  shirts: "Shirts",
  longsleeve: "Long Sleeve",
  hoodies: "Hoodies",
  sweaters: "Sweaters",
  zips: "Zip-Ups",
  shorts: "Shorts",
  pants: "Pants",
};

export const ALL_CATEGORIES: AppCategory[] = [
  "shirts",
  "longsleeve",
  "hoodies",
  "sweaters",
  "zips",
  "shorts",
  "pants",
];
