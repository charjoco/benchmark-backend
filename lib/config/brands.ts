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
  mensInclusionTags: string[];
  womensExclusionTags: string[];
  /** Title prefixes that identify women's products (e.g. ASRV uses "W0" for women's line) */
  womensTitlePrefixes?: string[];
  /** When true, product_type must contain "men" (case-insensitive) to be included.
   *  Use for brands like BYLT where all men's products have "Men's-" in the type. */
  requireMensProductType?: boolean;
  colorOptionNames: string[];
  /** "option" (default): color from Shopify variant option. "title": extract color from product title after last separator. "tag": extract from a product tag with the given colorTagPrefix. "tag-or-title": try colorTagPrefix tag first, fall back to title suffix — for brands whose catalog has color_ tags on most products but some products lack them. */
  colorSource?: "option" | "title" | "tag" | "tag-or-title";
  /** When colorSource="title" or "tag-or-title", the separator used to split color from product name. Defaults to " - ". Taylor Stitch uses " in ". */
  colorTitleSeparator?: string;
  /** When colorSource="tag" or "tag-or-title", the tag prefix to strip (e.g. "color--" → tag "color--navy" → "navy") */
  colorTagPrefix?: string;
  /** Shopify collection handle for new arrivals — scraped first, products force-marked isNew=true */
  newArrivalsHandle?: string;
  /** Shopify collection handle for sale/clearance — used as fallback when compare_at_price isn't set */
  saleHandle?: string;
  /** Shopify collection handle for bestsellers — products in this collection are marked isBestseller=true */
  popularHandle?: string;
  /** Shopify collection handle for licensed sports products — products in this collection are excluded from ingestion.
   *  Supports a PGA carve-out: products whose handle contains pga/ryder-cup/usopen/etc. are preserved even if
   *  they appear in the licensed collection. */
  licensedSportsHandle?: string;
  /** Additional licensed college/pro collection handles to exclude (union with licensedSportsHandle).
   *  Use for brands whose licensing lives in a collection rather than product_type — e.g. TravisMathew's
   *  "collegiate-collection". Same PGA carve-out applies. */
  licensedCollectionHandles?: string[];
  /** Regex (as strings) matched against the brand's /collections.json handles at scrape time; every
   *  matching collection is treated as licensed and excluded. Use when licensing spans many patterned
   *  handles rather than a fixed few — e.g. greyson's ~30 `nfl-<team>-apparel-collection`. Union with
   *  licensedCollectionHandles/licensedSportsHandle; same PGA carve-out. */
  licensedCollectionPatterns?: string[];
  /** When set, only products whose Shopify ID appears in this collection are processed.
   *  Replaces isMensProduct() for this brand — the collection is the sole gender filter.
   *  Use for brands with no gender tags whose /products.json mixes men's, women's, and youth. */
  mensCollectionHandle?: string;
  /** DETERMINISTIC EXCLUSION gate: men's = flat catalog MINUS the union of these collections'
   *  product IDs. Use when the brand has no gender field but exposes working women's/youth
   *  collection endpoints (and its men's collection endpoint is broken/absent). Takes precedence
   *  over mensCollectionHandle and isMensProduct(). If any listed collection returns 0/non-200,
   *  the scrape is SKIPPED (stale data beats leaked data) — see shopify.ts. */
  excludeCollectionHandles?: string[];
  /** Which image position to use as the primary product image. Defaults to 0.
   *  Set when a brand puts flat-lays or close-crops first and model shots at a later index.
   *  Falls back to images[0] if the preferred index doesn't exist for a given product. */
  preferredImageIndex?: number;
  /** Number of products per page when fetching /products.json. Defaults to 250 (Shopify max).
   *  Set lower for brands whose Shopify complexity score exceeds the 500 threshold at 250.
   *  Mack Weldon: limit=250 → HTTP 500 (complexity); limit=100 → 200. */
  productsPageSize?: number;
  categoryMappings: Partial<Record<AppCategory, CategoryMapping>>;
}

export const BRANDS: BrandConfig[] = [
  {
    brandKey: "bylt",
    displayName: "BYLT",
    // byltbasics.com is headless (Pack CMS); myshopify URL serves the JSON API
    domain: "bylt-apparel.myshopify.com",
    websiteDomain: "byltbasics.com",
  
    // BYLT embeds gender in product_type (e.g. "Men's-Tops-Short-Sleeves")
    // All men's types start with "Men's-" or "Mens-" — enforce this as a hard rule
    requireMensProductType: true,
    mensInclusionTags: [],
    womensExclusionTags: ["women's"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "mens-new-releases",
    saleHandle: "mens-last-call",
    popularHandle: "best-sellers",
    categoryMappings: {}, // Categorization owned by lib/brands/bylt/categories.ts
  },
  {
    brandKey: "asrv",
    displayName: "ASRV",
    domain: "asrv.com",
    preferredImageIndex: 1,

    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens", "women's", "female", "gender:female", "gender:w", "gender:women", "WOMENS"],
    // ASRV women's products use "W0XX." or "WN'XX" title prefix (e.g. WN'22, WN'21)
    womensTitlePrefixes: ["W0", "WN"],
    colorOptionNames: ["Color", "Colour"],
    // ASRV embeds color in product title (e.g. "Relaxed Tee - Black"), not as a variant option
    colorSource: "title",
    newArrivalsHandle: "latest-drops",
    saleHandle: "surplus-sale",
    popularHandle: "bestsellers",
    categoryMappings: {}, // ASRV categorization is owned by lib/brands/asrv/categories.ts
  },
  {
    brandKey: "buck-mason",
    displayName: "Buck Mason",
    // buckmason.com is headless; myshopify URL serves the JSON API
    domain: "buck-mason-usa.myshopify.com",
    websiteDomain: "buckmason.com",
    preferredImageIndex: 1,

    mensInclusionTags: ["filter-gender:men"],
    womensExclusionTags: ["filter-gender:women"],
    colorOptionNames: ["Color"],
    // BM color is stored in a "color--{name}" product tag (no Color variant option)
    colorSource: "tag",
    colorTagPrefix: "color--",
    newArrivalsHandle: "mens-new-arrivals",
    popularHandle: "best-sellers",
    // Category dispatch owned by lib/brands/buck-mason/categories.ts
    categoryMappings: {},
  },
  {
    brandKey: "reigning-champ",
    displayName: "Reigning Champ",
    domain: "reigningchamp.com",
    preferredImageIndex: 1,

    mensInclusionTags: ["gender:mens"],
    womensExclusionTags: ["gender:womens", "gender:women"],
    colorOptionNames: ["Colour", "Color"],
    newArrivalsHandle: "mens-latest",
    saleHandle: "mens-sale",
    // RC uses type="MENS" for everything — categories come from product title only
    categoryMappings: {
      jackets: { productTypes: ["MENS"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "shell"] },
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
    preferredImageIndex: 1,

    // Todd Snyder is a menswear-only brand — no gender inclusion tags needed
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "new-arrivals",
    // Athleisure lives in "TS KNITS" and "Sweater" types — "Shirt" type is formal dress shirts
    categoryMappings: {
      jackets: { productTypes: ["TS KNITS", "Outerwear", "Jacket", "Coat"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "shell"] },
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
  
    // Rhone is a men's-first brand — no gender tag required; exclude women's by title/type
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens", "women's", "gender:f", "all-women"],
    newArrivalsHandle: "mens-new-arrivals",
    saleHandle: "sale",
    popularHandle: "mens-best-sellers",
    colorOptionNames: ["Color"],
    // Categorization owned by lib/brands/rhone/categories.ts.
    // "Shirts" = Commuter/Brezza/State of Mind woven button-downs → shirts category.
    // "Tees/Tanks" dispatches by title (sleeveless → exclude, LS → longsleeve, else → shirts).
    // "Midlayers" dispatches by title (jacket/anorak → jackets, zip → zips, hoodie → hoodies, else → sweaters).
    // "Blazers/Jackets" excluded per editorial decision 2026-05-21.
    categoryMappings: {},
  },
  {
    brandKey: "mack-weldon",
    displayName: "Mack Weldon",
    domain: "mackweldon.com",
    preferredImageIndex: 2,
    // limit=250 → HTTP 500 (Shopify complexity threshold exceeded); limit=100 → 200
    productsPageSize: 100,

    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "new-arrivals",
    saleHandle: "sale",
    popularHandle: "bestsellers",
    categoryMappings: {}, // Categorization owned by lib/brands/mack-weldon/categories.ts
  },
  {
    brandKey: "ten-thousand",
    displayName: "Ten Thousand",
    domain: "www.tenthousand.cc",
  
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "new-arrivals",
    saleHandle: "surplus-sale",
    popularHandle: "best-sellers",
    categoryMappings: {}, // Categorization owned by lib/brands/ten-thousand/categories.ts
  },
  {
    brandKey: "vuori",
    displayName: "Vuori",
    // vuoriclothing.com is headless Next.js; myshopify URL serves the JSON API
    domain: "vuori-clothing.myshopify.com",
    websiteDomain: "vuoriclothing.com",
  
    mensInclusionTags: ["gender::mens"],
    womensExclusionTags: ["gender::womens"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "new",
    saleHandle: "sale",
    popularHandle: "bestsellers",
    // Categorization owned by lib/brands/vuori/categories.ts.
    // "Tops" dispatches by title (hoodies/zips/polos/longsleeve/shirts); sleeveless excluded upstream.
    // "Jackets & Hoodies" dispatches by title (jackets/zips/hoodies/sweaters).
    // "Button Down" dispatches by sleeve (longsleeve/shirts).
    // "Boardshorts" → shorts per editorial decision 2026-05-21.
    categoryMappings: {},
  },
  {
    brandKey: "faherty",
    displayName: "Faherty",
    // fahertybrand.com has Cloudflare bot protection — use myshopify URL for scraping
    domain: "faherty.myshopify.com",
    websiteDomain: "fahertybrand.com",
  
    // Faherty sells men's and women's — filter by gender:Men tag
    mensInclusionTags: ["gender:men"],
    womensExclusionTags: ["gender:women", "gender:womens", "gender:women's"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "mens-new-arrivals",
    saleHandle: "mens-sale",
    popularHandle: "mens-best-sellers",
    // Licensed college gear lives in collections (confirmed 2026-07-14).
    licensedCollectionHandles: ["faherty-collegiate-tailgate-collection", "faherty-x-college-of-charleston-collection"],
    // Product types use "Men's" prefix (e.g. "Men's Outerwear", "Men's Shorts")
    categoryMappings: {
      jackets: { productTypes: ["Men's Outerwear"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "shell", "cpo"] },
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
    preferredImageIndex: 1,

    // Men's-only brand — no gender inclusion tags needed; exclude by title/type as safety net
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens", "women's"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "new-arrivals",
    popularHandle: "best-sellers",
    // H&B product types use "Mens" prefix (e.g. "Mens Layering Sweaters")
    // TODO: Holderness & Bourne has a dedicated Vest product type — candidate for per-brand mapping file (see lib/brands/greyson/ pattern)
    categoryMappings: {
      jackets: { productTypes: ["Jacket", "Outerwear"], titleContains: ["jacket", "coat", "anorak", "windbreaker", "parka", "bomber", "shell"] },
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
    preferredImageIndex: 1,

    // Linksoul is a men's-only brand — all products tagged "men"
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens", "women's"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "new-arrivals",
    saleHandle: "sale",
    popularHandle: "best-sellers",
    // Linksoul product types: Polo, T-Shirt, Layer, Pant, Short, etc.
    // TODO: Linksoul has a dedicated Vest product type — candidate for per-brand mapping file (see lib/brands/greyson/ pattern)
    categoryMappings: {
      jackets: { productTypes: ["Jacket", "Outerwear"], titleContains: ["jacket", "coat", "windbreaker", "anorak"] },
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
  
    // Paka sells both men's and women's — filter by size-guide:mens inclusion tag
    mensInclusionTags: ["size-guide:mens"],
    womensExclusionTags: ["gender:women", "womens", "all-womens", "size-guide:womens"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "mens-new-arrivals",
    popularHandle: "best-sellers",
    // Paka product types use category hierarchy format (e.g. "Clothing > Tops > Sweaters")
    // TODO: Paka has a dedicated Vest product type — candidate for per-brand mapping file (see lib/brands/greyson/ pattern)
    categoryMappings: {
      jackets: { productTypes: ["Jackets", "Outerwear"], titleContains: ["jacket", "coat", "windbreaker"] },
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
  
    // Men's-first brand; each colorway is a separate product entry (no Color option)
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens", "women's"],
    colorOptionNames: [],
    colorSource: "title",
    colorTitleSeparator: " in ",
    newArrivalsHandle: "mens-new-arrivals",
    saleHandle: "mens-last-call",
    popularHandle: "mens-best-sellers",
    categoryMappings: {}, // Taylor Stitch categorization is owned by lib/brands/taylor-stitch/categories.ts
  },
  {
    brandKey: "travis-mathew",
    displayName: "TravisMathew",
    domain: "travismathew.com",

    // No gender tags in their catalog. /collections/mens/products.json is DEAD (HTTP 500,
    // confirmed 2026-07-03 and re-confirmed 2026-07-08) — so it is intentionally NOT used for
    // inclusion. Instead we gate deterministically by EXCLUSION: the site's own women's and youth
    // collection endpoints work — /collections/women/products.json (281) and
    // /collections/boys/products.json (72) both return 200 — so men's = flat catalog − those IDs.
    // Validated 2026-07-08: /collections/women covers 100% of the independent 2XS women's signal
    // (233/233) incl. both screenshot products, with 0 men's false positives. This supersedes the
    // dd7055d youth-title / women's-product_type heuristics for this brand. (Collection endpoints
    // break independently — women/boys are up while mens is down; the gate self-guards, see
    // shopify.ts skip-and-warn.)
    excludeCollectionHandles: ["women", "boys"],
    // College licensing lives in a collection (not product_type) — validated 2026-07-09:
    // travismathew.com/collections/collegiate-collection = 154 products (USC/LSU/Alabama/UCLA/etc.).
    // (Previously misfiled under johnnie-o, so TM never excluded it and ~96 licensed items leaked.)
    licensedCollectionHandles: ["collegiate-collection"],
    mensInclusionTags: [],
    womensExclusionTags: ["women", "womens", "women's", "dress", "romper", "skort", "jumpsuit"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "mens-new-arrivals",
    saleHandle: "mens-sale",
    categoryMappings: {}, // TravisMathew categorization is owned by lib/brands/travis-mathew/categories.ts
  },
  // Per-brand normalization config: see lib/brands/greyson/
  {
    brandKey: "greyson",
    displayName: "Greyson",
    domain: "greysonclothiers.com",
  
    // Product types contain "mens" prefix (e.g. "mens polos") — men's first brand
    mensInclusionTags: ["men", "mens"],
    womensExclusionTags: ["women", "womens", "women's"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "men-clothing-new-arrivals",
    saleHandle: "mens-sale",
    // Licensed NFL/MLB gear lives in ~30 patterned collections (nfl-<team>-apparel-collection,
    // mlb-*, greyson-for-the-mlb) — confirmed 2026-07-14. Pattern-matched vs enumerated so new
    // team collections are caught automatically (fail closed as NFL season rosters change).
    licensedCollectionPatterns: ["^nfl-.*-apparel-collection$", "^mlb-", "^greyson-for-the-mlb$"],
    categoryMappings: {}, // Greyson categorization is owned by lib/brands/greyson/categories.ts
  },
  {
    brandKey: "johnnie-o",
    displayName: "Johnnie-O",
    domain: "johnnie-o.com",

    // Sells men's, women's, and boys — filter strictly by Gender:Men tag
    mensInclusionTags: ["Gender:Men"],
    womensExclusionTags: ["Gender:Women"],
    colorOptionNames: ["Color"],
    newArrivalsHandle: "mens-new-arrivals",
    licensedSportsHandle: "game-day",
    categoryMappings: {}, // Johnnie-O categorization is owned by lib/brands/johnnie-o/categories.ts
  },
  {
    brandKey: "mott-and-bow",
    displayName: "Mott & Bow",
    domain: "mottandbow.com",

    // Gender is encoded in product_type ("Mens-jeans" vs "Womens-jeans" etc.).
    // The jeans-only rule in categories.ts accepts only "Mens-jeans" and rejects
    // everything else, so no separate gender tag filter is needed.
    mensInclusionTags: [],
    womensExclusionTags: [],

    colorOptionNames: ["Color"],
    productsPageSize: 250,

    // No collection-based new-arrivals or sale handle: the only non-empty collection
    // found was "mens-jeans" (the full jeans catalog), which would flag every jean as
    // new. New drops are detected via per-colorway firstSeenAt; sale via price comparison.
    newArrivalsHandle: undefined,
    saleHandle: undefined,
    popularHandle: undefined,

    categoryMappings: {}, // Categorization owned by lib/brands/mott-and-bow/categories.ts
  },
  {
    brandKey: "duer",
    displayName: "DUER",
    domain: "shopduer.com",

    // DUER has no Color variant option — color lives in color_* product tags (preferred)
    // falling back to the title suffix (last " - " segment). Each colorway is a separate product.
    mensInclusionTags: ["gender_mens"],
    womensExclusionTags: ["gender_womens"],
    colorOptionNames: [],
    colorSource: "tag-or-title",
    colorTagPrefix: "color_",

    newArrivalsHandle: "new-arrivals",
    // No usable sale collection — price-drop fallback handles sale detection instead.
    saleHandle: undefined,
    popularHandle: "best-sellers",

    // limit=250 is Shopify max and works fine for DUER's catalog size (~491 products).
    productsPageSize: 250,

    categoryMappings: {}, // Categorization owned by lib/brands/duer/categories.ts
  },
  {
    brandKey: "paige",
    displayName: "Paige",
    // paige.com is behind Vercel bot protection (429); paige.myshopify.com is 401.
    // shop.paige.com is the accessible Shopify JSON endpoint.
    domain: "shop.paige.com",

    // Gender encoded as brand:Mens / brand:Womens tag (capital M/W; scraper normalizes to lowercase).
    // brand:Petites is women's petite line — excluded by inclusion filter (not brand:mens).
    mensInclusionTags: ["brand:mens"],
    womensExclusionTags: ["brand:womens", "brand:petites"],

    // No Color variant option — color lives in the product title after " - " (default separator).
    // Each (style × inseam × color) combination is a separate Shopify product.
    colorOptionNames: [],
    colorSource: "title",

    newArrivalsHandle: "men-new-arrivals",
    saleHandle: "men-sale",
    // No usable bestsellers collection found; omit.
    popularHandle: undefined,

    categoryMappings: {}, // Categorization owned by lib/brands/paige/categories.ts
  },
  {
    brandKey: "ag-jeans",
    displayName: "AG Jeans",
    domain: "agjeans.com",

    // Gender encoded in tags: "Gender:Men" / "Gender:Women" (capital G, capital M/W).
    // scraper normalizes tags to lowercase before comparing, so "gender:men" matches.
    mensInclusionTags: ["gender:men"],
    womensExclusionTags: ["gender:women"],

    colorOptionNames: ["Color"],
    productsPageSize: 250,

    newArrivalsHandle: "new-arrivals",
    saleHandle: "sale",
    popularHandle: "best-sellers",

    categoryMappings: {}, // Categorization owned by lib/brands/ag-jeans/categories.ts
  },
  {
    brandKey: "alo",
    displayName: "Alo Yoga",
    domain: "www.aloyoga.com",

    // Alo is a women's-led catalog. Gender is carried in product_type as a
    // structured taxonomy ("Men:Bottoms:Shorts", "Women:Tops:..."), NOT in tags.
    // The men's gate is enforced precisely by isExcludedAloProductType() (product_type
    // must match ^Men:(Bottoms|Tops|Outerwear):) — see lib/brands/alo/categories.ts.
    //
    // We intentionally do NOT use tag/type-based womens exclusion here:
    //   - requireMensProductType is unusable: "women" contains the substring "men".
    //   - womensExclusionTags ["women:"] would wrongly drop real men's items — 2 men's
    //     jackets (Renown Varsity Jacket, Rain Or Shine Long Coat) carry a stray
    //     "Women:Fashion" tag. The product_type gate handles gender correctly instead.
    mensInclusionTags: [],
    womensExclusionTags: [],

    colorOptionNames: ["Color"],
    // Color lives in the "Color" variant option; dry run confirmed it equals the
    // title suffix for 656/656 men's products. Title suffix is the natural fallback.
    colorSource: "option",

    popularHandle: "mens-bestsellers",

    categoryMappings: {}, // Categorization owned by lib/brands/alo/categories.ts
  },
];

export const BRAND_KEYS = BRANDS.map((b) => b.brandKey);

export const BRAND_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  BRANDS.map((b) => [b.brandKey, b.displayName])
);
