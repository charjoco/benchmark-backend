import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isWomensProductImage } from "@/lib/normalize/vision";

export const dynamic = "force-dynamic";

// Title keywords that unambiguously identify women's products (checked case-insensitive)
const WOMENS_TITLE_KEYWORDS = [
  "dress", "skort", "skirt", "romper", "jumpsuit", "legging",
  "sports bra", "crop top", "bikini", "thong", "women's", "womens",
];

/**
 * POST /api/cleanup
 * First does a fast rule-based pass to delete obvious women's products by title,
 * then optionally runs Claude vision on remaining products.
 * Pass { brand } to limit to one brand, { visionScan: false } to skip vision.
 * Runs in background — returns immediately with a started message.
 */
export async function POST(req: NextRequest) {
  let brand: string | null = null;
  let visionScan = true;
  try {
    const body = await req.json();
    brand = body?.brand ?? null;
    if (body?.visionScan === false) visionScan = false;
  } catch { /* no body */ }

  // Run async — don't block the response
  runCleanup(brand, visionScan).catch(console.error);

  return NextResponse.json({
    message: brand
      ? `Cleanup started for brand: ${brand}`
      : "Cleanup started for all brands",
  });
}

async function runCleanup(brand: string | null, visionScan: boolean): Promise<void> {
  console.log(`[Cleanup] Starting cleanup${brand ? ` for ${brand}` : " for all brands"}...`);

  const products = await prisma.product.findMany({
    where: brand ? { brand } : undefined,
    select: { id: true, brand: true, title: true, imageUrl: true },
  });

  console.log(`[Cleanup] ${products.length} products to check`);

  let deleted = 0;

  // Pass 1: fast rule-based title scan (no API cost)
  const remaining: typeof products = [];
  for (const p of products) {
    const titleLower = p.title.toLowerCase();
    const isObviousWomens =
      WOMENS_TITLE_KEYWORDS.some((kw) => titleLower.includes(kw)) ||
      titleLower.startsWith("women");
    if (isObviousWomens) {
      await prisma.product.delete({ where: { id: p.id } });
      console.log(`[Cleanup] Rule-deleted: "${p.title}" (${p.brand})`);
      deleted++;
    } else {
      remaining.push(p);
    }
  }
  console.log(`[Cleanup] Rule pass: deleted ${deleted}, ${remaining.length} remaining`);

  // Pass 2: vision scan on remaining products (if enabled)
  if (visionScan) {
    let visionDeleted = 0;
    for (const p of remaining) {
      try {
        const isWomens = await isWomensProductImage(p.imageUrl);
        if (isWomens) {
          await prisma.product.delete({ where: { id: p.id } });
          console.log(`[Cleanup] Vision-deleted: "${p.title}" (${p.brand})`);
          visionDeleted++;
        }
      } catch (err) {
        console.error(`[Cleanup] Error checking "${p.title}":`, err instanceof Error ? err.message : err);
      }
    }
    deleted += visionDeleted;
    console.log(`[Cleanup] Vision pass: deleted ${visionDeleted}`);
  }

  console.log(`[Cleanup] Done. Total deleted: ${deleted} out of ${products.length} scanned.`);
}
