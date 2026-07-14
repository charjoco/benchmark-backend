import axios from "axios";
import { prisma } from "@/lib/prisma";
import { extractColorBucket, logUnmappedColor } from "@/lib/normalize/color";
import { resolveCategory, isExcludedProductType } from "@/lib/normalize/category";
import { curationExclusionReason, isRecognizedApparelType, isNonApparelProductType } from "@/lib/normalize/exclusions";
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

// \u2500\u2500 Exclusion-critical sub-fetches (FAIL CLOSED) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// The gender/licensed collection fetches decide what gets EXCLUDED from the catalog.
// If one silently returns empty on a transient error (TravisMathew 429s hard), zero
// products get excluded, they survive into validMensExternalIds, and the stale-prune
// keeps them \u2014 licensed college/pro gear leaks into a men's app while the scrape still
// reports "success". So every exclusion-critical fetch MUST fail closed: any transient
// failure (429 / 5xx / timeout / network) is retried with spaced backoff, then \u2014 if still
// failing \u2014 THROWN, aborting the brand's scrape *before* the prune so the existing catalog
// is left untouched. A 404 is treated as "collection absent" (empty), NOT a transient
// failure. New exclusion-critical fetches must route through these helpers so they inherit
// fail-closed by default (do not read collection IDs for exclusion via the best-effort
// fetchCollectionProductIds, which fails open and is only safe for non-critical new/sale flags).
//
// DESIGNATED FALLBACK (NOT built now): if a brand's exclusion fetch keeps failing even after
// retries, reuse the last successful exclusion-ID set from cache with a loud "using cached
// exclusions from <date>" log rather than aborting every cron. Only build this if retries
// prove insufficient in practice.
class ExclusionFetchError extends Error {
  constructor(public brandKey: string, public handle: string, public status: number | null) {
    super(
      `[SCRAPE ABORT] ${brandKey}: exclusion-critical fetch of '${handle}' failed ` +
        `(status=${status ?? "network/timeout"}) after retries \u2014 aborting scrape to avoid ` +
        `leaking un-excluded products; existing catalog left UNCHANGED until the endpoint recovers.`
    );
    this.name = "ExclusionFetchError";
  }
}

// Spaced, escalating backoff \u2014 seconds, not a tight loop. TravisMathew rate-limits hard, and
// hammering risks a WAF block (the Peter Millar / Incapsula scenario) on a live brand.
const EXCLUSION_FETCH_RETRY_DELAYS_MS = [2000, 5000, 12000];
const SHOPIFY_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// One collection page, fail-closed. Returns null on 404 (collection absent \u2192 caller treats as
// empty). Throws ExclusionFetchError on transient failure (429/5xx/timeout/network) after retries.
async function fetchExclusionCollectionPage(
  brandKey: string,
  domain: string,
  handle: string,
  page: number,
  limit: number
): Promise<ShopifyProduct[] | null> {
  const url = `https://${domain}/collections/${handle}/products.json?limit=${limit}&page=${page}`;
  let lastStatus: number | null = null;
  for (let attempt = 0; attempt <= EXCLUSION_FETCH_RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      const backoff = EXCLUSION_FETCH_RETRY_DELAYS_MS[attempt - 1];
      console.warn(
        `[${brandKey}] exclusion fetch '${handle}' p${page}: retry ${attempt}/${EXCLUSION_FETCH_RETRY_DELAYS_MS.length} ` +
          `in ${backoff / 1000}s (last status=${lastStatus ?? "network/timeout"})`
      );
      await delay(backoff);
    }
    try {
      const res = await axios.get<ShopifyResponse>(url, {
        headers: { "User-Agent": SHOPIFY_UA, Accept: "application/json" },
        timeout: 20000,
      });
      return res.data?.products ?? [];
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        lastStatus = err.response?.status ?? null;
        if (lastStatus === 404) return null; // collection absent \u2014 not a transient failure
      } else {
        lastStatus = null;
      }
      // 429 / 5xx / timeout / network \u2192 fall through and retry
    }
  }
  throw new ExclusionFetchError(brandKey, handle, lastStatus);
}

// Fail-closed collection-ID fetch for exclusion gates (gender collections, licensed handles).
async function fetchExclusionCollectionIds(
  brandKey: string,
  domain: string,
  handle: string
): Promise<Set<string>> {
  const ids = new Set<string>();
  const limit = 250;
  for (let page = 1; ; page++) {
    const products = await fetchExclusionCollectionPage(brandKey, domain, handle, page, limit);
    if (products === null) {
      console.warn(`[${brandKey}] exclusion collection '${handle}' returned 404 \u2014 treated as absent (0 IDs)`);
      break;
    }
    if (products.length === 0) break;
    for (const p of products) ids.add(String(p.id));
    if (products.length < limit) break;
    await delay(400, 400);
  }
  return ids;
}

// Fail-closed variant of fetchAllCollectionHandles for licensedCollectionPatterns resolution.
async function fetchExclusionCollectionHandles(brandKey: string, domain: string): Promise<string[]> {
  const handles: string[] = [];
  const limit = 250;
  for (let page = 1; ; page++) {
    const url = `https://${domain}/collections.json?limit=${limit}&page=${page}`;
    let cols: { handle: string }[] | null = null;
    let lastStatus: number | null = null;
    for (let attempt = 0; attempt <= EXCLUSION_FETCH_RETRY_DELAYS_MS.length; attempt++) {
      if (attempt > 0) await delay(EXCLUSION_FETCH_RETRY_DELAYS_MS[attempt - 1]);
      try {
        const res = await axios.get<{ collections?: { handle: string }[] }>(url, {
          headers: { "User-Agent": SHOPIFY_UA, Accept: "application/json" },
          timeout: 20000,
        });
        cols = res.data?.collections ?? [];
        break;
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          lastStatus = err.response?.status ?? null;
          if (lastStatus === 404) {
            cols = [];
            break;
          }
        } else {
          lastStatus = null;
        }
        // 429 / 5xx / timeout / network \u2192 retry
      }
    }
    if (cols === null) throw new ExclusionFetchError(brandKey, "collections.json (licensed patterns)", lastStatus);
    if (cols.length === 0) break;
    for (const c of cols) handles.push(c.handle);
    if (cols.length < limit) break;
    await delay(400, 400);
  }
  return handles;
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

  // Women's product_type exclusion \u2014 deliberate, not coincidental. Some brands
  // (e.g. TravisMathew) carry women's garment types with NO gender prefix on the
  // product_type or tags; without this they only get caught by chance via the title
  // words below. Matched against the normalized (lowercased) product_type.
  // "active top"/"active tank"/"active dress" are TM's Moveknit/Skyloft women's
  // activewear lines (Sport Top, Longline Tank, etc.).
  const WOMENS_PRODUCT_TYPES = new Set([
    "dress", "skort", "skirt", "legging", "romper", "jumpsuit", "bra top",
    "active dress", "active tank", "active top",
  ]);
  if (WOMENS_PRODUCT_TYPES.has(type)) return false;

  // Title-based exclusion: catch women's items that slip through gender tagging.
  // Space-padded " bra " avoids false positives on "Chambray", "Braves", "Nebraska", "Branch".
  // Leading-space " dress" avoids false positives on "Address Unknown".
  const womensTitleWords = ["skort", "skirt", " dress", "romper", "jumpsuit", "legging", " bra ", "bra top", "bra-top", "bikini", "thong", "crop top", "sports bra", "womens", "women's", "women\u2019s"];
  if (womensTitleWords.some((w) => title.includes(w))) return false;
  // Also exclude if title starts with "women" (catches "Women's Flow Short", "Women's Everyday Pant", etc.)
  if (title.startsWith("women")) return false;

  // Youth/age exclusion \u2014 catch kids' items by title with case-insensitive word
  // boundaries. Brands like TravisMathew put youth products in the main catalog with
  // no gender/age field, so without this they pass the men's heuristic (this is the
  // confirmed source of the youth leak once the collection gate fell back to here).
  // Word boundaries prevent false positives: "boys" won't match inside another word,
  // "kid" won't match "kidney", "infant" won't match a larger token, etc.
  const YOUTH_TITLE_RE = /\b(youth|boys|girls|juniors?|kids?|toddler|infant)\b/i;
  if (YOUTH_TITLE_RE.test(product.title)) return false;

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
    // Exclusion-critical (inclusion gate): a transient failure here aborts (fail closed) rather
    // than silently falling back to the heuristic gate. A 404/empty still falls back below.
    mensCollectionIds = await fetchExclusionCollectionIds(config.brandKey, config.domain, config.mensCollectionHandle);
    console.log(`[${config.displayName}] ${mensCollectionIds.size} products in mens collection`);
  }

  const raw = await fetchAllProducts(config.domain, config.productsPageSize ?? 250);
  console.log(`[${config.displayName}] Found ${raw.length} raw products`);

  // ── Gender/age gate ────────────────────────────────────────────────────────
  let genderFiltered: ShopifyProduct[];

  if (config.excludeCollectionHandles && config.excludeCollectionHandles.length > 0) {
    // DETERMINISTIC EXCLUSION GATE (primary for travis-mathew): men's = flat catalog minus
    // the union of the listed collections' product IDs. Uses the site's own working women's/youth
    // collection endpoints instead of the dead /collections/mens. Each fetch paginates fully.
    const excludeIds = new Set<string>();
    let gateFailed = false;
    for (const handle of config.excludeCollectionHandles) {
      // Fail closed: a transient failure throws (aborts before prune); a 404/200-empty returns 0
      // IDs and is caught by the gateFailed check below (deterministic gate can't be trusted).
      const ids = await fetchExclusionCollectionIds(config.brandKey, config.domain, handle);
      console.log(`[${config.displayName}] exclusion collection '${handle}': ${ids.size} IDs`);
      if (ids.size === 0) {
        console.warn(
          `[SCRAPE WARNING] ${config.brandKey}: exclusion collection '${handle}' returned 0 IDs ` +
            `(non-200 or empty) — the deterministic gender/age gate is INCOMPLETE.`
        );
        gateFailed = true;
      }
      for (const id of ids) excludeIds.add(id);
    }

    if (gateFailed) {
      // FAIL CASE — skip-and-warn. If a women's/youth collection endpoint breaks (as /mens
      // already did), we must NOT fall through to an ungated catalog, which would dump women's
      // and youth into a men's app. Stale data beats leaked data: abort this brand's scrape and
      // leave existing rows untouched until the endpoint recovers.
      console.error(
        `[SCRAPE ABORT] ${config.brandKey}: exclusion gate failed — a women's/youth collection ` +
          `returned 0/non-200 IDs. Skipping scrape; existing catalog left UNCHANGED to avoid ` +
          `leaking ungated women's/youth products.`
      );
      return { found: raw.length, upserted: 0, skipped: raw.length };
    }

    genderFiltered = raw.filter((p) => !excludeIds.has(String(p.id)));
    console.log(
      `[${config.displayName}] exclusion gate: ${excludeIds.size} excluded (women/youth) → ` +
        `${genderFiltered.length} men's`
    );
  } else if (mensCollectionIds.size > 0) {
    // Inclusion gate: only products in the men's collection.
    genderFiltered = raw.filter((p) => mensCollectionIds.has(String(p.id)));
  } else {
    // Heuristic fallback. Loud if a mensCollectionHandle was configured but resolved to 0 IDs
    // (silent degradation of the intended authoritative gate).
    if (config.mensCollectionHandle) {
      console.warn(
        `[SCRAPE WARNING] ${config.brandKey}: mensCollectionHandle '${config.mensCollectionHandle}' ` +
          `resolved to 0 collection IDs (endpoint 500/empty) — falling back to isMensProduct heuristic gate. ` +
          `Gender/age gating is NOT authoritative for this brand.`
      );
    }
    genderFiltered = raw.filter((p) => isMensProduct(p, config));
  }

  // ── Independent gender assertion (alarm, non-blocking) ───────────────────────
  // Even the deterministic collection gate trusts the brand to keep its women's collection
  // complete. "2XS" sizing is a validated women's-only signal for this catalog (0/111 men's
  // numeric-waist bottoms and 0/61 men's college-licensed items carry it). If any 2XS product
  // survives the gate, the women's collection missed it — flag loudly so we catch the
  // collection-trust failure mode. Does not block; the count is the alarm.
  if (config.excludeCollectionHandles && config.excludeCollectionHandles.length > 0) {
    const survivors2xs = genderFiltered.filter((p) =>
      p.options?.some(
        (o) => /size/i.test(o.name) && o.values?.some((v) => v.trim().toLowerCase() === "2xs")
      )
    );
    if (survivors2xs.length > 0) {
      console.warn(
        `[GENDER ASSERTION] ${config.brandKey}: ${survivors2xs.length} products with 2XS sizing ` +
          `survived the collection gate — women's collection may be incomplete. Samples: ` +
          survivors2xs.slice(0, 8).map((p) => p.title).join(" | ")
      );
    }
  }

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

  // ── Shared curation exclusions (v1 = curated men's APPAREL only) ─────────────
  // Runs at the menProducts stage so excluded products drop out of validMensExternalIds
  // below → grandfathered accessory rows (categorized before an exclusion existed) get
  // PRUNED by the stale-cleanup on this scrape, not just skipped. Removes: non-apparel
  // product_types (hats/belts/bags/…), miscategorized accessories by title, and licensed
  // college/pro product_types (NCAA/MLB/NFL/NHL — e.g. johnnie-o).
  const curationCounts = { "non-apparel-type": 0, "accessory-title": 0, "licensed-sports-type": 0 } as Record<string, number>;
  const apparelFiltered = nonApparelFiltered.filter((p) => {
    const reason = curationExclusionReason(p.product_type, p.title);
    if (reason) {
      curationCounts[reason]++;
      return false;
    }
    return true;
  });
  console.log(
    `[${config.displayName}] curation-excluded: non-apparel-type=${curationCounts["non-apparel-type"]} ` +
      `accessory-title=${curationCounts["accessory-title"]} licensed-sports-type=${curationCounts["licensed-sports-type"]} ` +
      `→ ${apparelFiltered.length} apparel`
  );

  // NEW-TYPE TRIPWIRE: surface product_types that are neither recognized apparel nor a known
  // accessory (the "neither" bucket that defaults to KEEP). Logging them once per scrape means
  // a novel accessory type a brand invents shows up in logs, not in a walkthrough — same intent
  // as UnknownColor logging.
  const unrecognizedTypes = new Set<string>();
  for (const p of apparelFiltered) {
    if (p.product_type && !isRecognizedApparelType(p.product_type) && !isNonApparelProductType(p.product_type)) {
      unrecognizedTypes.add(p.product_type);
    }
  }
  if (unrecognizedTypes.size > 0) {
    console.log(
      `[CURATION TRIPWIRE] ${config.brandKey}: ${unrecognizedTypes.size} kept product_type(s) not recognized as ` +
        `apparel or accessory (defaulting to KEEP — review if any are novel accessories): ` +
        [...unrecognizedTypes].slice(0, 40).join(" | ")
    );
  }

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

  let menProducts = apparelFiltered;
  // Licensed-collection exclusion. licensedSportsHandle stays for the game-day + PGA-carve-out
  // logic; licensedCollectionHandles adds any number of further licensed collections (e.g. TM's
  // "collegiate-collection"). Their union of member IDs is excluded (PGA carve-out still wins).
  const licensedHandles = [
    ...(config.licensedSportsHandle ? [config.licensedSportsHandle] : []),
    ...(config.licensedCollectionHandles ?? []),
  ];
  // Pattern-matched licensed collections: resolve /collections.json handles against the regex
  // patterns (e.g. greyson's ~30 nfl-<team>-apparel-collection) so new team collections are
  // caught automatically without enumerating literals.
  if (config.licensedCollectionPatterns && config.licensedCollectionPatterns.length > 0) {
    const allHandles = await fetchExclusionCollectionHandles(config.brandKey, config.domain);
    const regexes = config.licensedCollectionPatterns.map((p) => new RegExp(p, "i"));
    const matched = allHandles.filter((h) => regexes.some((r) => r.test(h)));
    console.log(`[${config.displayName}] licensed patterns matched ${matched.length} collection handles`);
    for (const h of matched) if (!licensedHandles.includes(h)) licensedHandles.push(h);
  }
  if (licensedHandles.length > 0) {
    const licensedIds = new Set<string>();
    for (const handle of licensedHandles) {
      // Fail closed: this is the TravisMathew collegiate-collection fetch. A 429/timeout here used
      // to return empty → zero exclusions → USC/LSU leaked while the scrape reported success. Now
      // it retries with backoff and throws (aborts the brand's scrape) if still failing.
      const ids = await fetchExclusionCollectionIds(config.brandKey, config.domain, handle);
      console.log(`[${config.displayName}] licensed collection '${handle}': ${ids.size} products`);
      for (const id of ids) licensedIds.add(id);
    }
    const before = menProducts.length;
    menProducts = apparelFiltered.filter((p) => {
      if (PGA_CARVE_OUT.test(p.handle)) return true;        // PGA exemption always wins
      if (licensedIds.has(String(p.id))) return false;       // in a licensed collection → exclude
      const [matched, label] = matchesLicensedLine(p.handle, p.title);
      if (matched) {
        console.log(`[${config.displayName}] excluded by licensed-line rule: ${p.handle} (matched: ${label})`);
        return false;
      }
      return true;
    });
    console.log(`[${config.displayName}] ${before - menProducts.length} licensed sports/college products excluded`);
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
        // NOTE: this only skips CATEGORIZATION of not-yet-categorized items; it does not
        // remove anything from serving. Serve-level exclusion is now handled earlier by the
        // shared curation filter (apparelFiltered), which drops excluded products before
        // validMensExternalIds so grandfathered rows get pruned. Renamed from the old
        // "excluded productType" line, which misleadingly implied it stopped serving.
        console.log(`[scraper/categorize/${config.brandKey}] skipped categorization (brand exclusion) for productType "${product.product_type}"`);
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
          // LOUD: this product passed the curation gate (it's meant to be apparel) but resolved
          // to NULL category. NULL rows are never served (API filters category:{not:null}), so a
          // legit apparel item landing here is a categorization BUG we want surfaced, not a silent
          // accessory. If this fires on real apparel, fix the brand's category rules.
          console.warn(`[CATEGORY NULL] ${config.brandKey}: "${product.title}" (type="${product.product_type}") resolved NULL category after rules+vision — apparel item will NOT serve until categorized. Investigate if this is real apparel.`);
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
