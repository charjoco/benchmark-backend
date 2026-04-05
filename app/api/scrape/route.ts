import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url param" }, { status: 400 });

  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      timeout: 10000,
      validateStatus: () => true,
    });
    const isJson = typeof res.data === "object";
    return NextResponse.json({
      status: res.status,
      isJson,
      productCount: isJson ? res.data?.products?.length ?? "no products key" : "HTML/non-JSON",
      preview: isJson ? undefined : String(res.data).slice(0, 200),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) });
  }
}
