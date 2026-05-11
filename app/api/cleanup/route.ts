import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isWomensProductImage } from "@/lib/normalize/vision";

export const dynamic = "force-dynamic";

const WOMENS_TITLE_KEYWORDS = [
  "dress", "skort", "skirt", "romper", "jumpsuit", "legging",
  "sports bra", "crop top", "bikini", "thong", "women's", "womens",
];

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 50;

/**
 * POST /api/cleanup
 * Requires x-scrape-secret header.
 * Query params:
 *   confirm=true   — required to proceed (omit to get a dry-run count with no side effects)
 *   dryRun=true    — run selection logic and report without calling Anthropic or deleting
 *   limit=N        — max products to vision-scan (default 50, max 500)
 * Body (JSON, optional):
 *   brand          — limit to one brand
 *   visionScan     — false to skip the vision pass (default true)
 */
export async function POST(req: NextRequest) {
  // Explicit auth — belt and suspenders; /api/cleanup is outside the middleware matcher
  const secret = req.headers.get("x-scrape-secret");
  if (!process.env.SCRAPE_SECRET || secret !== process.env.SCRAPE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const confirm = searchParams.get("confirm") === "true";
  const dryRun = searchParams.get("dryRun") === "true";
  const limitParam = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT));
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? DEFAULT_LIMIT : limitParam), MAX_LIMIT);

  let brand: string | null = null;
  let visionScan = true;
  try {
    const body = await req.json();
    brand = body?.brand ?? null;
    if (body?.visionScan === false) visionScan = false;
  } catch { /* no body */ }

  // Without confirm or dryRun, return a preview of impact and refuse to proceed
  if (!confirm && !dryRun) {
    const totalProducts = await prisma.product.count({
      where: brand ? { brand } : undefined,
    });
    return NextResponse.json(
      {
        error: "confirm=true required",
        message: `Would scan up to ${Math.min(totalProducts, limit)} of ${totalProducts} products${brand ? ` for brand "${brand}"` : " across all brands"}. Add ?confirm=true to proceed, or ?dryRun=true to simulate.`,
        totalProducts,
        limit,
        visionScan,
      },
      { status: 400 }
    );
  }

  runCleanup(brand, visionScan, limit, dryRun).catch(console.error);

  return NextResponse.json({
    message: dryRun
      ? `Dry run started${brand ? ` for brand: ${brand}` : " for all brands"}`
      : `Cleanup started${brand ? ` for brand: ${brand}` : " for all brands"}`,
    limit,
    dryRun,
    visionScan,
  });
}

async function runCleanup(
  brand: string | null,
  visionScan: boolean,
  limit: number,
  dryRun: boolean,
): Promise<void> {
  console.warn(
    `[Cleanup] Starting — brand=${brand ?? "all"} visionScan=${visionScan} limit=${limit} dryRun=${dryRun}`
  );

  const products = await prisma.product.findMany({
    where: brand ? { brand } : undefined,
    select: { id: true, brand: true, title: true, imageUrl: true },
    take: limit,
  });

  console.log(`[Cleanup] ${products.length} products loaded (limit=${limit})`);

  let deleted = 0;

  // Pass 1: fast rule-based title scan (no API cost)
  const remaining: typeof products = [];
  for (const p of products) {
    const titleLower = p.title.toLowerCase();
    const isObviousWomens =
      WOMENS_TITLE_KEYWORDS.some((kw) => titleLower.includes(kw)) ||
      titleLower.startsWith("women");
    if (isObviousWomens) {
      if (!dryRun) {
        await prisma.product.delete({ where: { id: p.id } });
      }
      console.log(`[Cleanup] ${dryRun ? "(dryRun) would delete" : "Rule-deleted"}: "${p.title}" (${p.brand})`);
      deleted++;
    } else {
      remaining.push(p);
    }
  }
  console.log(`[Cleanup] Rule pass: ${dryRun ? "would delete" : "deleted"} ${deleted}, ${remaining.length} remaining`);

  // Pass 2: vision scan (if enabled)
  if (visionScan) {
    let visionDeleted = 0;
    for (const p of remaining) {
      try {
        console.warn(`[Cleanup] Vision checking "${p.title}" (${p.brand})`);
        if (dryRun) {
          console.log(`[Cleanup] (dryRun) skipping actual vision call for "${p.title}"`);
          continue;
        }
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

  console.log(`[Cleanup] Done. Total ${dryRun ? "would-delete" : "deleted"}: ${deleted} of ${products.length} scanned.`);
}
