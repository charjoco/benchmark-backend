import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Gated behind the scrape secret (fail closed). These logs leak scrape internals, error
  // strings, and inventory counts — not public data. The admin UI reads scrapeLog via Prisma
  // directly, so it doesn't depend on this route.
  const secret = req.headers.get("x-scrape-secret");
  if (!process.env.SCRAPE_SECRET || secret !== process.env.SCRAPE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const brand = searchParams.get("brand");
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  const logs = await prisma.scrapeLog.findMany({
    where: brand ? { brand } : undefined,
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  return NextResponse.json(logs);
}
