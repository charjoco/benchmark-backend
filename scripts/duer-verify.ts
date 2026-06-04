import { prisma } from "@/lib/prisma";

interface Colorway {
  colorName: string;
  appColor?: string;
}

async function main() {
  const products = await prisma.product.findMany({
    where: { brand: "duer" },
    select: { title: true, category: true, colorName: true, availableColors: true, colorways: true, inStock: true },
    orderBy: { title: "asc" },
  });

  console.log("DUER products in DB:", products.length);

  const nonDenim = products.filter((p) => p.category !== "denim");
  console.log("Non-denim (should be 0):", nonDenim.length);

  const noColor = products.filter((p) => !p.availableColors);
  console.log("No availableColors (should be 0):", noColor.length);

  console.log("\n── All products ──────────────────────────────────────");
  products.forEach((p) => {
    const cws = JSON.parse(p.colorways as string) as Colorway[];
    const appColors = cws.map((c) => c.appColor).join(", ");
    console.log(`${p.title}`);
    console.log(`  cat=${p.category} | color=${p.colorName} | avail=${p.availableColors} | cwAppColor=[${appColors}]`);
  });

  const dist: Record<string, number> = {};
  products.forEach((p) => {
    (p.availableColors || "").split(",").filter(Boolean).forEach((c) => { dist[c] = (dist[c] || 0) + 1; });
  });
  console.log("\n── AppColor distribution ─────────────────────────────");
  Object.entries(dist).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

  console.log("\n── Spot-checks ───────────────────────────────────────");
  const check = (label: string, pass: boolean) => console.log(`${pass ? "PASS ✓" : "FAIL ✗"} ${label}`);

  const athleticHR = products.find((p) => p.title.includes("Athletic Straight") && p.colorName === "Heritage Rinse");
  check("Athletic Straight Heritage Rinse → navy", athleticHR?.availableColors === "navy");

  const vortex = products.find((p) => p.colorName === "Vortex");
  check("Vortex → grey", vortex?.availableColors === "grey");

  const breeze = products.find((p) => p.colorName === "Breeze");
  check("Breeze → blue", breeze?.availableColors === "blue");

  const noSweat = await prisma.product.findFirst({ where: { brand: "duer", title: { contains: "No Sweat" } } });
  check("No Sweat Pant absent", noSweat === null);

  const denimShort = await prisma.product.findFirst({ where: { brand: "duer", title: { contains: "Denim Short" } } });
  check("Performance Denim Short absent", denimShort === null);

  const harbourPant = await prisma.product.findFirst({ where: { brand: "duer", title: { contains: "Harbour" } } });
  check("Harbour Pant (women's) absent", harbourPant === null);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
