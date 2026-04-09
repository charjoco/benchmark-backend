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
  /** Real website domain for product URLs (when domain is a myshopify URL) */
  websiteDomain?: string;
  scraperType: "shopify" | "playwright";
  mensInclusionTags: string[];
  womensExclusionTags: string[];
  /** Title prefixes that identify women's products (e.g. ASRV uses "W0" for women's line) */
  womensTitlePrefixes?: string[];
  /** When true, product_type must contain "men" (case-insensitive) to be included.
   *  Use for brands like BYLT where all men's products have "Men's-" in the type. */
  requireMensProductType?: boolean;
  colorOptionNames: string[];
  /** "option" (default): color from Shopify variant option. "title": extract color from product title after last " - ". "tag": extract from a product tag with the given colorTagPrefix */
  colorSource?: "option" | "title" | "tag";
  /** When colorSource="tag", the tag prefix to strip (e.g. "color--" → tag "color--navy" → "navy") */
  colorTagPrefix?: string;
  /** Shopify collection handle for new arrivals — scraped first, products force-marked isNew=true */
  newArrivalsHandle?: string;
  /** Shopify collection handle for sale/clearance — used as fallback when compare_at_price isn't set */
  saleHandle?: string;
  /** Shopify collection handle for bestsellers — products in this collection are marked isBestseller=true */
  popularHandle?: string;
  categoryMappings: Partial<Record<AppCategory, CategoryMapping>>;
}

export const BRANDS: BrandConfig[] = [
  {
    brandKey: "bylt",
    displayName: "BYLT",
    // byltbasics.com is headless (Pack CMS); myshopify URL serves the JSON API
    domain: "bylt-apparel.myshopify.com",
    websiteDomain: "byltbasics.com",
    scraperType: "shopify",
    // BYLT embeds gender in product_type (e.g. "Men's-Tops-Short-Sleeves")
    // All men's types start with "Men's-" or "Mens-" — enforce this as a hard rule
    requireMensProductType: true,
    mensInclusionTags: [],
    womensExclusionTags: ["women's"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "mens-new-releases",
    saleHandle: "mens-last-call",
    popularHandle: "best-sellers",
    categoryMappings: {
      // productTypes match BYLT's type strings; type check uses .includes() so "Men's-Tops-Outerwear".includes("Outerwear") works
      jackets: { productTypes: ["Men's-Tops-Outerwear", "Mens-Tops-Outerwear"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "vest", "shell"] },
      zips: { productTypes: ["Men's-Tops-Outerwear", "Mens-Tops-Outerwear"], titleContains: ["zip", "quarter-zip", "half-zip", "full zip"] },
      longsleeve: { productTypes: ["Men's-Top-Long-Sleeves", "Men's-Tops-Long-Sleeves", "Mens-Tops-Long-Sleeves"] },
      polos: { productTypes: ["Men's-Tops-Polos", "Mens-Tops-Polos"] },
      shirts: { productTypes: ["Men's-Tops-Short-Sleeves", "Mens-Tops-Short-Sleeves", "Men's-Tops-Tanks"] },
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
    womensExclusionTags: ["women", "womens", "women's", "female", "gender:female", "gender:w", "gender:women", "WOMENS"],
    // ASRV women's products use "W0XX." title prefix; men's limited use "WN'XX" (not excluded)
    womensTitlePrefixes: ["W0"],
    colorOptionNames: ["Color", "Colour"],
    // ASRV embeds color in product title (e.g. "Relaxed Tee - Black"), not as a variant option
    colorSource: "title",
    newArrivalsHandle: "latest-drops",
    saleHandle: "surplus-sale",
    popularHandle: "bestsellers",
    categoryMappings: {
      // longsleeve must come before shirts in resolution; titleContains restricts to LS products
      jackets: { productTypes: ["Jackets", "Outerwear"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "vest", "shell"] },
      longsleeve: { productTypes: ["Shirts", "Long Sleeve"], titleContains: ["long sleeve", "longsleeve"] },
      polos: { productTypes: ["Polos"], tags: ["polo"] },
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
    websiteDomain: "buckmason.com",
    scraperType: "shopify",
    mensInclusionTags: ["filter-gender:men"],
    womensExclusionTags: ["filter-gender:women"],
    colorOptionNames: ["Color"],
    // BM color is stored in a "color--{name}" product tag (no Color variant option)
    colorSource: "tag",
    colorTagPrefix: "color--",
    newArrivalsHandle: "mens-new-arrivals",
    popularHandle: "best-sellers",
    categoryMappings: {
      jackets: { productTypes: ["Outerwear", "Jackets"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "vest", "shell"] },
      longsleeve: { productTypes: ["Shirts", "Tees"], titleContains: ["long sleeve", "longsleeve"] },
      polos: { productTypes: ["Polos"] },
      shirts: { productTypes: ["Shirts", "Tees"] },
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
    newArrivalsHandle: "mens-latest",
    saleHandle: "mens-sale",
    // RC uses type="MENS" for everything — categories come from product title only
    categoryMappings: {
      jackets: { productTypes: ["MENS"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "vest", "shell"] },
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
    newArrivalsHandle: "new-arrivals",
    // Athleisure lives in "TS KNITS" and "Sweater" types — "Shirt" type is formal dress shirts
    categoryMappings: {
      jackets: { productTypes: ["TS KNITS", "Outerwear", "Jacket", "Coat"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "vest", "shell"] },
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
    // www.rhone.com has Cloudflare bot protection — use myshopify URL for scraping
    domain: "rhone.myshopify.com",
    websiteDomain: "rhone.com",
    scraperType: "shopify",
    // Rhone is a men's-first brand — no gender tag required; exclude women's by title/type
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens", "women's", "gender:f", "all-women"],
    newArrivalsHandle: "mens-new-arrivals",
    saleHandle: "sale",
    popularHandle: "mens-best-sellers",
    colorOptionNames: ["Color"],
    // "Shirts" type = dress commuter shirts (skip); "Midlayers" = hoodies/zips/anoraks
    categoryMappings: {
      jackets: { productTypes: ["Jackets", "Outerwear", "Midlayers"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "vest", "shell"] },
      zips: { productTypes: ["Midlayers", "Sweaters"], titleContains: ["zip", "quarter-zip", "half-zip"] },
      longsleeve: { productTypes: ["Tees", "Shirts"], titleContains: ["long sleeve", "longsleeve"] },
      polos: { productTypes: ["Polos"] },
      shirts: { productTypes: ["Tees"] },
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
    newArrivalsHandle: "new-arrivals",
    saleHandle: "sale",
    popularHandle: "bestsellers",
    categoryMappings: {
      jackets: { productTypes: ["Jackets", "Outerwear"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "vest", "shell"] },
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
    brandKey: "ten-thousand",
    displayName: "Ten Thousand",
    domain: "www.tenthousand.cc",
    scraperType: "shopify",
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "new-arrivals",
    saleHandle: "surplus-sale",
    popularHandle: "best-sellers",
    // product_type uses full names like "Interval Shirt", "Tactical Short" — keywords match via .includes()
    categoryMappings: {
      jackets: { productTypes: ["jacket", "coat", "vest", "shell", "anorak", "windbreaker"] },
      longsleeve: { productTypes: ["long sleeve"] },
      shirts: { productTypes: ["shirt", "tee"] },
      hoodies: { productTypes: ["hoodie"] },
      sweaters: { productTypes: ["crew"] },
      zips: { productTypes: ["zip"] },
      shorts: { productTypes: ["short"] },
      pants: { productTypes: ["pant", "jogger"] },
    },
  },
  {
    brandKey: "public-rec",
    displayName: "Public Rec",
    domain: "www.publicrec.com",
    scraperType: "shopify",
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens", "women's"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "new-arrivals",
    saleHandle: "mens-sale",
    popularHandle: "mens-best-sellers",
    // Color is option1, Size is option2 (e.g. "Cypress / S")
    categoryMappings: {
      jackets: { productTypes: ["Jackets", "Outerwear"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "vest", "shell"] },
      shirts: { productTypes: ["T-Shirts", "Tees", "Polos"] },
      longsleeve: { productTypes: ["T-Shirts", "Tees"], titleContains: ["long sleeve", "longsleeve"] },
      zips: { productTypes: ["Sweatshirts"], titleContains: ["zip", "quarter-zip", "half-zip", "full zip"] },
      hoodies: { productTypes: ["Sweatshirts"], titleContains: ["hoodie", "pullover"] },
      sweaters: { productTypes: ["Sweatshirts"], titleContains: ["crew", "crewneck", "sweatshirt", "fleece", "weekend"] },
      shorts: { productTypes: ["Shorts", ""], titleContains: ["short"] },
      pants: { productTypes: ["Pants", "Joggers"] },
    },
  },
  {
    brandKey: "vuori",
    displayName: "Vuori",
    // vuoriclothing.com is headless Next.js; myshopify URL serves the JSON API
    domain: "vuori-clothing.myshopify.com",
    websiteDomain: "vuoriclothing.com",
    scraperType: "shopify",
    mensInclusionTags: ["gender::mens"],
    womensExclusionTags: ["gender::womens"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "new",
    saleHandle: "sale",
    popularHandle: "bestsellers",
    // Vuori product types: Tops (tees/hoodies/crews/sweaters), Jackets & Hoodies, Shorts, Boardshorts, Pants, Joggers, Sweaters
    categoryMappings: {
      jackets: { productTypes: ["Jackets & Hoodies"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "vest", "shell"] },
      zips: { productTypes: ["Jackets & Hoodies", "Tops"], titleContains: ["zip", "quarter-zip", "half-zip", "full zip"] },
      longsleeve: { productTypes: ["Tops"], titleContains: ["long sleeve", "longsleeve"] },
      shirts: { productTypes: ["Tops", "Tanks"], titleContains: ["tee", "t-shirt", "polo", "short sleeve", "muscle", "v-neck", "tank", "henley"] },
      hoodies: { productTypes: ["Jackets & Hoodies", "Tops"], titleContains: ["hoodie", "pullover"] },
      sweaters: { productTypes: ["Jackets & Hoodies", "Tops", "Sweaters"], titleContains: ["crew", "crewneck", "sweatshirt", "fleece", "sweater", "mock neck"] },
      shorts: { productTypes: ["Shorts", "Boardshorts"] },
      pants: { productTypes: ["Pants", "Joggers"] },
    },
  },
  {
    brandKey: "faherty",
    displayName: "Faherty",
    // fahertybrand.com has Cloudflare bot protection — use myshopify URL for scraping
    domain: "faherty.myshopify.com",
    websiteDomain: "fahertybrand.com",
    scraperType: "shopify",
    // Faherty sells men's and women's — filter by gender:Men tag
    mensInclusionTags: ["gender:men"],
    womensExclusionTags: ["gender:women", "gender:womens", "gender:women's"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "mens-new-arrivals",
    saleHandle: "mens-sale",
    popularHandle: "mens-best-sellers",
    // Product types use "Men's" prefix (e.g. "Men's Outerwear", "Men's Shorts")
    categoryMappings: {
      jackets: { productTypes: ["Men's Outerwear"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "vest", "shell", "cpo"] },
      zips: { productTypes: ["Men's Outerwear", "Men's Knits", "Sweaters"], titleContains: ["zip", "quarter-zip", "half-zip"] },
      longsleeve: { productTypes: ["Men's Shirts", "Men's Button Ups"], titleContains: ["long sleeve", "longsleeve"] },
      polos: { productTypes: ["Men's Shirts", "Men's Polos"], titleContains: ["polo"] },
      shirts: { productTypes: ["Men's Shirts", "Men's Button Ups", "Men's Tees"] },
      hoodies: { productTypes: ["Men's Outerwear", "Men's Knits", "Men's Hoodies & Pullovers"], titleContains: ["hoodie", "pullover"] },
      sweaters: { productTypes: ["Men's Knits", "Men's Sweaters", "Sweaters"], titleContains: ["sweater", "crewneck", "crew", "cardigan", "fleece", "knit"] },
      shorts: { productTypes: ["Men's Shorts"] },
      pants: { productTypes: ["Men's Pants", "Men's Bottoms"], titleContains: ["pant", "jogger", "trouser", "chino"] },
    },
  },
  {
    brandKey: "holderness-bourne",
    displayName: "Holderness & Bourne",
    domain: "holdernessandbourne.com",
    scraperType: "shopify",
    // Men's-only brand — no gender inclusion tags needed; exclude by title/type as safety net
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens", "women's"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "new-arrivals",
    popularHandle: "best-sellers",
    // H&B product types use "Mens" prefix (e.g. "Mens Layering Sweaters")
    categoryMappings: {
      jackets: { productTypes: ["Jacket", "Outerwear", "Vest"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "vest", "shell"] },
      zips: { productTypes: ["Sweater", "Layer", "Pullover"], titleContains: ["zip", "quarter-zip", "half-zip"] },
      longsleeve: { productTypes: ["Shirt", "Top"], titleContains: ["long sleeve", "longsleeve"] },
      shirts: { productTypes: ["Polo", "Shirt", "Top"], titleContains: ["polo", "shirt", "tee", "t-shirt"] },
      hoodies: { productTypes: ["Hoodie", "Pullover", "Layer"], titleContains: ["hoodie", "pullover"] },
      sweaters: { productTypes: ["Sweater", "Layer", "Pullover", "Mens Layering Sweaters"], titleContains: ["sweater", "crewneck", "crew", "cardigan", "fleece"] },
      shorts: { productTypes: ["Short", "Shorts"] },
      pants: { productTypes: ["Pants", "Pant", "Trouser"] },
    },
  },
  {
    brandKey: "linksoul",
    displayName: "Linksoul",
    domain: "linksoul.com",
    scraperType: "shopify",
    // Linksoul is a men's-only brand — all products tagged "men"
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens", "women's"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "new-arrivals",
    saleHandle: "sale",
    popularHandle: "best-sellers",
    // Linksoul product types: Polo, T-Shirt, Layer, Pant, Short, etc.
    categoryMappings: {
      jackets: { productTypes: ["Jacket", "Outerwear", "Vest"], titleContains: ["jacket", "coat", "vest", "windbreaker", "anorak"] },
      zips: { productTypes: ["Layer", "Pullover"], titleContains: ["zip", "quarter-zip", "half-zip"] },
      longsleeve: { productTypes: ["T-Shirt", "Shirt", "Layer"], titleContains: ["long sleeve", "longsleeve"] },
      shirts: { productTypes: ["Polo", "T-Shirt", "Shirt"] },
      hoodies: { productTypes: ["Layer", "Hoodie", "Pullover"], titleContains: ["hoodie", "pullover"] },
      sweaters: { productTypes: ["Layer", "Sweater", "Pullover"], titleContains: ["sweater", "crewneck", "crew", "fleece"] },
      shorts: { productTypes: ["Short", "Shorts"] },
      pants: { productTypes: ["Pant", "Pants", "Trouser"] },
    },
  },
  {
    brandKey: "paka",
    displayName: "Paka",
    domain: "pakaapparel.com",
    scraperType: "shopify",
    // Paka sells both men's and women's — filter by size-guide:mens inclusion tag
    mensInclusionTags: ["size-guide:mens"],
    womensExclusionTags: ["gender:women", "womens", "all-womens", "size-guide:womens"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "mens-new-arrivals",
    popularHandle: "best-sellers",
    // Paka product types use category hierarchy format (e.g. "Clothing > Tops > Sweaters")
    categoryMappings: {
      jackets: { productTypes: ["Jackets", "Outerwear", "Vest"], titleContains: ["jacket", "coat", "vest", "windbreaker"] },
      zips: { productTypes: ["Hoodies", "Fleece"], titleContains: ["zip", "quarter-zip", "half-zip"] },
      longsleeve: { productTypes: ["Tops", "Shirts"], titleContains: ["long sleeve", "longsleeve"] },
      shirts: { productTypes: ["Tops", "T-Shirts", "Polos", "Shirts"] },
      hoodies: { productTypes: ["Hoodies", "Tops"], titleContains: ["hoodie", "pullover"] },
      sweaters: { productTypes: ["Sweaters", "Tops", "Fleece"], titleContains: ["sweater", "crew", "crewneck", "fleece"] },
      shorts: { productTypes: ["Shorts", "Bottoms"], titleContains: ["short"] },
      pants: { productTypes: ["Pants", "Bottoms", "Joggers"], titleContains: ["pant", "jogger", "trouser"] },
    },
  },
  {
    brandKey: "taylor-stitch",
    displayName: "Taylor Stitch",
    domain: "taylorstitch.com",
    scraperType: "shopify",
    // Men's-first brand; each colorway is a separate product entry (no Color option)
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens", "women's"],
    colorOptionNames: [],
    colorSource: "title",
    newArrivalsHandle: "mens-new-arrivals",
    saleHandle: "mens-last-call",
    popularHandle: "mens-best-sellers",
    categoryMappings: {
      jackets: { productTypes: ["Outerwear"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "vest", "shell"] },
      zips: { productTypes: ["Outerwear", "Wovens"], titleContains: ["zip", "quarter-zip", "half-zip"] },
      longsleeve: { productTypes: ["Wovens"], titleContains: ["long sleeve", "longsleeve", "flannel", "chamois"] },
      shirts: { productTypes: ["Wovens"], titleContains: ["shirt", "tee", "polo", "henley"] },
      hoodies: { productTypes: ["Outerwear", "Wovens"], titleContains: ["hoodie", "pullover", "sweatshirt"] },
      sweaters: { productTypes: ["Outerwear", "Wovens"], titleContains: ["sweater", "crew", "crewneck", "cardigan", "knit"] },
      shorts: { productTypes: ["Bottoms"], titleContains: ["short"] },
      pants: { productTypes: ["Bottoms"], titleContains: ["pant", "trouser", "chino", "denim", "jean", "jogger"] },
    },
  },
  {
    brandKey: "travis-mathew",
    displayName: "TravisMathew",
    domain: "travismathew.com",
    scraperType: "shopify",
    // No gender tags — filter by excluding women's product types and scraping mens-specific collections
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens", "women's"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "mens-new-arrivals",
    saleHandle: "mens-sale",
    categoryMappings: {
      jackets: { productTypes: ["Vest"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "vest", "shell"] },
      zips: { productTypes: ["Active Top", "Button-Up"], titleContains: ["zip", "quarter-zip", "half-zip", "full zip"] },
      longsleeve: { productTypes: ["Active Top", "Tee"], titleContains: ["long sleeve", "longsleeve"] },
      polos: { productTypes: ["Polo"] },
      shirts: { productTypes: ["Tee", "Active Top", "Active Tank", "Button-Up"] },
      hoodies: { productTypes: ["Active Top"], titleContains: ["hoodie", "pullover", "sweatshirt"] },
      sweaters: { productTypes: ["Active Top"], titleContains: ["crew", "crewneck", "sweater", "fleece"] },
      shorts: { productTypes: ["Boardshort"], titleContains: ["short"] },
      pants: { productTypes: ["Pant"], titleContains: ["pant", "jogger", "trouser", "chino"] },
    },
  },
  {
    brandKey: "greyson",
    displayName: "Greyson",
    domain: "greysonclothiers.com",
    scraperType: "shopify",
    // Product types contain "mens" prefix (e.g. "mens polos") — men's first brand
    mensInclusionTags: ["men", "mens"],
    womensExclusionTags: ["women", "womens", "women's"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "men-clothing-new-arrivals",
    saleHandle: "mens-sale",
    categoryMappings: {
      jackets: { titleContains: ["jacket", "coat", "vest", "anorak", "windbreaker", "pullover quarter"] },
      zips: { titleContains: ["zip", "quarter-zip", "half-zip", "full zip"] },
      longsleeve: { titleContains: ["long sleeve", "longsleeve", "mock neck"] },
      polos: { productTypes: ["mens polos"], titleContains: ["polo"] },
      shirts: { titleContains: ["tee", "t-shirt", "henley"] },
      hoodies: { titleContains: ["hoodie", "pullover", "sweatshirt"] },
      sweaters: { titleContains: ["crew", "crewneck", "sweater", "cardigan", "fleece"] },
      shorts: { titleContains: ["short"] },
      pants: { titleContains: ["pant", "jogger", "trouser"] },
    },
  },
  {
    brandKey: "johnnie-o",
    displayName: "Johnnie-O",
    domain: "johnnie-o.com",
    scraperType: "shopify",
    // Sells men's, women's, and boys — filter strictly by Gender:Men tag
    mensInclusionTags: ["Gender:Men"],
    womensExclusionTags: ["Gender:Women"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "mens-new-arrivals",
    categoryMappings: {
      jackets: { titleContains: ["jacket", "coat", "vest", "anorak", "windbreaker", "shell"] },
      zips: { titleContains: ["zip", "quarter-zip", "half-zip", "full zip"] },
      longsleeve: { titleContains: ["long sleeve", "longsleeve"] },
      polos: { titleContains: ["polo"] },
      shirts: { titleContains: ["tee", "t-shirt", "shirt", "henley"] },
      hoodies: { titleContains: ["hoodie", "pullover", "sweatshirt"] },
      sweaters: { titleContains: ["crew", "crewneck", "sweater", "cardigan", "fleece"] },
      shorts: { titleContains: ["short"] },
      pants: { titleContains: ["pant", "jogger", "trouser", "chino"] },
    },
  },
];

export const BRAND_KEYS = BRANDS.map((b) => b.brandKey);

export const BRAND_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  BRANDS.map((b) => [b.brandKey, b.displayName])
);
