import { NextRequest, NextResponse } from "next/server";
import { runAllScrapers, runSingleBrand } from "@/lib/scrapers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-scrape-secret");
  if (process.env.SCRAPE_SECRET && secret !== process.env.SCRAPE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let brand: string | null = null;
  try {
    const body = await req.json();
    brand = body?.brand ?? null;
  } catch {
    // no body is fine
  }

  if (brand) {
    runSingleBrand(brand).catch(console.error);
    return NextResponse.json({ message: `Scrape started for brand: ${brand}` });
  }

  runAllScrapers().catch(console.error);
  return NextResponse.json({ message: "Full scrape started" });
}
