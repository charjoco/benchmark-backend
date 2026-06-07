import axios from "axios";
import { prisma } from "@/lib/prisma";
import { extractColorBucket, logUnmappedColor } from "@/lib/normalize/color";
import { resolveCategory, isExcludedProductType } from "@/lib/normalize/category";
import { resolveAppColor } from "@/lib/normalize/colors/resolver";
import type { AppColor } from "@/lib/normalize/colors/canonical";
import { isWomensProductImage, classifyCategoryViaVision } from "@/lib/normalize/vision";
import type { BrandConfig } from "@/lib/config/brands";
import type { AppCategory, UpsertableProduct, Colorway, SizeVariant } from "@/types";

interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  available: boolean;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  // Present when a variant has a specific image assigned (used for Handle-option color extraction)
  featured_image?: { alt: string } | null;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  product_type: string;
  tags: string[];
  images: Array<{ src: string; variant_ids?: number[] }>;
  variants: ShopifyVariant[];
  options: Array<{ name: string; values: string[] }>;
  published_at: string;
}

interface ShopifyResponse {
  products: ShopifyProduct[];
}

function delay(ms: number, jitter = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms + Math.random() * jitter));
}

async function fetchAllProducts(domain: string, limit = 250): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  let page = 1;

  while (true) {
    const url = `https://${domain}/products.json?limit=${limit}&page=${page}`;

    try {
      const res = await axios.get<ShopifyResponse>(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        timeout: 20000,
      });

      const products = res.data?.products;
      if (!products || products.length === 0) break;

      all.push(...products);
      if (products.length < limit) break;
      page++;
      await delay(500, 600);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        console.warn(`[${domain}] /products.json returned 404 — not a Shopify store?`);
        break;
      }
      throw err;
    }
  }

  return all;
}

/** Fetch all product IDs from a collection (e.g. new-arrivals) */
async function fetchCollectionProductIds(domain: string, handle: string): Promise<Set<string>> {
  const ids = new Set<string>();
  let page = 1;
  const limit = 250;

  while (true) {
    const url = `https://${domain}/collections/${handle}/products.json?limit=${limit}&page=${page}`;
    try {
      const res = await axios.get<ShopifyResponse>(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        timeout: 20000,
      });

      const products = res.data?.products;
      if (!products || products.length === 0) break;

      for (const p of products) ids.add(String(p.id));
      if (products.length < limit) break;
      page++;
      await delay(400, 400);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        console.warn(`[${domain}] /collections/${handle}/products.json returned 404 — skipping new arrivals`);
        break;
      }
      console.warn(`[${domain}] Error fetching new arrivals collection:`, err instanceof Error ? err.message : err);
      break;
    }
  }

  return ids;
}

function normalizeStr(s: string): string {
  return s.toLowerCase().trim().replace(/\u2019/g, "'");
}

function isMensProduct(product: ShopifyProduct, config: BrandConfig): boolean {
  const tags = product.tags.map((t) => normalizeStr(t));
  const type = normalizeStr(product.product_type);
  const title = product.title.toLowerCase();

  // Hard rule: if brand embeds gender in product_type, require "men" to be present
  if (config.requireMensProductType && !type.includes("men")) return false;

  if (config.mensInclusionTags.length > 0) {
    const hasInclusionTag = config.mensInclusionTags.some((t) =>
      tags.includes(t.toLowerCase())
    );
    if (!hasInclusionTag) return false;
  }

  if (config.womensExclusionTags.length > 0) {
    const hasWomensTag = config.womensExclusionTags.some(
      (t) =>
        tags.some((tag) => tag.includes(normalizeStr(t))) ||
        type.includes(normalizeStr(t))
    );
    if (hasWomensTag) return false;
  }

  // Title-based exclusion: catch women's items that slip through gender tagging.
  // Space-padded " bra " avoids false positives on "Chambray", "Braves", "Nebraska", "Branch".
  // Leading-space " dress" avoids false positives on "Address Unknown".
  const womensTitleWords = ["skort", "skirt", " dress", "romper", "jumpsuit", "legging", " bra ", "bra top", "bra-top", "bikini", "thong", "crop top", "sports bra", "womens", "women's", "women\u2019s"];
  if (womensTitleWords.some((w) => title.includes(w))) return false;
  // Also exclude if title starts with "women" (catches "Women's Flow Short", "Women's Everyday Pant", etc.)
  if (title.startsWith("women")) return false;

  // Brand-specific title prefix exclusion (e.g. ASRV women's line uses "W0" prefix)
  if (config.womensTitlePrefixes && config.womensTitlePrefixes.some((p) => product.title.startsWith(p))) return false;

  return true;
}

function getColorOptionIndex(product: ShopifyProduct, config: BrandConfig): number {
  const idx = product.options.findIndex((o) =>
    config.colorOptionNames.map((n) => n.toLowerCase()).includes(o.name.toLowerCase())
  );
  return idx;
}

function getSizeOptionIndex(product: ShopifyProduct, colorIndex: number): number {
  const sizeKeywords = ["size", "sizes"];
  const idx = product.options.findIndex((o) =>
    sizeKeywords.includes(o.name.toLowerCase())
  );
  if (idx !== -1) return idx;
  return colorIndex === 0 ? 1 : 0;
}

function getVariantOption(variant: ShopifyVariant, optionIndex: number): string {
  if (optionIndex === 0) return variant.option1 ?? "";
  if (optionIndex === 1) return variant.option2 ?? "";
  if (optionIndex === 2) return variant.option3 ?? "";
  return "";
}

// Strings that appear after a title separator but are not color names.
// ASRV EOL products: "FA'22 Core Oversized Tee - XS - Discontinued" → would extract "Discontinued".
const NON_COLOR_MARKERS = new Set(["discontinued", "coming soon", "sold out"]);

function extractColorFromTitle(title: string, separator = " - "): string {
  const lastSep = title.lastIndexOf(separator);
  if (lastSep === -1) return "Unknown";
  let color = title.slice(lastSep + separator.length).trim();
  color = color.replace(/\s+"[^"]*"$/, "").trim();
  if (!color || NON_COLOR_MARKERS.has(color.toLowerCase())) return "Unknown";
  return color;
}

function groupVariantsByColor(
  product: ShopifyProduct,
  config: BrandConfig
): Record<string, ShopifyVariant[]> {
  const groups: Record<string, ShopifyVariant[]> = {};

  if (config.colorSource === "title") {
    const color = extractColorFromTitle(product.title, config.colorTitleSeparator);
    groups[color] = [...product.variants];
    return groups;
  }

  if (config.colorSource === "tag" && config.colorTagPrefix) {
    const prefix = config.colorTagPrefix.toLowerCase();
    const colorTag = product.tags.find(
      (t) => t.toLowerCase().startsWith(prefix) && t.toLowerCase() !== `${prefix}group--`
    );
    const raw = colorTag ? colorTag.slice(config.colorTagPrefix.length) : "Unknown";
    const color = raw.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    groups[color] = [...product.variants];
    return groups;
  }

  // "tag-or-title": for brands where color lives in a tag on most products but some
  // products only have a title suffix (e.g. DUER uses color_* tags but a handful of
  // products have no tag because their title never got a color suffix either).
  // Tag is preferred — it's explicit and unambiguous. Title suffix is the fallback.
  if (config.colorSource === "tag-or-title" && config.colorTagPrefix) {
    const prefix = config.colorTagPrefix.toLowerCase();
    const colorTag = product.tags.find((t) => t.toLowerCase().startsWith(prefix));
    if (colorTag) {
      const raw = colorTag.slice(config.colorTagPrefix.length).trim();
      const color = raw.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      groups[color] = [...product.variants];
    } else {
      const color = extractColorFromTitle(product.title, config.colorTitleSeparator);
      groups[color] = [...product.variants];
    }
    return groups;
  }

  const colorOptionIndex = getColorOptionIndex(product, config);

  // Rhone (and potentially other brands) encode colorways as a "Handle" option whose values
  // are URL slugs (e.g. "mens-endure-tee_lichen-green"). The option name is "Handle", not
  // "Color", so colorOptionIndex is -1. The variant's featured_image.alt contains the clean
  // color name ("Lichen Green") — read from there instead of trying to parse the slug.
  const hasHandleOption = product.options.some((o) => o.name.toLowerCase() === "handle");

  for (const variant of product.variants) {
    let color: string;

    if (colorOptionIndex >= 0) {
      color = getVariantOption(variant, colorOptionIndex) || "Unknown";
    } else if (hasHandleOption) {
      color = variant.featured_image?.alt || "Unknown";
    } else {
      const parts = variant.title.split(" / ");
      color = parts.length > 1 ? parts[parts.length - 1].trim() : "Unknown";
    }

    if (!groups[color]) groups[color] = [];
    groups[color].push(variant);
  }

  return groups;
}

function buildSizeVariants(
  variants: ShopifyVariant[],
  sizeIndex: number
): SizeVariant[] {
  return variants.map((v) => ({
    size: getVariantOption(v, sizeIndex) || v.title,
    available: v.available,
  }));
}

function resolveImageForColor(
  product: ShopifyProduct,
  colorVariants: ShopifyVariant[],
  preferredImageIndex = 0
): string {
  const firstVariantId = colorVariants[0]?.id;
  if (firstVariantId) {
    const variantImage = product.images.find(
      (img) => img.variant_ids && img.variant_ids.includes(firstVariantId)
    );
    if (variantImage) return variantImage.src;
  }
  return (product.images[preferredImageIndex] ?? product.images[0])?.src ?? "";
}

/** Merge size lists, preferring available=true when a size appears in multiple colorways */
function mergeSizes(colorways: Colorway[]): SizeVariant[] {
  const sizeMap = new Map<string, boolean>();
  for (const cw of colorways) {
    for (const sv of cw.sizes) {
      sizeMap.set(sv.size, (sizeMap.get(sv.size) ?? false) || sv.available);
    }
  }
  return Array.from(sizeMap.entries()).map(([size, available]) => ({ size, available }));
}

function assertColorPipelineIntegrity(
  colorBuckets: string,
  availableColors: string,
): void {
  // Title Case pipeline must contain no lowercase tokens
  const titleCaseTokens = colorBuckets.split(",").filter(Boolean);
  for (const token of titleCaseTokens) {
    if (token !== token[0]?.toUpperCase() + token.slice(1).toLowerCase() &&
        token !== token.toUpperCase()) {
      throw new Error(
        `Color pipeline contamination: lowercase token "${token}" found in colorBuckets (Title Case field). availableColors="${availableColors}"`
      );
    }
  }

  // Lowercase pipeline must contain no Title Case tokens
  const lowercaseTokens = availableColors.split(",").filter(Boolean);
  for (const token of lowercaseTokens) {
    if (token !== token.toLowerCase()) {
      throw new Error(
        `Color pipeline contamination: non-lowercase token "${token}" found in availableColors (lowercase field). colorBuckets="${colorBuckets}"`
      );
    }
  }
}

async function upsertProduct(data: UpsertableProduct, forceNew = false, forceSale = false): Promise<boolean> {
  const primary = data.colorways[0];
  if (!primary) return false;

  // Derived aggregate fields
  const minPrice = Math.min(...data.colorways.map((c) => c.price));
  const anyOnSale = forceSale || data.colorways.some((c) => c.onSale);
  // compareAtPrice: use the highest original price when on sale
  const comparePrices = data.colorways
    .map((c) => c.compareAtPrice)
    .filter((p): p is number => p !== null);
  const maxCompare = comparePrices.length > 0 ? Math.max(...comparePrices) : null;
  const allSizes = mergeSizes(data.colorways);

  // Unique color buckets as comma-sep string for filtering (legacy Title Case pipeline)
  const bucketSet = new Set(data.colorways.map((c) => c.colorBucket));
  const colorBuckets = Array.from(bucketSet).join(",");

  // New lowercase pipeline — resolve all colorways in parallel (step 0 hits DB)
  const resolvedAppColors = await Promise.all(
    data.colorways.map((cw) => resolveAppColor(cw.colorName, data.brand, data.handle))
  );
  const availableColors = Array.from(
    new Set(resolvedAppColors.filter((c): c is AppColor => c !== null))
  ).join(",");

  assertColorPipelineIntegrity(colorBuckets, availableColors);

  const existing = await prisma.product.findUnique({
    where: { brand_externalId: { brand: data.brand, externalId: data.externalId } },
    select: { firstSeenAt: true, price: true, inStock: true, colorways: true, visionFailed: true },
  });

  // Vision screening: for brand-new products only, reject if Claude detects a woman in the image
  if (!existing && primary.imageUrl) {
    const isWomens = await isWomensProductImage(primary.imageUrl);
    if (isWomens) {
      console.log(`[Vision] Excluded women's product: "${data.title}" (${data.brand})`);
      return false;
    }
  }

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const firstSeenAt = existing?.firstSeenAt ?? new Date();

  const now = new Date();
  const priceDroppedAt =
    existing && minPrice < existing.price ? now : undefined;
  // A restock is never a new drop — mutual exclusivity enforced here.
  const isRestocking = !!(existing && !existing.inStock && data.inStock);

  // Per-colorway firstSeenAt: carry forward existing timestamps, stamp new colorways
  let hasNewColorway = false;
  const existingColorways: Array<{ colorName: string; firstSeenAt?: string }> = existing
    ? (() => { try { return JSON.parse(existing.colorways); } catch { return []; } })()
    : [];
  const existingColorNames = new Set(existingColorways.map((c) => c.colorName));
  const colorwaysWithTimestamps = data.colorways.map((cw, i) => {
    const base = { ...cw, appColor: resolvedAppColors[i] };
    if (!existingColorNames.has(cw.colorName)) {
      hasNewColorway = true;
      return { ...base, firstSeenAt: now.toISOString() };
    }
    const prev = existingColorways.find((e) => e.colorName === cw.colorName);
    return { ...base, firstSeenAt: prev?.firstSeenAt ?? now.toISOString() };
  });

  const isNew = !isRestocking && (forceNew || firstSeenAt > fourteenDaysAgo || hasNewColorway);

  const colourwaysJson = JSON.stringify(colorwaysWithTimestamps);

  await prisma.product.upsert({
    where: { brand_externalId: { brand: data.brand, externalId: data.externalId } },
    create: {
      externalId: data.externalId,
      brand: data.brand,
      title: data.title,
      handle: data.handle,
      productUrl: data.productUrl,
      category: data.category,
      // Primary colorway
      colorName: primary.colorName,
      colorBucket: primary.colorBucket,
      imageUrl: primary.imageUrl,
      // Aggregates
      price: minPrice,
      compareAtPrice: maxCompare,
      onSale: anyOnSale,
      colorways: colourwaysJson,
      colorBuckets,
      availableColors,
      sizes: JSON.stringify(allSizes),
      inStock: data.inStock,
      isNew: true,
      firstSeenAt: now,
      lastSeenAt: now,
    },
    update: {
      title: data.title,
      productUrl: data.productUrl,
      category: data.category,
      colorName: primary.colorName,
      colorBucket: primary.colorBucket,
      imageUrl: primary.imageUrl,
      price: minPrice,
      compareAtPrice: maxCompare,
      onSale: anyOnSale,
      colorways: colourwaysJson,
      colorBuckets,
      availableColors,
      sizes: JSON.stringify(allSizes),
      inStock: data.inStock,
      isNew,
      lastSeenAt: now,
      ...(priceDroppedAt && { priceDroppedAt }),
      // Clear vision failure flags on any successful categorization (recovery path)
      ...(existing?.visionFailed && { visionFailed: false, visionFailedAt: null, visionFailedReason: null }),
    },
  });

  return !existing;
}

export async function scrapeShopifyBrand(config: BrandConfig): Promise<{
  found: number;
  upserted: number;
  skipped: number;
}> {
  console.log(`[${config.displayName}] Fetching products...`);

  // Fetch new arrivals collection IDs first (if configured)
  let newArrivalIds = new Set<string>();
  if (config.newArrivalsHandle) {
    console.log(`[${config.displayName}] Fetching new arrivals collection: ${config.newArrivalsHandle}`);
    newArrivalIds = await fetchCollectionProductIds(config.domain, config.newArrivalsHandle);
    console.log(`[${config.displayName}] ${newArrivalIds.size} products in new arrivals`);
  }

  // Fetch sale collection IDs (if configured) — fallback for brands that don't set compare_at_price
  let saleIds = new Set<string>();
  if (config.saleHandle) {
    saleIds = await fetchCollectionProductIds(config.domain, config.saleHandle);
    console.log(`[${config.displayName}] ${saleIds.size} products in sale`);
  }

  // Fetch mens collection IDs (if configured) — replaces isMensProduct() for this brand
  let mensCollectionIds = new Set<string>();
  if (config.mensCollectionHandle) {
    console.log(`[${config.displayName}] Fetching mens collection: ${config.mensCollectionHandle}`);
    mensCollectionIds = await fetchCollectionProductIds(config.domain, config.mensCollectionHandle);
    console.log(`[${config.displayName}] ${mensCollectionIds.size} products in mens collection`);
  }

  const raw = await fetchAllProducts(config.domain, config.productsPageSize ?? 250);
  console.log(`[${config.displayName}] Found ${raw.length} raw products`);

  const genderFiltered = mensCollectionIds.size > 0
    ? raw.filter((p) => mensCollectionIds.has(String(p.id)))
    : raw.filter((p) => isMensProduct(p, config));

  // Global non-apparel exclusion — catches accessories and non-apparel that slip through gender filters.
  // Notes on specific keywords:
  //   " sock"  — space-padded to avoid false positives on "Hammock", "Hemlock", etc.
  //   "briefs" — plural only; singular "brief" is a substring of "briefcase" (MW bag false positive)
  //   "kit"    — excluded: matches "Kite" (TravisMathew "Kite Surfer Short") and "Kitts" (H&B shirt)
  const NON_APPAREL_TITLE_WORDS = [
    " sock", "boxer", "briefs", "underwear",
    "3-pack", "3 pack", "bundle", "store credit", "gift card",
  ];
  const nonApparelFiltered = genderFiltered.filter(
    (p) => !NON_APPAREL_TITLE_WORDS.some((w) => p.title.toLowerCase().includes(w))
  );
  console.log(`[${config.displayName}] ${nonApparelFiltered.length} after men's filter`);

  // Filter out licensed sports products using two complementary signals:
  //
  // PRIMARY: game-day Shopify collection membership (config.licensedSportsHandle).
  //   Covers ~99% of licensed products. Fetched fresh each scrape so it stays current.
  //
  // SUPPLEMENTARY: licensed product-line slugs in the handle, validated against the title.
  //   Exists because Johnnie-O has a structural gap — three product lines (Stadium Exeter,
  //   Galvin MLB polos, Eddie college hoodies) are systematically absent from game-day.
  //   Validated 2026-05-19: catches 40/40 known gap products, 0 false positives against
  //   783 confirmed originals, 0 PGA collisions.
  //
  //   KNOWN FAILURE MODE: Galvin and Eddie are personal-name styles that Johnnie-O uses for
  //   BOTH licensed and non-licensed products (Lyndonn, Birdie, Stetsons, Motion all have
  //   non-licensed variants). The title-check discriminator — "team name precedes style name
  //   in licensed titles" — could incorrectly exclude a future non-licensed product whose
  //   title leads with a color or adjective (e.g. "Seal Galvin Performance Polo").
  //   Re-evaluate if: (a) the log line below fires on a confirmed original, or (b) Johnnie-O
  //   changes their non-licensed naming convention away from "{Style} {Descriptor}" form.
  const PGA_CARVE_OUT = /pga|wm-phoenix|wastemanagement|waste-management|ryder-cup|rydercup|usopen|perry-golf|perrygolf|-players|_players/i;

  // Supplementary licensed-line detection. Each branch returns [matched: boolean, label: string].
  function matchesLicensedLine(handle: string, title: string): [boolean, string] {
    // Exeter: "stadium-exeter" / "stadiumexeter" are compound slugs that inherently signal
    // team-venue use. "exeter-printed" catches the city-prefixed variant (miami-exeter-printed-...).
    if (/stadium.?exeter|exeter-printed/i.test(handle)) return [true, "exeter-compound"];
    // Galvin MLB polo line: title always leads with the MLB team name ("Chicago Cubs Galvin...").
    // A plain non-licensed "Galvin polo" would start with "Galvin" or a product descriptor.
    if (/(?<![a-z])galvin(?![a-z])/i.test(handle) && !/^galvin\b/i.test(title.trim())) return [true, "galvin-team-title"];
    // Eddie college hoodie line: same pattern — team name always leads the title.
    if (/(?<![a-z])eddie(?![a-z])/i.test(handle) && !/^eddie\b/i.test(title.trim())) return [true, "eddie-team-title"];
    return [false, ""];
  }

  let menProducts = nonApparelFiltered;
  if (config.licensedSportsHandle) {
    const licensedIds = await fetchCollectionProductIds(config.domain, config.licensedSportsHandle);
    console.log(`[${config.displayName}] ${licensedIds.size} products in licensed sports collection`);
    const before = menProducts.length;
    menProducts = nonApparelFiltered.filter((p) => {
      if (PGA_CARVE_OUT.test(p.handle)) return true;        // PGA exemption always wins
      if (licensedIds.has(String(p.id))) return false;       // in game-day collection → exclude
      const [matched, label] = matchesLicensedLine(p.handle, p.title);
      if (matched) {
        console.log(`[${config.displayName}] excluded by licensed-line rule: ${p.handle} (matched: ${label})`);
        return false;
      }
      return true;
    });
    console.log(`[${config.displayName}] ${before - menProducts.length} licensed sports products excluded`);
  }

  // Paige: collapse per-inseam duplicates to one product per colorway.
  // Paige sells each inseam (30/32/34/37 in) as a separate Shopify product, so the
  // same colorway appears 2–4 times. Group by style:* + styleColor:* tag pair and
  // keep the product whose inseam is closest to 32" (standard size).
  if (config.brandKey === "paige") {
    const before = menProducts.length;
    const groups = new Map<string, typeof menProducts>();
    for (const p of menProducts) {
      const tags = p.tags.map((t) => t.toLowerCase());
      const style = tags.find((t) => t.startsWith("style:")) ?? "";
      const styleColor = tags.find((t) => t.startsWith("stylecolor:")) ?? "";
      const key = `${style}|${styleColor}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    menProducts = [];
    for (const group of groups.values()) {
      if (group.length === 1) {
        menProducts.push(group[0]);
      } else {
        const best = group.reduce((a, b) => {
          const inseamOf = (p: (typeof group)[0]) => {
            const m = p.title.match(/\b(\d+)\s+[Ii]nch\b/);
            return m ? parseInt(m[1], 10) : 0;
          };
          return Math.abs(inseamOf(a) - 32) <= Math.abs(inseamOf(b) - 32) ? a : b;
        });
        menProducts.push(best);
      }
    }
    console.log(`[paige] inseam dedup: ${before} → ${menProducts.length} colorways`);
  }

  // Build the set of valid men's product IDs for stale cleanup later
  const validMensExternalIds = new Set(menProducts.map((p) => String(p.id)));

  let upserted = 0;
  let skipped = 0;
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  for (const product of menProducts) {
    const externalId = String(product.id);
    const loopNow = new Date();

    // Pre-fetch fields needed for the category decision — indexed unique lookup, ~1ms
    const precheck = await prisma.product.findUnique({
      where: { brand_externalId: { brand: config.brandKey, externalId } },
      select: { categoryOverride: true, visionFailed: true, visionFailedAt: true, category: true, lastSeenAt: true },
    });

    let category: AppCategory | null = null;

    // Step 1: categoryOverride — admin has manually assigned a category; skip rules and vision
    if (precheck?.categoryOverride) {
      console.log(`[scraper/categorize] ${config.displayName} "${product.title}" — categoryOverride: ${precheck.categoryOverride}`);
      category = precheck.categoryOverride as AppCategory;
    } else if (precheck?.category) {
      // Step 2: already categorized — reuse existing category, skip rules and vision entirely.
      // Also rescues the visionFailed=true + category IS NOT NULL artifact left by an older code
      // path — those products fall through to upsertProduct, which clears the flag on update.
      if (precheck.visionFailed) {
        console.log(`[scraper/categorize] ${config.displayName} "${product.title}" — reusing category "${precheck.category}", clearing stale visionFailed flag`);
      }
      category = precheck.category as AppCategory;
    } else {
      // Step 3a: exclusion — known non-apparel types skip vision and stub entirely
      // TODO: cleanup pattern — when adding any new exclusion rule (per-brand
      // or licensed-sports), existing products that match the new rule must
      // be cleaned up separately. The scraper's Step 2 precheck.category
      // shortcut means already-categorized products bypass exclusion checks
      // on subsequent scrapes. Run scripts/preview-tm-mlb-cleanup.ts (or
      // equivalent) after deploying a new exclusion to clear the back catalog.
      if (isExcludedProductType(config.brandKey, product.product_type, product.tags, product.title)) {
        console.log(`[scraper/categorize/${config.brandKey}] excluded productType "${product.product_type}"`);
        skipped++;
        continue;
      }

      // Step 3: visionFailed TTL guard — only reached for truly uncategorized products
      const failedAt = precheck?.visionFailedAt;
      if (precheck?.visionFailed && failedAt && (loopNow.getTime() - failedAt.getTime()) < SEVEN_DAYS_MS) {
        const daysAgo = Math.floor((loopNow.getTime() - failedAt.getTime()) / 86400000);
        console.log(`[scraper/categorize] ${config.displayName} "${product.title}" — skipping (visionFailed ${daysAgo}d ago, TTL 7d)`);
        skipped++;
        continue;
      }

      // Step 4: rule-based categorization
      category = resolveCategory(config.brandKey, product.product_type, product.tags, config, product.title);

      if (category && precheck?.visionFailed) {
        // Rules now match a previously-failed product — flags will be cleared in upsert below
        console.log(`[scraper/categorize] ${config.displayName} "${product.title}" — rules recovered (was visionFailed), flags clearing on upsert`);
      }

      if (!category) {
        // Step 5: vision fallback — only for products where rules returned null
        const preferredIdx = config.preferredImageIndex ?? 0;
        const primaryImage = (product.images[preferredIdx] ?? product.images[0])?.src ?? "";
        const result = await classifyCategoryViaVision(primaryImage, product.title, product.product_type);

        if (result.category) {
          category = result.category;
          console.log(`[scraper/categorize] ${config.displayName} "${product.title}" — vision → ${category}`);
        } else if (result.reason === "inconclusive") {
          console.log(`[scraper/categorize] ${config.displayName} "${product.title}" — vision inconclusive (${result.detail ?? "—"}), saving stub row`);
          const stubDomain = config.websiteDomain ?? config.domain;
          await prisma.product.upsert({
            where: { brand_externalId: { brand: config.brandKey, externalId } },
            create: {
              externalId,
              brand: config.brandKey,
              title: product.title,
              handle: product.handle,
              productUrl: `https://${stubDomain}/products/${product.handle}`,
              category: null,
              colorName: "",
              colorBucket: "",
              imageUrl: primaryImage,
              price: 0,
              colorways: "[]",
              colorBuckets: "",
              sizes: "[]",
              inStock: false,
              visionFailed: true,
              visionFailedAt: loopNow,
              visionFailedReason: result.detail ?? "inconclusive",
            },
            update: {
              visionFailed: true,
              visionFailedAt: loopNow,
              visionFailedReason: result.detail ?? "inconclusive",
            },
          });
          skipped++;
          continue;
        } else {
          // reason === "error": transient failure, do not set visionFailed flag
          console.log(`[scraper/categorize] ${config.displayName} "${product.title}" — vision error (transient), not flagging`);
          skipped++;
          continue;
        }
      }
    }

    // category is resolved — guard for TypeScript
    if (!category) { skipped++; continue; }

    const colorGroups = groupVariantsByColor(product, config);
    const colorOptionIndex = getColorOptionIndex(product, config);
    const sizeOptionIndex = getSizeOptionIndex(product, colorOptionIndex);

    // Build all colorways for this product
    const colorways: Colorway[] = [];

    for (const [colorName, variants] of Object.entries(colorGroups)) {
      const prices = variants.map((v) => parseFloat(v.price));
      const comparePrices = variants
        .map((v) => (v.compare_at_price ? parseFloat(v.compare_at_price) : null))
        .filter((p): p is number => p !== null);

      const minPrice = Math.min(...prices);
      const maxCompare = comparePrices.length > 0 ? Math.max(...comparePrices) : null;
      const onSale = maxCompare !== null && maxCompare > minPrice;
      const sizes = buildSizeVariants(variants, sizeOptionIndex);
      const imageUrl = resolveImageForColor(product, variants, config.preferredImageIndex);
      const colorBucket = extractColorBucket(colorName);

      logUnmappedColor(config.brandKey, colorName);

      colorways.push({ colorName, colorBucket, imageUrl, price: minPrice, compareAtPrice: maxCompare, onSale, sizes });
    }

    if (colorways.length === 0) continue;

    const inStock = colorways.some((c) => c.sizes.some((s) => s.available));

    const urlDomain = config.websiteDomain ?? config.domain;

    // Detect new-arrival signals from product tags in addition to the collection check
    const NEW_ARRIVAL_TAG_PHRASES = new Set([
      "new", "new arrival", "new arrivals", "new drop", "new drops",
      "new item", "new items", "new color", "new colour", "new colorway",
    ]);
    const hasNewArrivalTag = product.tags.some((t) =>
      NEW_ARRIVAL_TAG_PHRASES.has(t.toLowerCase().trim())
    );
    const forceNew = newArrivalIds.has(String(product.id)) || hasNewArrivalTag;
    const forceSale = saleIds.has(String(product.id));
    const isNew = await upsertProduct({
      externalId: String(product.id),
      brand: config.brandKey,
      title: product.title,
      handle: product.handle,
      productUrl: `https://${urlDomain}/products/${product.handle}`,
      category,
      colorways,
      inStock,
    }, forceNew, forceSale);

    if (isNew) upserted++;
  }

  // Remove stale/invalid products — anything in the DB for this brand that didn't pass
  // the men's filter gets deleted. This clears out women's items that slipped in previously
  // and handles discontinued products.
  const existingIds = await prisma.product.findMany({
    where: { brand: config.brandKey },
    select: { id: true, externalId: true, title: true },
  });

  const toDelete = existingIds.filter((p) => !validMensExternalIds.has(p.externalId));
  if (toDelete.length > 0) {
    await prisma.product.deleteMany({
      where: { id: { in: toDelete.map((p) => p.id) } },
    });
    for (const p of toDelete) {
      console.log(`[${config.displayName}] Removed stale product: "${p.title}"`);
    }
    console.log(`[${config.displayName}] Removed ${toDelete.length} stale products`);
  }

  console.log(
    `[${config.displayName}] Done. ${upserted} new, ${skipped} skipped, ${toDelete.length} removed`
  );
  return { found: raw.length, upserted, skipped };
}
