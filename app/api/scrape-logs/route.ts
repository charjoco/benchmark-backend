import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
