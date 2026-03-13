import type { AppCategory } from "@/types";

export interface CategoryMapping {
  productTypes?: string[];
  tags?: string[];
  /** When set, product title must contain at least one of these keywords (combined with AND with type/tag match) */
  titleContains?: string[];
}

export interface BrandConfig {
  brandKey: string;
  displayName: string;
  domain: string;
  scraperType: "shopify" | "playwright";
  mensInclusionTags: string[];
  womensExclusionTags: string[];
  colorOptionNames: string[];
  /** "option" (default): color from Shopify variant option. "title": extract color from product title after last " - ". "tag": extract from a product tag with the given colorTagPrefix */
  colorSource?: "option" | "title" | "tag";
  /** When colorSource="tag", the tag prefix to strip (e.g. "color--" → tag "color--navy" → "navy") */
  colorTagPrefix?: string;
  categoryMappings: Partial<Record<AppCategory, CategoryMapping>>;
}

export const BRANDS: BrandConfig[] = [
  {
    brandKey: "bylt",
    displayName: "BYLT",
    // byltbasics.com is headless (Pack CMS); myshopify URL serves the JSON API
    domain: "bylt-apparel.myshopify.com",
    scraperType: "shopify",
    // BYLT embeds gender in product_type (e.g. "Men's-Tops-Short-Sleeves")
    mensInclusionTags: [],
    womensExclusionTags: ["women's"],
    colorOptionNames: ["Color"],
    categoryMappings: {
      // productTypes match BYLT's type strings; type check uses .includes() so "Men's-Tops-Outerwear".includes("Outerwear") works
      zips: { productTypes: ["Men's-Tops-Outerwear", "Mens-Tops-Outerwear"], titleContains: ["zip", "quarter-zip", "half-zip", "full zip"] },
      longsleeve: { productTypes: ["Men's-Top-Long-Sleeves", "Men's-Tops-Long-Sleeves", "Mens-Tops-Long-Sleeves"] },
      shirts: { productTypes: ["Men's-Tops-Short-Sleeves", "Mens-Tops-Short-Sleeves", "Men's-Tops-Polos", "Men's-Tops-Tanks"] },
      hoodies: { productTypes: ["Men's-Tops-Outerwear", "Mens-Tops-Outerwear"], titleContains: ["hoodie", "pullover", "sweatshirt"] },
      sweaters: { productTypes: ["Men's-Tops-Outerwear", "Mens-Tops-Outerwear"], titleContains: ["crew", "crewneck", "sweater", "cardigan"] },
      shorts: { productTypes: ["Men's-Bottoms-Shorts", "Mens-Bottoms-Shorts"] },
      pants: { productTypes: ["Men's-Bottoms-Pants", "Mens-Bottoms-Pants", "Men's-Bottoms-Joggers", "Mens-Bottoms-Joggers"] },
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
    // ASRV embeds color in product title (e.g. "Relaxed Tee - Black"), not as a variant option
    colorSource: "title",
    categoryMappings: {
      // longsleeve must come before shirts in resolution; titleContains restricts to LS products
      longsleeve: { productTypes: ["Shirts", "Long Sleeve"], titleContains: ["long sleeve", "longsleeve"] },
      shirts: { productTypes: ["Shirts", "Short Sleeve", "T-Shirts"], tags: ["short sleeve", "tee", "t-shirt"] },
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
    // buckmason.com is headless; myshopify URL serves the JSON API
    domain: "buck-mason-usa.myshopify.com",
    scraperType: "shopify",
    mensInclusionTags: ["filter-gender:men"],
    womensExclusionTags: ["filter-gender:women"],
    colorOptionNames: ["Color"],
    // BM color is stored in a "color--{name}" product tag (no Color variant option)
    colorSource: "tag",
    colorTagPrefix: "color--",
    categoryMappings: {
      longsleeve: { productTypes: ["Shirts", "Tees"], titleContains: ["long sleeve", "longsleeve"] },
      shirts: { productTypes: ["Shirts", "Tees", "Polos"] },
      hoodies: { productTypes: ["Sweats", "Sweatshirts"], titleContains: ["hoodie", "pullover"] },
      sweaters: { productTypes: ["Sweaters", "Sweats", "Sweatshirts"], titleContains: ["crew", "crewneck", "sweater", "cardigan"] },
      zips: { productTypes: ["Sweaters", "Sweats", "Sweatshirts"], titleContains: ["zip", "quarter-zip", "half zip"] },
      shorts: { productTypes: ["Shorts", "Sweats"], titleContains: ["short"] },
      pants: { productTypes: ["Pants", "Sweats", "Sweatpants"], titleContains: ["pant", "jogger", "sweat"] },
    },
  },
  {
    brandKey: "reigning-champ",
    displayName: "Reigning Champ",
    domain: "reigningchamp.com",
    scraperType: "shopify",
    mensInclusionTags: ["gender:mens"],
    womensExclusionTags: ["gender:womens", "gender:women"],
    colorOptionNames: ["Colour", "Color"],
    // RC uses type="MENS" for everything — categories come from product title only
    categoryMappings: {
      zips: { productTypes: ["MENS"], titleContains: ["zip", "quarter-zip", "half-zip", "1/4 zip", "half zip", "quarter zip"] },
      longsleeve: { productTypes: ["MENS"], titleContains: ["long sleeve", "longsleeve"] },
      shirts: { productTypes: ["MENS"], titleContains: ["t-shirt", "tee", "polo"] },
      hoodies: { productTypes: ["MENS"], titleContains: ["hoodie"] },
      sweaters: { productTypes: ["MENS"], titleContains: ["crewneck", "crew neck", "sweatshirt", "sweater", "pullover"] },
      shorts: { productTypes: ["MENS"], titleContains: ["short"] },
      pants: { productTypes: ["MENS"], titleContains: ["sweatpant", "jogger", "pant", "trouser"] },
    },
  },
  {
    brandKey: "todd-snyder",
    displayName: "Todd Snyder",
    domain: "toddsnyder.com",
    scraperType: "shopify",
    // Todd Snyder is a menswear-only brand — no gender inclusion tags needed
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens"],
    colorOptionNames: ["Color"],
    // Athleisure lives in "TS KNITS" and "Sweater" types — "Shirt" type is formal dress shirts
    categoryMappings: {
      zips: { productTypes: ["TS KNITS", "Sweater"], titleContains: ["zip"] },
      longsleeve: { productTypes: ["TS KNITS"], titleContains: ["long sleeve", "longsleeve"] },
      shirts: { productTypes: ["TS KNITS", "Sweater"], titleContains: ["tee", "t-shirt", "polo"] },
      hoodies: { productTypes: ["TS KNITS"], titleContains: ["hoodie", "sweatshirt"] },
      sweaters: { productTypes: ["TS KNITS", "Sweater"], titleContains: ["crewneck", "crew neck", "sweater", "cardigan"] },
      shorts: { productTypes: ["TS KNITS", "Shorts"], titleContains: ["short"] },
      pants: { productTypes: ["TS KNITS", "Pants"], titleContains: ["jogger", "sweatpant"] },
    },
  },
  {
    brandKey: "rhone",
    displayName: "Rhone",
    // rhone.com is Cloudflare-protected; myshopify URL bypasses it
    domain: "rhone.myshopify.com",
    scraperType: "shopify",
    mensInclusionTags: ["gender:m"],
    womensExclusionTags: ["gender:f"],
    colorOptionNames: ["Color"],
    // "Shirts" type = dress commuter shirts (skip); "Midlayers" = hoodies/zips/anoraks
    categoryMappings: {
      zips: { productTypes: ["Midlayers", "Sweaters"], titleContains: ["zip", "quarter-zip", "half-zip"] },
      longsleeve: { productTypes: ["Tees", "Shirts"], titleContains: ["long sleeve", "longsleeve"] },
      shirts: { productTypes: ["Tees", "Polos"] },
      hoodies: { productTypes: ["Midlayers"], titleContains: ["hoodie", "pullover", "sweatshirt"] },
      sweaters: { productTypes: ["Midlayers", "Sweaters"], titleContains: ["crew", "crewneck", "sweater", "cardigan", "cardi"] },
      shorts: { productTypes: ["Shorts"] },
      pants: { productTypes: ["Pants"] },
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
  {
    brandKey: "lululemon",
    displayName: "Lululemon",
    // Playwright scraper — domain not used for Shopify fetching
    domain: "shop.lululemon.com",
    scraperType: "playwright",
    mensInclusionTags: [],
    womensExclusionTags: [],
    colorOptionNames: [],
    categoryMappings: {},
  },
  {
    brandKey: "vuori",
    displayName: "Vuori",
    // vuoriclothing.com is headless Next.js; myshopify URL serves the JSON API
    domain: "vuori-clothing.myshopify.com",
    scraperType: "shopify",
    mensInclusionTags: ["gender::mens"],
    womensExclusionTags: ["gender::womens"],
    colorOptionNames: ["Color"],
    // Vuori product types: Tops (tees/hoodies/crews/sweaters), Jackets & Hoodies, Shorts, Boardshorts, Pants, Joggers, Sweaters
    categoryMappings: {
      zips: { productTypes: ["Jackets & Hoodies", "Tops"], titleContains: ["zip", "quarter-zip", "half-zip", "full zip"] },
      longsleeve: { productTypes: ["Tops"], titleContains: ["long sleeve", "longsleeve"] },
      shirts: { productTypes: ["Tops", "Tanks"], titleContains: ["tee", "t-shirt", "polo", "short sleeve", "muscle", "v-neck", "tank", "henley"] },
      hoodies: { productTypes: ["Jackets & Hoodies", "Tops"], titleContains: ["hoodie", "pullover"] },
      sweaters: { productTypes: ["Jackets & Hoodies", "Tops", "Sweaters"], titleContains: ["crew", "crewneck", "sweatshirt", "fleece", "sweater", "mock neck"] },
      shorts: { productTypes: ["Shorts", "Boardshorts"] },
      pants: { productTypes: ["Pants", "Joggers"] },
    },
  },
];

export const BRAND_KEYS = BRANDS.map((b) => b.brandKey);

export const BRAND_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  BRANDS.map((b) => [b.brandKey, b.displayName])
);
