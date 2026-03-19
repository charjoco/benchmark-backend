import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_COLOR: Record<string, string> = {
  success: "#16a34a",
  error: "#dc2626",
  running: "#ca8a04",
};

function timeAgo(date: Date | null): string {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function AdminPage() {
  // Latest run per brand
  const logs = await prisma.scrapeLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 200,
  });

  // Dedupe to latest per brand
  const latestByBrand = new Map<string, typeof logs[0]>();
  for (const log of logs) {
    if (!latestByBrand.has(log.brand)) latestByBrand.set(log.brand, log);
  }

  const brandRows = Array.from(latestByBrand.values()).sort((a, b) =>
    a.brand.localeCompare(b.brand)
  );

  // Product counts per brand
  const counts = await prisma.product.groupBy({
    by: ["brand"],
    _count: { id: true },
    where: { inStock: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.brand, c._count.id]));

  // Recent errors
  const recentErrors = logs.filter((l) => l.status === "error").slice(0, 10);

  return (
    <div style={{ fontFamily: "monospace", padding: "32px", backgroundColor: "#0a0a0a", minHeight: "100vh", color: "#e4e4e7" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px", letterSpacing: "2px" }}>
        BENCHMARK — Scraper Health
      </h1>
      <p style={{ color: "#71717a", marginBottom: "32px", fontSize: "13px" }}>
        Last loaded: {new Date().toISOString()}
      </p>

      {/* Brand health table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "48px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #27272a", textAlign: "left" }}>
            {["Brand", "Status", "Last Run", "Duration", "Found", "Upserted", "In Stock", "Error"].map((h) => (
              <th key={h} style={{ padding: "8px 12px", fontSize: "11px", letterSpacing: "1px", color: "#52525b" }}>
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {brandRows.map((log) => {
            const duration = log.finishedAt
              ? `${Math.round((new Date(log.finishedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)}s`
              : "—";
            const statusColor = STATUS_COLOR[log.status] ?? "#71717a";
            const isStale = log.finishedAt
              ? Date.now() - new Date(log.finishedAt).getTime() > 26 * 60 * 60 * 1000
              : true;

            return (
              <tr key={log.id} style={{ borderBottom: "1px solid #18181b" }}>
                <td style={{ padding: "10px 12px", fontWeight: "bold" }}>{log.brand}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ color: statusColor, fontWeight: "bold" }}>
                    {log.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", color: isStale ? "#f87171" : "#a1a1aa" }}>
                  {timeAgo(log.finishedAt)}
                </td>
                <td style={{ padding: "10px 12px", color: "#71717a" }}>{duration}</td>
                <td style={{ padding: "10px 12px", color: "#a1a1aa" }}>{log.itemsFound ?? "—"}</td>
                <td style={{ padding: "10px 12px", color: "#a1a1aa" }}>{log.itemsUpserted ?? "—"}</td>
                <td style={{ padding: "10px 12px", color: "#a1a1aa" }}>{countMap[log.brand] ?? 0}</td>
                <td style={{ padding: "10px 12px", color: "#ef4444", fontSize: "11px", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.errorMessage ?? ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Recent errors */}
      {recentErrors.length > 0 && (
        <>
          <h2 style={{ fontSize: "14px", letterSpacing: "1.5px", color: "#ef4444", marginBottom: "12px" }}>
            RECENT ERRORS
          </h2>
          {recentErrors.map((log) => (
            <div key={log.id} style={{ backgroundColor: "#1c0a0a", border: "1px solid #3f1010", borderRadius: "6px", padding: "12px 16px", marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontWeight: "bold" }}>{log.brand}</span>
                <span style={{ color: "#71717a", fontSize: "12px" }}>{timeAgo(log.startedAt)}</span>
              </div>
              <div style={{ color: "#fca5a5", fontSize: "12px", whiteSpace: "pre-wrap" }}>
                {log.errorMessage}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Trigger scrape */}
      <div style={{ marginTop: "48px", padding: "16px", backgroundColor: "#111113", borderRadius: "8px", border: "1px solid #27272a" }}>
        <p style={{ color: "#71717a", fontSize: "12px", marginBottom: "8px" }}>MANUAL TRIGGER</p>
        <code style={{ color: "#a1a1aa", fontSize: "12px" }}>
          POST /api/scrape — triggers full scrape<br />
          POST /api/scrape {"{ brand: \"vuori\" }"} — triggers single brand
        </code>
      </div>
    </div>
  );
}
