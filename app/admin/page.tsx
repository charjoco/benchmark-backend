import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getStats() {
  const [
    collectionsTotal,
    collectionsActive,
    articlesTotal,
    articlesActive,
    scrapeErrorCount,
    brandCount,
    latestLogs,
  ] = await Promise.all([
    prisma.collection.count(),
    prisma.collection.count({ where: { isActive: true } }),
    prisma.article.count(),
    prisma.article.count({ where: { isActive: true } }),
    prisma.scrapeLog.count({
      where: {
        status: "error",
        startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.scrapeLog.groupBy({ by: ["brand"], orderBy: { brand: "asc" } }).then(
      (r) => r.length
    ),
    prisma.scrapeLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 200,
      select: { brand: true, status: true, finishedAt: true },
    }),
  ]);

  // Stale brands = brands whose last successful run is >26h ago
  const latestByBrand = new Map<string, (typeof latestLogs)[0]>();
  for (const log of latestLogs) {
    if (!latestByBrand.has(log.brand)) latestByBrand.set(log.brand, log);
  }
  const staleBrands = Array.from(latestByBrand.values()).filter((log) => {
    if (!log.finishedAt) return true;
    return Date.now() - new Date(log.finishedAt).getTime() > 26 * 60 * 60 * 1000;
  }).length;

  return { collectionsTotal, collectionsActive, articlesTotal, articlesActive, scrapeErrorCount, brandCount, staleBrands };
}

export default async function AdminPage() {
  const { collectionsTotal, collectionsActive, articlesTotal, articlesActive, scrapeErrorCount, staleBrands } =
    await getStats();

  const scrapeAlert = scrapeErrorCount > 0 || staleBrands > 0;

  const tiles = [
    {
      href: "/admin/collections",
      label: "COLLECTIONS",
      value: collectionsActive,
      sub: `${collectionsTotal} total`,
      note: collectionsActive < 5 ? `${5 - collectionsActive} slots available` : "All slots filled",
      alert: false,
    },
    {
      href: "/admin/scrape-logs",
      label: "SCRAPER HEALTH",
      value: scrapeErrorCount,
      sub: staleBrands > 0 ? `${staleBrands} stale brands` : "All brands current",
      note: "Last 24h errors",
      alert: scrapeAlert,
    },
    {
      href: "/admin/articles",
      label: "EDITORIAL",
      value: articlesActive,
      sub: `${articlesTotal} total`,
      note: articlesActive === 0 ? "No active articles" : `${articlesActive} visible in app`,
      alert: false,
    },
    {
      href: "/admin/queue",
      label: "RETRY QUEUE",
      value: "—",
      sub: "Coming soon",
      note: "Products awaiting classification",
      alert: false,
      disabled: true,
    },
  ];

  return (
    <div
      style={{
        fontFamily: "monospace",
        padding: "40px 32px",
        backgroundColor: "#0a0a0a",
        minHeight: "100vh",
        color: "#e4e4e7",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: "bold",
            letterSpacing: 3,
            color: "#f4f4f5",
            margin: 0,
          }}
        >
          BENCHMARK
        </h1>
        <p style={{ color: "#52525b", fontSize: 12, marginTop: 6, marginBottom: 0 }}>
          Admin · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Four tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          maxWidth: 720,
        }}
      >
        {tiles.map((tile) => (
          <a
            key={tile.label}
            href={tile.disabled ? undefined : tile.href}
            style={{
              textDecoration: "none",
              color: "inherit",
              cursor: tile.disabled ? "default" : "pointer",
              opacity: tile.disabled ? 0.5 : 1,
            }}
          >
            <div
              style={{
                backgroundColor: "#111113",
                border: `1px solid ${tile.alert ? "#3f1010" : "#1c1c1e"}`,
                borderRadius: 8,
                padding: "24px",
                transition: "background 0.1s",
              }}
            >
              {/* Label */}
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  color: tile.alert ? "#f87171" : "#52525b",
                  margin: "0 0 12px",
                }}
              >
                {tile.label}
              </p>

              {/* Big number */}
              <p
                style={{
                  fontSize: 40,
                  fontWeight: "bold",
                  color: tile.alert
                    ? "#f87171"
                    : typeof tile.value === "number" && tile.value > 0
                    ? "#f4f4f5"
                    : "#71717a",
                  margin: "0 0 6px",
                  lineHeight: 1,
                }}
              >
                {tile.value}
              </p>

              {/* Sub */}
              <p style={{ fontSize: 12, color: "#71717a", margin: "0 0 4px" }}>{tile.sub}</p>

              {/* Note */}
              <p style={{ fontSize: 10, color: "#3f3f46", margin: 0 }}>{tile.note}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Quick links */}
      <div style={{ marginTop: 48, display: "flex", gap: 16 }}>
        <a
          href="/admin/collections"
          style={{ fontSize: 12, color: "#52525b", textDecoration: "none" }}
        >
          Collections →
        </a>
        <a
          href="/admin/articles"
          style={{ fontSize: 12, color: "#52525b", textDecoration: "none" }}
        >
          Editorial →
        </a>
        <a
          href="/admin/scrape-logs"
          style={{ fontSize: 12, color: "#52525b", textDecoration: "none" }}
        >
          Scrape Logs →
        </a>
      </div>
    </div>
  );
}
