import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import type { AppCategory, VisionResult } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_CATEGORIES = new Set<AppCategory>([
  "jackets", "zips", "longsleeve", "polos", "shirts",
  "hoodies", "sweaters", "shorts", "pants",
]);

/**
 * Uses Claude vision to classify a product image into an AppCategory.
 * Called as a fallback when rule-based categorization returns null.
 *
 * Returns a typed VisionResult:
 *   { category }                              — success
 *   { category: null, reason: "inconclusive" } — Claude responded but result wasn't usable
 *   { category: null, reason: "error" }        — transient failure (network, API down, etc.)
 *
 * Only "inconclusive" results should set the visionFailed flag on the product.
 * "error" results should retry next scrape without marking the product.
 */
export async function classifyCategoryViaVision(
  imageUrl: string,
  title: string,
  productType: string,
): Promise<VisionResult> {
  if (!imageUrl) {
    return { category: null, reason: "inconclusive", detail: "no image URL" };
  }

  try {
    const imgRes = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: "arraybuffer",
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const contentType = (imgRes.headers["content-type"] as string) || "image/jpeg";
    const base64 = Buffer.from(imgRes.data).toString("base64");

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 20,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: contentType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: base64 },
            },
            {
              type: "text",
              text: `This is a men's clothing product. Title: "${title}". Product type: "${productType}". Classify into exactly one category from this list: jackets, zips, longsleeve, polos, shirts, hoodies, sweaters, shorts, pants. Reply with only the single category word.`,
            },
          ],
        },
      ],
    });

    const raw = response.content[0].type === "text"
      ? response.content[0].text.trim().toLowerCase()
      : "";

    if (!raw) {
      return { category: null, reason: "inconclusive", detail: "unparseable: (empty response)" };
    }

    if (VALID_CATEGORIES.has(raw as AppCategory)) {
      return { category: raw as AppCategory };
    }

    return {
      category: null,
      reason: "inconclusive",
      detail: `category-not-in-enum: ${raw.slice(0, 50)}`,
    };
  } catch (err) {
    console.warn(`[Vision] Category classification failed for "${title}":`, err instanceof Error ? err.message : err);
    return { category: null, reason: "error" };
  }
}

/**
 * Uses Claude vision to check if a product image shows a woman modeling the clothing.
 * Returns true if a woman is detected — product should be excluded.
 * Only called for new products (not on re-scrapes of existing ones).
 */
export async function isWomensProductImage(imageUrl: string): Promise<boolean> {
  if (!imageUrl) return false;

  try {
    // Fetch image as base64 (Anthropic vision requires base64 or data URL)
    const imgRes = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: "arraybuffer",
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const contentType = (imgRes.headers["content-type"] as string) || "image/jpeg";
    const base64 = Buffer.from(imgRes.data).toString("base64");

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: contentType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: base64 },
            },
            {
              type: "text",
              text: "Does this image show a woman (female person) wearing or modeling clothing? Answer only: yes or no.",
            },
          ],
        },
      ],
    });

    const answer = response.content[0].type === "text"
      ? response.content[0].text.trim().toLowerCase()
      : "";

    return answer.startsWith("yes");
  } catch (err) {
    // If vision check fails, allow the product through — don't block on errors
    console.warn(`[Vision] Check failed for ${imageUrl}:`, err instanceof Error ? err.message : err);
    return false;
  }
}
