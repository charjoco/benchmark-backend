import axios from "axios";
import { prisma } from "@/lib/prisma";
import { extractColorBucket, logUnmappedColor } from "@/lib/normalize/color";
import { resolveCategory } from "@/lib/normalize/category";
import type { BrandConfig } from "@/lib/config/brands";
import type { UpsertableProduct, SizeVariant } from "@/types";

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      await delay(600);
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

function isMensProduct(product: ShopifyProduct, config: BrandConfig): boolean {
  const tags = product.tags.map((t) => t.toLowerCase().trim());
  const type = product.product_type.toLowerCase();

  // If brand specifies required mens tags, at least one must be present
  if (config.mensInclusionTags.length > 0) {
    const hasInclusionTag = config.mensInclusionTags.some((t) =>
      tags.includes(t.toLowerCase())
    );
    if (!hasInclusionTag) return false;
  }

  // Exclude if any womens exclusion tag is present
  if (config.womensExclusionTags.length > 0) {
    const hasWomensTag = config.womensExclusionTags.some(
      (t) =>
        tags.includes(t.toLowerCase()) ||
        type.includes(t.toLowerCase())
    );
    if (hasWomensTag) return false;
  }

  return true;
}

function getColorOptionIndex(product: ShopifyProduct, config: BrandConfig): number {
  const idx = product.options.findIndex((o) =>
    config.colorOptionNames.map((n) => n.toLowerCase()).includes(o.name.toLowerCase())
  );
  return idx; // -1 if not found
}

function getSizeOptionIndex(product: ShopifyProduct, colorIndex: number): number {
  // Size is usually the first option that isn't the color option
  const sizeKeywords = ["size", "sizes"];
  const idx = product.options.findIndex((o) =>
    sizeKeywords.includes(o.name.toLowerCase())
  );
  if (idx !== -1) return idx;
  // If no explicit "Size" option, use the first option that isn't color
  return colorIndex === 0 ? 1 : 0;
}

function getVariantOption(variant: ShopifyVariant, optionIndex: number): string {
  if (optionIndex === 0) return variant.option1 ?? "";
  if (optionIndex === 1) return variant.option2 ?? "";
  if (optionIndex === 2) return variant.option3 ?? "";
  return "";
}

function groupVariantsByColor(
  product: ShopifyProduct,
  config: BrandConfig
): Record<string, ShopifyVariant[]> {
  const colorOptionIndex = getColorOptionIndex(product, config);
  const groups: Record<string, ShopifyVariant[]> = {};

  for (const variant of product.variants) {
    let color: string;

    if (colorOptionIndex >= 0) {
      color = getVariantOption(variant, colorOptionIndex) || "Unknown";
    } else {
      // Fall back: parse from variant title "M / Heather Black"
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
  // Try to find an image that matches the first variant of this color
  const firstVariantId = colorVariants[0]?.id;
  if (firstVariantId) {
    const variantImage = product.images.find(
      (img) => img.variant_ids && img.variant_ids.includes(firstVariantId)
    );
    if (variantImage) return variantImage.src;
  }
  // Fall back to first product image
  return product.images[0]?.src ?? "";
}

async function upsertProduct(data: UpsertableProduct): Promise<boolean> {
  const isNew = (() => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    // New products start as new; existing products retain their firstSeenAt
    return true; // Will be overridden on update if firstSeenAt is older
  })();

  const existing = await prisma.product.findUnique({
    where: {
      brand_externalId_colorName: {
        brand: data.brand,
        externalId: data.externalId,
        colorName: data.colorName,
      },
    },
    select: { firstSeenAt: true },
  });

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const firstSeenAt = existing?.firstSeenAt ?? new Date();
  const computedIsNew = firstSeenAt > fourteenDaysAgo;

  await prisma.product.upsert({
    where: {
      brand_externalId_colorName: {
        brand: data.brand,
        externalId: data.externalId,
        colorName: data.colorName,
      },
    },
    create: {
      externalId: data.externalId,
      brand: data.brand,
      title: data.title,
      handle: data.handle,
      productUrl: data.productUrl,
      category: data.category,
      colorName: data.colorName,
      colorBucket: data.colorBucket,
      price: data.price,
      compareAtPrice: data.compareAtPrice,
      onSale: data.onSale,
      imageUrl: data.imageUrl,
      sizes: JSON.stringify(data.sizes),
      inStock: data.inStock,
      isNew: true, // new on first insert
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    },
    update: {
      title: data.title,
      productUrl: data.productUrl,
      category: data.category,
      colorBucket: data.colorBucket,
      price: data.price,
      compareAtPrice: data.compareAtPrice,
      onSale: data.onSale,
      imageUrl: data.imageUrl,
      sizes: JSON.stringify(data.sizes),
      inStock: data.inStock,
      isNew: computedIsNew,
      lastSeenAt: new Date(),
    },
  });

  return !existing; // true if newly inserted
}

export async function scrapeShopifyBrand(config: BrandConfig): Promise<{
  found: number;
  upserted: number;
  skipped: number;
}> {
  console.log(`[${config.displayName}] Fetching products...`);
  const raw = await fetchAllProducts(config.domain);
  console.log(`[${config.displayName}] Found ${raw.length} raw products`);

  const menProducts = raw.filter((p) => isMensProduct(p, config));
  console.log(`[${config.displayName}] ${menProducts.length} after men's filter`);

  let upserted = 0;
  let skipped = 0;

  for (const product of menProducts) {
    const category = resolveCategory(product.product_type, product.tags, config);

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

    for (const [colorName, variants] of Object.entries(colorGroups)) {
      const prices = variants.map((v) => parseFloat(v.price));
      const comparePrices = variants
        .map((v) => (v.compare_at_price ? parseFloat(v.compare_at_price) : null))
        .filter((p): p is number => p !== null);

      const minPrice = Math.min(...prices);
      const maxCompare = comparePrices.length > 0 ? Math.max(...comparePrices) : null;
      const onSale = maxCompare !== null && maxCompare > minPrice;
      const inStock = variants.some((v) => v.available);
      const sizes = buildSizeVariants(variants, sizeOptionIndex);
      const imageUrl = resolveImageForColor(product, variants);
      const colorBucket = extractColorBucket(colorName);

      logUnmappedColor(config.brandKey, colorName);

      const isNew = await upsertProduct({
        externalId: `${product.id}-${colorName}`,
        brand: config.brandKey,
        title: product.title,
        handle: product.handle,
        productUrl: `https://${config.domain}/products/${product.handle}`,
        category,
        colorName,
        colorBucket,
        price: minPrice,
        compareAtPrice: maxCompare,
        onSale,
        imageUrl,
        sizes,
        inStock,
      });

      if (isNew) upserted++;
    }
  }

  console.log(
    `[${config.displayName}] Done. ${upserted} new, ${skipped} skipped`
  );
  return { found: raw.length, upserted, skipped };
}
