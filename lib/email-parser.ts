import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { BRANDS } from "@/lib/config/brands";
import { extractColorBucket } from "@/lib/normalize/color";
import { resolveCategory } from "@/lib/normalize/category";
import { scrapeShopifyBrand } from "@/lib/scrapers/shopify";
import type { RawEmail } from "@/lib/gmail";

const SYSTEM_PROMPT = readFileSync(
  join(process.cwd(), "lib/ai-system-prompt.md"),
  "utf-8"
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Map website domains → brand keys for matching email senders
const DOMAIN_TO_BRAND: Record<string, string> = {
  "byltbasics.com": "bylt",
  "bylt.com": "bylt",
  "asrv.com": "asrv",
  "buckmason.com": "buck-mason",
  "reigningchamp.com": "reigning-champ",
  "toddsnyder.com": "todd-snyder",
  "rhone.com": "rhone",
  "mackweldon.com": "mack-weldon",
  "vuori.com": "vuori",
  "vuoriclothing.com": "vuori",
  "publicrec.com": "public-rec",
  "lululemon.com": "lululemon",
  "tenthousand.cc": "ten-thousand",
  "holdernessandbourne.com": "holderness-bourne",
  "linksoul.com": "linksoul",
  "pakaapparel.com": "paka",
};

interface EmailSignal {
  brandKey: string;
  signalType: "new_drop" | "price_change" | "restock" | "unknown";
  products: { title: string; url: string }[];
}

interface ShopifyProductJson {
  id: number;
  title: string;
  handle: string;
  product_type: string;
  tags: string[];
  variants: Array<{
    price: string;
    compare_at_price: string | null;
    available: boolean;
    option1: string | null;
    option2: string | null;
  }>;
  options: Array<{ name: string; values: string[] }>;
  images: Array<{ src: string; variant_ids?: number[] }>;
}

/** Use Claude to extract signal type and product URLs from an email. */
async function parseEmailWithClaude(email: RawEmail): Promise<EmailSignal | null> {
  const brandList = BRANDS.map((b) => `${b.brandKey} (${b.websiteDomain ?? b.domain})`).join(", ");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Parse this brand marketing email and extract product signals.

Known brands: ${brandList}

Email from: ${email.from}
Subject: ${email.subject}
Body:
${email.body}

Return ONLY valid JSON in this exact format:
{
  "brandKey": "<brand key from the known brands list, or null if unrecognized>",
  "signalType": "<one of: new_drop, price_change, restock, unknown>",
  "products": [
    { "title": "<product name>", "url": "<full https:// product URL, or null if not found in email>" }
  ]
}

Important: If a product URL is not in the email body, set url to null — the system will search the brand website for it. Include all men's clothing products mentioned, even without a URL.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as EmailSignal;
    if (!parsed.brandKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Search the brand's website for a product URL by title when none was in the email. */
async function searchBrandForProductUrl(brandKey: string, productTitle: string): Promise<string | null> {
  const brand = BRANDS.find((b) => b.brandKey === brandKey);
  if (!brand) return null;

  const domain = brand.domain;
  const searchUrl = `https://${domain}/search/suggest.json?q=${encodeURIComponent(productTitle)}&resources[type]=product`;

  try {
    const res = await axios.get<any>(searchUrl, {
      timeout: 8000,
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    });

    const products = res.data?.resources?.results?.products ?? [];
    if (products.length > 0) {
      const websiteDomain = brand.websiteDomain ?? domain;
      const handle = products[0].handle;
      return `https://${websiteDomain}/products/${handle}`;
    }
  } catch {
    // Search not available for this brand — skip
  }

  return null;
}

/** Attempt to fetch structured product data from a Shopify product URL. */
async function fetchShopifyProduct(productUrl: string, brandKey: string): Promise<ShopifyProductJson | null> {
  const brand = BRANDS.find((b) => b.brandKey === brandKey);
  if (!brand) return null;

  // Extract handle from URL (last path segment)
  const handle = productUrl.split("/products/")[1]?.split("?")[0];
  if (!handle) return null;

  const shopifyDomain = brand.domain;
  const url = `https://${shopifyDomain}/products/${handle}.json`;

  try {
    const res = await axios.get<{ product: ShopifyProductJson }>(url, {
      timeout: 10000,
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    });
    return res.data?.product ?? null;
  } catch {
    return null;
  }
}

/** Upsert a product discovered from an email into the database. */
async function upsertEmailProduct(
  brandKey: string,
  product: ShopifyProductJson,
  signalType: EmailSignal["signalType"],
  productUrl: string
): Promise<void> {
  const brand = BRANDS.find((b) => b.brandKey === brandKey);
  if (!brand) return;

  const category = resolveCategory(product.product_type, product.tags, brand, product.title);
  if (!category) return;

  // Build colorways from variants
  const colorOptionIdx = product.options.findIndex((o) =>
    ["color", "colour"].includes(o.name.toLowerCase())
  );
  const sizeOptionIdx = product.options.findIndex((o) => o.name.toLowerCase() === "size");

  const groups: Record<string, typeof product.variants> = {};
  for (const v of product.variants) {
    const color = colorOptionIdx === 0 ? v.option1 : colorOptionIdx === 1 ? v.option2 : "One Color";
    const key = color || "One Color";
    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  }

  const colorways = Object.entries(groups).map(([colorName, variants]) => {
    const prices = variants.map((v) => parseFloat(v.price));
    const compares = variants
      .map((v) => (v.compare_at_price ? parseFloat(v.compare_at_price) : null))
      .filter((p): p is number => p !== null);
    const minPrice = Math.min(...prices);
    const maxCompare = compares.length > 0 ? Math.max(...compares) : null;
    const onSale = maxCompare !== null && maxCompare > minPrice;
    const getOpt = (v: (typeof variants)[0], idx: number) =>
      idx === 0 ? v.option1 : idx === 1 ? v.option2 : null;
    const sizes = variants.map((v) => ({
      size: getOpt(v, sizeOptionIdx) || v.option1 || "",
      available: v.available,
    }));
    const imageUrl = product.images[0]?.src ?? "";
    return { colorName, colorBucket: extractColorBucket(colorName), imageUrl, price: minPrice, compareAtPrice: maxCompare, onSale, sizes };
  });

  if (colorways.length === 0) return;

  const primary = colorways[0];
  const minPrice = Math.min(...colorways.map((c) => c.price));
  const anyOnSale = colorways.some((c) => c.onSale);
  const maxCompare = Math.max(...colorways.map((c) => c.compareAtPrice ?? 0)) || null;
  const inStock = colorways.some((c) => c.sizes.some((s) => s.available));
  const buckets = [...new Set(colorways.map((c) => c.colorBucket))].join(",");
  const sizeMap = new Map<string, boolean>();
  for (const cw of colorways) {
    for (const sv of cw.sizes) {
      sizeMap.set(sv.size, (sizeMap.get(sv.size) ?? false) || sv.available);
    }
  }
  const allSizes = Array.from(sizeMap.entries()).map(([size, available]) => ({ size, available }));

  const externalId = String(product.id);
  const now = new Date();

  const existing = await prisma.product.findUnique({
    where: { brand_externalId: { brand: brandKey, externalId } },
    select: { firstSeenAt: true, price: true, inStock: true },
  });

  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const firstSeenAt = existing?.firstSeenAt ?? now;
  const isRestocking = !!(existing && !existing.inStock && inStock);
  const priceDroppedAt = existing && minPrice < existing.price ? now : undefined;
  const restockedAt = isRestocking ? now : undefined;

  // Email signal overrides: force the correct flag
  const isNew =
    !isRestocking &&
    (signalType === "new_drop" || firstSeenAt > fourteenDaysAgo);

  const websiteDomain = brand.websiteDomain ?? brand.domain;
  const finalUrl = productUrl.startsWith("https://") ? productUrl : `https://${websiteDomain}/products/${product.handle}`;

  await prisma.product.upsert({
    where: { brand_externalId: { brand: brandKey, externalId } },
    create: {
      externalId,
      brand: brandKey,
      title: product.title,
      handle: product.handle,
      productUrl: finalUrl,
      category,
      colorName: primary.colorName,
      colorBucket: primary.colorBucket,
      imageUrl: primary.imageUrl,
      price: minPrice,
      compareAtPrice: maxCompare,
      onSale: anyOnSale,
      colorways: JSON.stringify(colorways),
      colorBuckets: buckets,
      sizes: JSON.stringify(allSizes),
      inStock,
      isNew,
      firstSeenAt: now,
      lastSeenAt: now,
    },
    update: {
      title: product.title,
      productUrl: finalUrl,
      category,
      colorName: primary.colorName,
      colorBucket: primary.colorBucket,
      imageUrl: primary.imageUrl,
      price: minPrice,
      compareAtPrice: maxCompare,
      onSale: anyOnSale,
      colorways: JSON.stringify(colorways),
      colorBuckets: buckets,
      sizes: JSON.stringify(allSizes),
      inStock,
      isNew,
      lastSeenAt: now,
      ...(priceDroppedAt && { priceDroppedAt }),
      ...(restockedAt && { restockedAt }),
    },
  });

  console.log(`[Email] Upserted ${brandKey} — "${product.title}" (${signalType})`);
}

/** Main entry point: process a batch of emails. */
export async function processEmails(emails: RawEmail[]): Promise<void> {
  console.log(`[Email] Processing ${emails.length} emails...`);

  for (const email of emails) {
    try {
      const signal = await parseEmailWithClaude(email);
      if (!signal) {
        console.log(`[Email] No signal extracted from: ${email.subject}`);
        continue;
      }

      console.log(`[Email] ${signal.brandKey} | ${signal.signalType} | ${signal.products.length} products`);

      let anyProductProcessed = false;

      for (const { title, url: rawUrl } of signal.products) {
        try {
          // If no URL in email, search the brand website
          let url: string | null = rawUrl ?? null;
          if (!url) {
            console.log(`[Email] No URL for "${title}" — searching ${signal.brandKey} website...`);
            url = await searchBrandForProductUrl(signal.brandKey, title);
            if (url) {
              console.log(`[Email] Found URL via search: ${url}`);
            } else {
              console.log(`[Email] Could not find URL for "${title}" — will fall back to full scrape`);
              continue;
            }
          }

          const shopifyProduct = await fetchShopifyProduct(url!, signal.brandKey);
          if (shopifyProduct) {
            await upsertEmailProduct(signal.brandKey, shopifyProduct, signal.signalType, url);
            anyProductProcessed = true;
          } else {
            console.log(`[Email] Could not fetch Shopify data for: ${title} (${url})`);
          }
        } catch (err) {
          console.error(`[Email] Error processing product "${title}":`, err instanceof Error ? err.message : err);
        }
      }

      // If a new_drop email came in but we couldn't find any specific product URLs,
      // run the full brand scraper so we catch any new arrivals the email announced.
      if (!anyProductProcessed && signal.signalType === "new_drop") {
        const brandConfig = BRANDS.find((b) => b.brandKey === signal.brandKey);
        if (brandConfig && brandConfig.scraperType === "shopify") {
          console.log(`[Email] Falling back to full scrape for ${signal.brandKey} after new_drop email...`);
          try {
            await scrapeShopifyBrand(brandConfig);
          } catch (err) {
            console.error(`[Email] Fallback scrape failed for ${signal.brandKey}:`, err instanceof Error ? err.message : err);
          }
        }
      }
    } catch (err) {
      console.error(`[Email] Error processing email "${email.subject}":`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`[Email] Done processing ${emails.length} emails`);
}
