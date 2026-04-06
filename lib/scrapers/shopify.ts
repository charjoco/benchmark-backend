import axios from "axios";
import { prisma } from "@/lib/prisma";
import { extractColorBucket, logUnmappedColor } from "@/lib/normalize/color";
import { resolveCategory } from "@/lib/normalize/category";
import { isWomensProductImage } from "@/lib/normalize/vision";
import type { BrandConfig } from "@/lib/config/brands";
import type { UpsertableProduct, Colorway, SizeVariant } from "@/types";

interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  available: boolean;
  option1: string | null;
  option2: string | null;
  option3: string | null;
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

async function fetchAllProducts(domain: string): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  let page = 1;
  const limit = 250;

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

  // Title-based exclusion: catch women's items that slip through gender tagging
  const womensTitleWords = ["skort", "skirt", "dress", "legging", "bra", "bikini", "thong", "crop top", "sports bra", "womens", "women's", "women's"];
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

function extractColorFromTitle(title: string): string {
  const lastDash = title.lastIndexOf(" - ");
  if (lastDash === -1) return "Unknown";
  let color = title.slice(lastDash + 3).trim();
  color = color.replace(/\s+"[^"]*"$/, "").trim();
  return color || "Unknown";
}

function groupVariantsByColor(
  product: ShopifyProduct,
  config: BrandConfig
): Record<string, ShopifyVariant[]> {
  const groups: Record<string, ShopifyVariant[]> = {};

  if (config.colorSource === "title") {
    const color = extractColorFromTitle(product.title);
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

  const colorOptionIndex = getColorOptionIndex(product, config);

  for (const variant of product.variants) {
    let color: string;

    if (colorOptionIndex >= 0) {
      color = getVariantOption(variant, colorOptionIndex) || "Unknown";
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
  colorVariants: ShopifyVariant[]
): string {
  const firstVariantId = colorVariants[0]?.id;
  if (firstVariantId) {
    const variantImage = product.images.find(
      (img) => img.variant_ids && img.variant_ids.includes(firstVariantId)
    );
    if (variantImage) return variantImage.src;
  }
  return product.images[0]?.src ?? "";
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

async function upsertProduct(data: UpsertableProduct, forceNew = false): Promise<boolean> {
  const primary = data.colorways[0];
  if (!primary) return false;

  // Derived aggregate fields
  const minPrice = Math.min(...data.colorways.map((c) => c.price));
  const anyOnSale = data.colorways.some((c) => c.onSale);
  // compareAtPrice: use the highest original price when on sale
  const comparePrices = data.colorways
    .map((c) => c.compareAtPrice)
    .filter((p): p is number => p !== null);
  const maxCompare = comparePrices.length > 0 ? Math.max(...comparePrices) : null;
  const allSizes = mergeSizes(data.colorways);

  // Unique color buckets as comma-sep string for filtering
  const bucketSet = new Set(data.colorways.map((c) => c.colorBucket));
  const colorBuckets = Array.from(bucketSet).join(",");

  const existing = await prisma.product.findUnique({
    where: { brand_externalId: { brand: data.brand, externalId: data.externalId } },
    select: { firstSeenAt: true, price: true, inStock: true },
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
  const isRestocking = !!(existing && !existing.inStock && data.inStock);
  const restockedAt = isRestocking ? now : undefined;

  // A restock is never a new drop — mutual exclusivity enforced here.
  // forceNew = product is in the brand's new-arrivals collection OR has a new-arrival tag.
  const isNew = !isRestocking && (forceNew || firstSeenAt > fourteenDaysAgo);

  const colourwaysJson = JSON.stringify(data.colorways);

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
      sizes: JSON.stringify(allSizes),
      inStock: data.inStock,
      isNew,
      lastSeenAt: now,
      ...(priceDroppedAt && { priceDroppedAt }),
      ...(restockedAt && { restockedAt }),
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

  const raw = await fetchAllProducts(config.domain);
  console.log(`[${config.displayName}] Found ${raw.length} raw products`);

  const menProducts = raw.filter((p) => isMensProduct(p, config));
  console.log(`[${config.displayName}] ${menProducts.length} after men's filter`);

  let upserted = 0;
  let skipped = 0;

  for (const product of menProducts) {
    const category = resolveCategory(product.product_type, product.tags, config, product.title);

    if (!category) {
      console.debug(
        `[${config.displayName}] Skipping "${product.title}" (type="${product.product_type}", tags=${product.tags.slice(0, 3).join(",")})`
      );
      skipped++;
      continue;
    }

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
      const imageUrl = resolveImageForColor(product, variants);
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
    const isNew = await upsertProduct({
      externalId: String(product.id),
      brand: config.brandKey,
      title: product.title,
      handle: product.handle,
      productUrl: `https://${urlDomain}/products/${product.handle}`,
      category,
      colorways,
      inStock,
    }, forceNew);

    if (isNew) upserted++;
  }

  console.log(
    `[${config.displayName}] Done. ${upserted} new, ${skipped} skipped`
  );
  return { found: raw.length, upserted, skipped };
}
