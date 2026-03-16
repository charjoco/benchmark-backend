import type { AppCategory } from "@/types";
import type { BrandConfig } from "@/lib/config/brands";

// jackets first — "Jackets & Hoodies" type shouldn't be caught by hoodies/sweaters
// longsleeve before shirts — "Long Sleeve Tees" type shouldn't match shirts' "Tees" substring
const PRIORITY_ORDER: AppCategory[] = [
  "jackets",
  "zips",
  "longsleeve",
  "shirts",
  "hoodies",
  "sweaters",
  "shorts",
  "pants",
];

export function resolveCategory(
  productType: string,
  tags: string[],
  config: BrandConfig,
  title = ""
): AppCategory | null {
  // Normalize curly apostrophes (U+2019 → U+0027) for consistent matching (e.g. BYLT's product types)
  const normalizeStr = (s: string) => s.toLowerCase().trim().replace(/\u2019/g, "'");
  const normalizedType = normalizeStr(productType);
  const normalizedTags = tags.map((t) => t.toLowerCase().trim());
  const normalizedTitle = title.toLowerCase();

  for (const category of PRIORITY_ORDER) {
    const mapping = config.categoryMappings[category];
    if (!mapping) continue;

    const typeMatch = mapping.productTypes?.some((pt) =>
      normalizedType.includes(pt.toLowerCase())
    );

    const tagMatch = mapping.tags?.some((tag) =>
      normalizedTags.some((t) => t.includes(tag.toLowerCase()))
    );

    // titleContains acts as a required filter: if defined, the product title must match
    const titleRequired = mapping.titleContains && mapping.titleContains.length > 0;
    const titleOk = !titleRequired ||
      mapping.titleContains!.some((kw) => normalizedTitle.includes(kw.toLowerCase()));

    if ((typeMatch || tagMatch) && titleOk) return category;
  }

  return null;
}

export const CATEGORY_LABELS: Record<AppCategory, string> = {
  jackets: "Jackets & Coats",
  shirts: "Shirts",
  longsleeve: "Long Sleeve",
  hoodies: "Hoodies",
  sweaters: "Sweaters",
  zips: "Zip-Ups",
  shorts: "Shorts",
  pants: "Pants",
};

export const ALL_CATEGORIES: AppCategory[] = [
  "jackets",
  "shirts",
  "longsleeve",
  "hoodies",
  "sweaters",
  "zips",
  "shorts",
  "pants",
];
