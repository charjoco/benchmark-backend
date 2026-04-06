import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
