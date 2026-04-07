import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isWomensProductImage } from "@/lib/normalize/vision";

export const dynamic = "force-dynamic";

/**
 * POST /api/cleanup
 * Scans existing products via Claude vision and deletes any showing a woman.
 * Pass optional { brand } to limit to one brand, or run on all.
 * Runs in background — returns immediately with a started message.
 */
export async function POST(req: NextRequest) {
  let brand: string | null = null;
  try {
    const body = await req.json();
    brand = body?.brand ?? null;
  } catch { /* no body */ }

  // Run async — don't block the response
  runCleanup(brand).catch(console.error);

  return NextResponse.json({
    message: brand
      ? `Vision cleanup started for brand: ${brand}`
      : "Vision cleanup started for all brands",
  });
}

async function runCleanup(brand: string | null): Promise<void> {
  console.log(`[Cleanup] Starting vision cleanup${brand ? ` for ${brand}` : " for all brands"}...`);

  const products = await prisma.product.findMany({
    where: brand ? { brand } : undefined,
    select: { id: true, brand: true, title: true, imageUrl: true },
  });

  console.log(`[Cleanup] Scanning ${products.length} products...`);

  let deleted = 0;
  for (const p of products) {
    try {
      const isWomens = await isWomensProductImage(p.imageUrl);
      if (isWomens) {
        await prisma.product.delete({ where: { id: p.id } });
        console.log(`[Cleanup] Deleted women's product: "${p.title}" (${p.brand})`);
        deleted++;
      }
    } catch (err) {
      console.error(`[Cleanup] Error checking "${p.title}":`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`[Cleanup] Done. Deleted ${deleted} women's products out of ${products.length} scanned.`);
}
