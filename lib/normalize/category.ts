import type { AppCategory } from "@/types";
import type { BrandConfig } from "@/lib/config/brands";
import { lookupGreysonCategory, GREYSON_EXCLUDED_PRODUCT_TYPES } from "@/lib/brands/greyson/categories";
import { lookupAsrvCategory, ASRV_EXCLUDED_PRODUCT_TYPES } from "@/lib/brands/asrv/categories";
import { lookupTravisMathewCategory, isExcludedLicensedSports, TM_EXCLUDED_PRODUCT_TYPES } from "@/lib/brands/travis-mathew/categories";
import { lookupTaylorStitchCategory, isArchivedProduct, isExcludedTaylorStitchTitle, TS_EXCLUDED_PRODUCT_TYPES } from "@/lib/brands/taylor-stitch/categories";
import { lookupBuckMasonCategory, BM_EXCLUDED_PRODUCT_TYPES, isExcludedBMTag, isExcludedBuckMasonTitle } from "@/lib/brands/buck-mason/categories";
import { lookupToddSnyderCategory, TDS_EXCLUDED_PRODUCT_TYPES, isExcludedTDSLicensedSports, hasExcludedTDSTag } from "@/lib/brands/todd-snyder/categories";
import { lookupJohnnieOCategory, JO_EXCLUDED_PRODUCT_TYPES, isExcludedJohnnieOTitle } from "@/lib/brands/johnnie-o/categories";
import { lookupRhoneCategory, isExcludedRhoneProductType } from "@/lib/brands/rhone/categories";
import { lookupVuoriCategory, isExcludedVuoriProductType } from "@/lib/brands/vuori/categories";

// jackets first — "Jackets & Hoodies" type shouldn't be caught by hoodies/sweaters
// longsleeve before shirts — "Long Sleeve Tees" type shouldn't match shirts' "Tees" substring
const PRIORITY_ORDER: AppCategory[] = [
  "jackets",
  "vests",
  "zips",
  "longsleeve",
  "polos",
  "shirts",
  "hoodies",
  "sweaters",
  "shorts",
  "pants",
];

// Mack Weldon non-apparel product types — underwear, bundles, undershirts, accessories.
// Excludes the large volume of underwear packs (3-Pack Boxer Briefs, etc.) and sock bundles
// that would otherwise pass gender filters and corrupt color data with size-as-color entries.
const MW_EXCLUDED_PRODUCT_TYPES = new Set([
  "underwear", "bundles", "undershirts", "accessories", "gift card",
]);

/** Returns true for products that should be skipped entirely — no rules, no vision, no stub row. */
export function isExcludedProductType(
  brand: string,
  productType: string,
  tags: string[] = [],
  title = ""
): boolean {
  const normalized = productType.toLowerCase().trim();
  if (brand === "greyson") return GREYSON_EXCLUDED_PRODUCT_TYPES.has(normalized);
  if (brand === "asrv") return ASRV_EXCLUDED_PRODUCT_TYPES.has(normalized);
  if (brand === "mack-weldon") return MW_EXCLUDED_PRODUCT_TYPES.has(normalized);
  if (brand === "travis-mathew") {
    return TM_EXCLUDED_PRODUCT_TYPES.has(normalized) || isExcludedLicensedSports(productType, tags, title);
  }
  if (brand === "taylor-stitch") {
    return isArchivedProduct(tags) || TS_EXCLUDED_PRODUCT_TYPES.has(normalized) || isExcludedTaylorStitchTitle(title);
  }
  if (brand === "buck-mason") {
    return BM_EXCLUDED_PRODUCT_TYPES.has(normalized) || isExcludedBMTag(tags) || isExcludedBuckMasonTitle(title);
  }
  if (brand === "todd-snyder") {
    return TDS_EXCLUDED_PRODUCT_TYPES.has(normalized) || isExcludedTDSLicensedSports(tags, title) || hasExcludedTDSTag(tags);
  }
  if (brand === "johnnie-o") {
    return JO_EXCLUDED_PRODUCT_TYPES.has(normalized) || isExcludedJohnnieOTitle(title);
  }
  if (brand === "rhone") return isExcludedRhoneProductType(productType, title);
  if (brand === "vuori") return isExcludedVuoriProductType(productType, title);
  return false;
}

export function resolveCategory(
  brand: string,
  productType: string,
  tags: string[],
  config: BrandConfig,
  title = ""
): AppCategory | null {
  // Greyson: deterministic product_type map runs before legacy keyword rules
  if (brand === "greyson" && productType) {
    const greysonCategory = lookupGreysonCategory(productType, tags, title);
    if (greysonCategory) {
      console.log(`[scraper/categorize/greyson] mapped "${productType}" → "${greysonCategory}"`);
      return greysonCategory;
    }
    // Unknown type — fall through to legacy rules for forward-compatibility
  }

  // ASRV: deterministic product_type map (with Sweatshirts title disambiguation)
  if (brand === "asrv" && productType) {
    const asrvCategory = lookupAsrvCategory(productType, tags, title);
    if (asrvCategory) {
      console.log(`[scraper/categorize/asrv] mapped "${productType}" → "${asrvCategory}"`);
      return asrvCategory;
    }
    // Unknown type — fall through to legacy rules for forward-compatibility
  }

  // TravisMathew: deterministic map + Hoodie tag/title disambiguation
  // Licensed sports exclusion is handled upstream by isExcludedProductType().
  if (brand === "travis-mathew" && productType) {
    const tmCategory = lookupTravisMathewCategory(productType, tags, title);
    if (tmCategory) {
      console.log(`[scraper/categorize/travis-mathew] mapped "${productType}" → "${tmCategory}"`);
      return tmCategory;
    }
    // Unknown type — fall through to legacy rules for forward-compatibility
  }

  // Taylor Stitch: umbrella-type disambiguation (Wovens/Knits/Outerwear/Bottoms).
  // ARCHIVE, product_type, and title-keyword exclusions handled upstream by isExcludedProductType().
  if (brand === "taylor-stitch" && productType) {
    const tsCategory = lookupTaylorStitchCategory(productType, tags, title);
    if (tsCategory) {
      console.log(`[scraper/categorize/taylor-stitch] mapped "${productType}" → "${tsCategory}"`);
      return tsCategory;
    }
    // Unknown type — fall through to legacy rules for forward-compatibility
  }

  // Buck Mason: style-- tag-driven disambiguation across multi-destination types.
  // Product_type, tag, and title-keyword exclusions handled upstream by isExcludedProductType().
  if (brand === "buck-mason") {
    const bmCategory = lookupBuckMasonCategory(productType, tags, title);
    if (bmCategory) {
      console.log(`[scraper/categorize/buck-mason] mapped "${productType}" → "${bmCategory}"`);
      return bmCategory;
    }
    // null → vision fallback (collab items with no clear signal, or unknown future types)
    return null;
  }

  // Todd Snyder: Style: tag-driven disambiguation. Full tailored line and licensed sports
  // (NFL/NHL Fanatics, MLB Yankees) excluded upstream by isExcludedProductType().
  if (brand === "todd-snyder") {
    const tsCategory = lookupToddSnyderCategory(productType, tags, title);
    if (tsCategory) {
      console.log(`[scraper/categorize/todd-snyder] mapped "${productType}" → "${tsCategory}"`);
      return tsCategory;
    }
    // null → vision fallback (unknown future types, or unresolvable TS KNITS items)
    return null;
  }

  // Johnnie-O: abbreviated product_type system (MPO, MKO, MSH, etc.) with MKO title dispatch.
  // Licensed sports (NCAA/NFL/MLB/GOLF CM* etc.) excluded upstream by isExcludedProductType().
  if (brand === "johnnie-o") {
    const joCategory = lookupJohnnieOCategory(productType, tags, title);
    if (joCategory) {
      console.log(`[scraper/categorize/johnnie-o] mapped "${productType}" → "${joCategory}"`);
      return joCategory;
    }
    // null → vision fallback (unknown future types)
    return null;
  }

  // Rhone: English product_type names with Tees/Tanks title dispatch and Midlayers title dispatch.
  // Blazers/Jackets and sleeveless items excluded upstream by isExcludedProductType().
  if (brand === "rhone") {
    const rhoneCategory = lookupRhoneCategory(productType, tags, title);
    if (rhoneCategory) {
      console.log(`[scraper/categorize/rhone] mapped "${productType}" → "${rhoneCategory}"`);
      return rhoneCategory;
    }
    // null → vision fallback (unknown future types)
    return null;
  }

  // Vuori: English product_type names with Tops title dispatch and Jackets & Hoodies title dispatch.
  // Tanks, sleeveless items, blazers, and non-apparel excluded upstream by isExcludedProductType().
  if (brand === "vuori") {
    const vuoriCategory = lookupVuoriCategory(productType, tags, title);
    if (vuoriCategory) {
      console.log(`[scraper/categorize/vuori] mapped "${productType}" → "${vuoriCategory}"`);
      return vuoriCategory;
    }
    // null → vision fallback (unknown future types)
    return null;
  }

  // Normalize curly apostrophes (U+2019 → U+0027) for consistent matching (e.g. BYLT's product types)
  const normalizeStr = (s: string) => s.toLowerCase().trim().replace(/’/g, "'");
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
  vests: "Vests",
  shirts: "Shirts",
  polos: "Polos",
  longsleeve: "Long Sleeve",
  hoodies: "Hoodies",
  sweaters: "Sweaters",
  zips: "Zip-Ups",
  shorts: "Shorts",
  pants: "Pants",
};

export const ALL_CATEGORIES: AppCategory[] = [
  "jackets",
  "vests",
  "polos",
  "shirts",
  "longsleeve",
  "hoodies",
  "sweaters",
  "zips",
  "shorts",
  "pants",
];
