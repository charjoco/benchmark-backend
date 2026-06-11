import type { AppCategory } from "@/types";
import type { BrandConfig } from "@/lib/config/brands";
import { lookupGreysonCategory, GREYSON_EXCLUDED_PRODUCT_TYPES } from "@/lib/brands/greyson/categories";
import { lookupAsrvCategory, ASRV_EXCLUDED_PRODUCT_TYPES } from "@/lib/brands/asrv/categories";
import { lookupTravisMathewCategory, isExcludedLicensedSports, TM_EXCLUDED_PRODUCT_TYPES } from "@/lib/brands/travis-mathew/categories";
import { lookupTaylorStitchCategory, isArchivedProduct, isExcludedTaylorStitchTitle, TS_EXCLUDED_PRODUCT_TYPES } from "@/lib/brands/taylor-stitch/categories";
import { lookupBuckMasonCategory, BM_EXCLUDED_PRODUCT_TYPES, isExcludedBMTag, isExcludedBuckMasonTitle } from "@/lib/brands/buck-mason/categories";
import { lookupToddSnyderCategory, TDS_EXCLUDED_PRODUCT_TYPES, isExcludedTDSLicensedSports, hasExcludedTDSTag } from "@/lib/brands/todd-snyder/categories";
import { lookupJohnnieOCategory, JO_EXCLUDED_PRODUCT_TYPES, isExcludedJohnnieOTitle, isExcludedJOTournamentTitle } from "@/lib/brands/johnnie-o/categories";
import { lookupRhoneCategory, isExcludedRhoneProductType } from "@/lib/brands/rhone/categories";
import { lookupVuoriCategory, isExcludedVuoriProductType } from "@/lib/brands/vuori/categories";
import { lookupByltCategory, isExcludedByltProductType } from "@/lib/brands/bylt/categories";
import { lookupTenThousandCategory, isExcludedTenThousandProductType } from "@/lib/brands/ten-thousand/categories";
import { lookupHBCategory, isExcludedHBProductType } from "@/lib/brands/holderness-bourne/categories";
import { lookupLinksoulCategory, isExcludedLinksoulProductType } from "@/lib/brands/linksoul/categories";
import { lookupFahertyCategory, isExcludedFahertyProductType, isExcludedFahertyTitle } from "@/lib/brands/faherty/categories";
import { lookupMWCategory, isExcludedMWProductType, isExcludedMWTitle } from "@/lib/brands/mack-weldon/categories";
import { lookupMBCategory, isExcludedMBProductType, isExcludedMBBundle } from "@/lib/brands/mott-and-bow/categories";
import { lookupAGCategory, isExcludedAGProductType, isExcludedAGBottomsTitle } from "@/lib/brands/ag-jeans/categories";
import { lookupDuerCategory, isExcludedDuerProductType } from "@/lib/brands/duer/categories";
import { lookupPaigeCategory, isExcludedPaigeProduct } from "@/lib/brands/paige/categories";

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
  if (brand === "mack-weldon") return isExcludedMWProductType(productType) || isExcludedMWTitle(title);
  if (brand === "mott-and-bow") return isExcludedMBProductType(productType, title);
  if (brand === "ag-jeans") return isExcludedAGProductType(productType) || isExcludedAGBottomsTitle(tags, title);
  if (brand === "duer") return isExcludedDuerProductType(productType, tags);
  if (brand === "paige") return isExcludedPaigeProduct(tags, title);
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
    return JO_EXCLUDED_PRODUCT_TYPES.has(normalized) || isExcludedJohnnieOTitle(title) || isExcludedJOTournamentTitle(title);
  }
  if (brand === "rhone") return isExcludedRhoneProductType(productType, title);
  if (brand === "vuori") return isExcludedVuoriProductType(productType, title);
  if (brand === "bylt") return isExcludedByltProductType(productType, title);
  if (brand === "ten-thousand") return isExcludedTenThousandProductType(productType, title);
  if (brand === "holderness-bourne") return isExcludedHBProductType(productType, title);
  if (brand === "linksoul") return isExcludedLinksoulProductType(productType);
  if (brand === "faherty") return isExcludedFahertyProductType(productType) || isExcludedFahertyTitle(title);
  return false;
}

export function resolveCategory(
  brand: string,
  productType: string,
  tags: string[],
  config: BrandConfig,
  title = ""
): AppCategory | null {
  // Shared vest detection — fires before brand dispatch for all brands.
  // /\bvests?\b/i matches "vest" / "vests" as whole words, not substrings
  // ("harvest", "investment" do not match due to the word-boundary anchor).
  if (/\bvests?\b/i.test(title)) return "vests";

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

  // Ten Thousand: granular per-product-line types; title dispatch for multi-destination types.
  // Exclusions (compression, non-apparel, underwear, tanks) handled upstream.
  if (brand === "ten-thousand") {
    const ttCategory = lookupTenThousandCategory(productType, title);
    if (ttCategory) {
      console.log(`[scraper/categorize/ten-thousand] mapped "${productType}" → "${ttCategory}"`);
      return ttCategory;
    }
    return null;
  }

  // Holderness & Bourne: English product_type names ("Mens Shirts Polos", "Mens Layering Pullovers", etc.)
  // with title dispatch for multi-destination types (Layering Pullovers, Layering Sweaters, Bottoms Shorts).
  // Exclusions (hats, bags, belts, Other, Boys prefix, U.S. Open titles) handled upstream.
  if (brand === "holderness-bourne") {
    const hbCategory = lookupHBCategory(productType, title);
    if (hbCategory) {
      console.log(`[scraper/categorize/holderness-bourne] mapped "${productType}" → "${hbCategory}"`);
      return hbCategory;
    }
    return null;
  }

  // Linksoul: short English product_type names with Layer title dispatch.
  // Exclusions (hat, accessories, sock, gift cards, shoe, return) handled upstream.
  if (brand === "linksoul") {
    const lsCategory = lookupLinksoulCategory(productType, title);
    if (lsCategory) {
      console.log(`[scraper/categorize/linksoul] mapped "${productType}" → "${lsCategory}"`);
      return lsCategory;
    }
    return null;
  }

  // Faherty: curly-apostrophe product_types ("Men's Button Ups" etc.) with title dispatch
  // across all 6 apparel types. Accessories, footwear, swim, lounge, licensed content
  // excluded upstream by isExcludedProductType(). Vests handled by shared vest rule above.
  if (brand === "faherty") {
    const fahertyCategory = lookupFahertyCategory(productType, title);
    if (fahertyCategory) {
      console.log(`[scraper/categorize/faherty] mapped "${productType}" → "${fahertyCategory}"`);
      return fahertyCategory;
    }
    return null;
  }

  // Mack Weldon: three-type system (Tops / Bottoms / Final Sale) with strict title dispatch.
  // Type + title exclusions (underwear, sleep, accessories, swim, junk types) handled upstream
  // by isExcludedProductType(). Vests handled by shared vest rule above.
  if (brand === "mack-weldon") {
    const mwCategory = lookupMWCategory(productType, title);
    if (mwCategory) {
      console.log(`[scraper/categorize/mack-weldon] mapped "${productType}" → "${mwCategory}"`);
      return mwCategory;
    }
    return null;
  }

  // DUER: jeans-only ingest. Only type=Jeans, non-base-product products reach here
  // (all others excluded upstream by isExcludedProductType). All remaining products are
  // men's performance denim jeans.
  if (brand === "duer") {
    const duerCategory = lookupDuerCategory(productType);
    if (duerCategory) {
      console.log(`[scraper/categorize/duer] mapped "${productType}" → "${duerCategory}"`);
      return duerCategory;
    }
    return null;
  }

  // Paige: jeans-only ingest (Phase 1). clothingType:Jeans tag is the sole gate;
  // non-denim products incorrectly tagged as Jeans (Macneil Pant, Stafford Trouser)
  // are excluded upstream by isExcludedProductType. All remaining products are denim.
  if (brand === "paige") {
    const paigeCategory = lookupPaigeCategory();
    if (paigeCategory) {
      console.log(`[scraper/categorize/paige] → "${paigeCategory}"`);
      return paigeCategory;
    }
    return null;
  }

  // AG Jeans: jeans-only brand. Only MENS BOTTOMS denim jeans reach here — non-MENS-BOTTOMS
  // types and non-jeans MENS BOTTOMS (chinos, shorts) are both excluded upstream by
  // isExcludedProductType (which now calls isExcludedAGBottomsTitle at the hard gate).
  if (brand === "ag-jeans") {
    const agCategory = lookupAGCategory(productType, title);
    if (agCategory) {
      console.log(`[scraper/categorize/ag-jeans] mapped "${productType}" → "${agCategory}"`);
      return agCategory;
    }
    return null;
  }

  // Mott & Bow: jeans-only brand. Only "Mens-jeans" product_type reaches here
  // (all others excluded upstream by isExcludedProductType). Bundle products
  // (multi-pack jeans whose title contains "Pack"/"Bundle") are excluded here
  // before categorization — they are not single-colorway products.
  if (brand === "mott-and-bow") {
    if (isExcludedMBBundle(title)) return null;
    const mbCategory = lookupMBCategory(productType, title);
    if (mbCategory) {
      console.log(`[scraper/categorize/mott-and-bow] mapped "${productType}" → "${mbCategory}"`);
      return mbCategory;
    }
    return null;
  }

  // BYLT: hierarchical "Men's-*" product_type system with U+2019 apostrophes.
  // Exclusions (underwear, boardshorts, tanks, blazers, bundles) handled upstream.
  if (brand === "bylt") {
    const byltCategory = lookupByltCategory(productType, tags, title);
    if (byltCategory) {
      console.log(`[scraper/categorize/bylt] mapped "${productType}" → "${byltCategory}"`);
      return byltCategory;
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
  denim: "Denim",
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
  "denim",
];
