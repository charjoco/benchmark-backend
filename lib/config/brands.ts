import type { AppCategory } from "@/types";

export interface CategoryMapping {
  productTypes?: string[];
  tags?: string[];
}

export interface BrandConfig {
  brandKey: string;
  displayName: string;
  domain: string;
  scraperType: "shopify" | "playwright";
  mensInclusionTags: string[];
  womensExclusionTags: string[];
  colorOptionNames: string[];
  categoryMappings: Partial<Record<AppCategory, CategoryMapping>>;
}

export const BRANDS: BrandConfig[] = [
  {
    brandKey: "bylt",
    displayName: "BYLT",
    domain: "byltbasics.com",
    scraperType: "shopify",
    mensInclusionTags: ["mens", "men's", "men"],
    womensExclusionTags: ["womens", "women's", "women"],
    colorOptionNames: ["Color"],
    categoryMappings: {
      shirts: { productTypes: ["T-Shirts", "Tops"], tags: ["short sleeve", "tee", "t-shirt"] },
      longsleeve: { productTypes: ["Long Sleeve"], tags: ["long sleeve", "longsleeve"] },
      hoodies: { productTypes: ["Hoodies", "Sweatshirts"], tags: ["hoodie", "pullover"] },
      sweaters: { productTypes: ["Sweaters"], tags: ["crew", "crewneck", "sweater"] },
      zips: { productTypes: ["Hoodies"], tags: ["zip", "quarter-zip", "full zip"] },
      shorts: { productTypes: ["Shorts"], tags: ["shorts"] },
      pants: { productTypes: ["Joggers", "Pants", "Sweatpants"], tags: ["jogger", "pants", "sweatpants"] },
    },
  },
  {
    brandKey: "asrv",
    displayName: "ASRV",
    domain: "asrv.com",
    scraperType: "shopify",
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens", "women's"],
    colorOptionNames: ["Color", "Colour"],
    categoryMappings: {
      shirts: { productTypes: ["Short Sleeve", "T-Shirts"], tags: ["short sleeve", "tee", "t-shirt"] },
      longsleeve: { productTypes: ["Long Sleeve"], tags: ["long sleeve", "longsleeve"] },
      hoodies: { productTypes: ["Hoodies"], tags: ["hoodie", "pullover"] },
      sweaters: { productTypes: ["Crewnecks", "Sweatshirts"], tags: ["crewneck", "sweatshirt", "crew"] },
      zips: { productTypes: ["Zip Ups"], tags: ["zip", "quarter zip", "full zip", "half zip"] },
      shorts: { productTypes: ["Shorts"] },
      pants: { productTypes: ["Pants", "Joggers"], tags: ["jogger", "sweatpant"] },
    },
  },
  {
    brandKey: "buck-mason",
    displayName: "Buck Mason",
    domain: "buckmason.com",
    scraperType: "shopify",
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens", "women's"],
    colorOptionNames: ["Color"],
    categoryMappings: {
      shirts: { productTypes: ["T-Shirts", "Tees", "Polos"], tags: ["tee", "t-shirt", "short sleeve", "polo"] },
      longsleeve: { productTypes: ["Long Sleeve Tees"], tags: ["long sleeve"] },
      hoodies: { productTypes: ["Sweatshirts"], tags: ["hoodie", "pullover"] },
      sweaters: { productTypes: ["Sweaters", "Sweatshirts"], tags: ["crew", "crewneck", "sweater"] },
      zips: { tags: ["zip", "quarter-zip", "half zip"] },
      shorts: { productTypes: ["Shorts"] },
      pants: { productTypes: ["Pants", "Sweatpants", "Joggers"], tags: ["jogger"] },
    },
  },
  {
    brandKey: "reigning-champ",
    displayName: "Reigning Champ",
    domain: "reigningchamp.com",
    scraperType: "shopify",
    mensInclusionTags: ["mens", "men"],
    womensExclusionTags: ["womens", "women"],
    colorOptionNames: ["Color"],
    categoryMappings: {
      shirts: { productTypes: ["T-Shirts"] },
      longsleeve: { productTypes: ["Long Sleeve T-Shirts", "Long Sleeve"], tags: ["long sleeve"] },
      hoodies: { productTypes: ["Hoodies"], tags: ["hoodie", "pullover"] },
      sweaters: { productTypes: ["Crewnecks"], tags: ["crewneck", "crew neck"] },
      zips: { productTypes: ["Zip Ups", "Quarter Zips", "Half Zips"], tags: ["zip"] },
      shorts: { productTypes: ["Shorts"] },
      pants: { productTypes: ["Sweatpants", "Joggers", "Pants"] },
    },
  },
  {
    brandKey: "todd-snyder",
    displayName: "Todd Snyder",
    domain: "toddsnyder.com",
    scraperType: "shopify",
    mensInclusionTags: ["mens", "men"],
    womensExclusionTags: ["women", "womens"],
    colorOptionNames: ["Color"],
    categoryMappings: {
      shirts: { productTypes: ["T-Shirts", "Tees", "Short Sleeve"], tags: ["t-shirt", "tee", "short sleeve"] },
      longsleeve: { productTypes: ["Long Sleeve"], tags: ["long sleeve", "longsleeve"] },
      hoodies: { productTypes: ["Hoodies"], tags: ["hoodie", "pullover"] },
      sweaters: { productTypes: ["Sweaters", "Sweatshirts"], tags: ["sweater", "crewneck", "sweatshirt"] },
      zips: { tags: ["zip", "quarter zip", "half zip", "full zip"] },
      shorts: { productTypes: ["Shorts"] },
      pants: { productTypes: ["Pants", "Joggers", "Sweatpants"], tags: ["jogger", "trouser"] },
    },
  },
  {
    brandKey: "rhone",
    displayName: "Rhone",
    domain: "rhone.com",
    scraperType: "shopify",
    mensInclusionTags: ["mens", "men"],
    womensExclusionTags: ["women", "womens"],
    colorOptionNames: ["Color"],
    categoryMappings: {
      shirts: { productTypes: ["Short Sleeve", "T-Shirts", "Polos"], tags: ["short sleeve", "t-shirt", "polo"] },
      longsleeve: { productTypes: ["Long Sleeve"], tags: ["long sleeve"] },
      hoodies: { productTypes: ["Hoodies", "Sweatshirts"], tags: ["hoodie", "pullover"] },
      sweaters: { productTypes: ["Sweaters"], tags: ["crewneck", "sweater"] },
      zips: { productTypes: ["Quarter Zips", "Half Zips"], tags: ["zip", "quarter zip", "half zip"] },
      shorts: { productTypes: ["Shorts"] },
      pants: { productTypes: ["Pants", "Joggers"], tags: ["jogger", "pant"] },
    },
  },
  {
    brandKey: "mack-weldon",
    displayName: "Mack Weldon",
    domain: "mackweldon.com",
    scraperType: "shopify",
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens"],
    colorOptionNames: ["Color"],
    categoryMappings: {
      shirts: { productTypes: ["T-Shirts", "Short Sleeve"], tags: ["short sleeve", "t-shirt", "tee"] },
      longsleeve: { productTypes: ["Long Sleeve"], tags: ["long sleeve"] },
      hoodies: { productTypes: ["Hoodies"], tags: ["hoodie", "pullover"] },
      sweaters: { productTypes: ["Sweatshirts", "Sweaters"], tags: ["sweatshirt", "crewneck"] },
      zips: { tags: ["zip", "quarter zip"] },
      shorts: { productTypes: ["Shorts"] },
      pants: { productTypes: ["Pants", "Joggers", "Sweatpants"] },
    },
  },
];

export const BRAND_KEYS = BRANDS.map((b) => b.brandKey);

export const BRAND_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  BRANDS.map((b) => [b.brandKey, b.displayName])
);
