import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createArticle } from "./actions";

export const dynamic = "force-dynamic";

function displayName(userId: string | null, currentUserId: string | null): string {
  if (!userId) return "—";
  if (userId === currentUserId) return "you";
  const allowlist = (process.env.ADMIN_ALLOWLIST_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const names = ["Jason", "Heather"];
  const idx = allowlist.indexOf(userId);
  return idx >= 0 ? (names[idx] ?? `user ${idx + 1}`) : userId.slice(0, 8);
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ArticlesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const articles = await prisma.article.findMany({
    orderBy: { lastEditedAt: "desc" },
    include: {
      _count: { select: { images: true, products: true } },
    },
  });

  return (
    <div
      style={{
        fontFamily: "monospace",
        padding: "32px",
        backgroundColor: "#0a0a0a",
        minHeight: "100vh",
        color: "#e4e4e7",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "32px",
        }}
      >
        <div>
          <a
            href="/admin"
            style={{ color: "#52525b", fontSize: 12, textDecoration: "none" }}
          >
            ← Admin
          </a>
          <h1
            style={{
              fontSize: 20,
              fontWeight: "bold",
              letterSpacing: 2,
              color: "#f4f4f5",
              marginTop: 8,
              marginBottom: 0,
            }}
          >
            EDITORIAL
          </h1>
          <p style={{ color: "#52525b", fontSize: 12, marginTop: 4 }}>
            {articles.filter((a) => a.isActive).length} active /{" "}
            {articles.length} total
          </p>
        </div>

        <form action={createArticle}>
          <button
            type="submit"
            style={{
              backgroundColor: "#f4f4f5",
              color: "#09090b",
              border: "none",
              borderRadius: 4,
              padding: "10px 20px",
              fontSize: 12,
              fontFamily: "monospace",
              fontWeight: "bold",
              letterSpacing: 1,
              cursor: "pointer",
            }}
          >
            + NEW ARTICLE
          </button>
        </form>
      </div>

      {/* List */}
      {articles.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 0",
            color: "#52525b",
            fontSize: 14,
          }}
        >
          No articles yet. Create your first one.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {articles.map((article) => (
            <a
              key={article.id}
              href={`/admin/articles/${article.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 16px",
                  backgroundColor: "#111113",
                  borderRadius: 6,
                }}
              >
                {/* Status pill */}
                <div style={{ minWidth: 72, textAlign: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: "bold",
                      letterSpacing: 1,
                      backgroundColor: article.isActive ? "#14532d" : "#27272a",
                      color: article.isActive ? "#4ade80" : "#71717a",
                    }}
                  >
                    {article.isActive ? "ACTIVE" : "DRAFT"}
                  </span>
                </div>

                {/* Title + subtitle */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: "#f4f4f5",
                      marginBottom: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {article.title}
                  </div>
                  {article.subtitle && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#71717a",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {article.subtitle}
                    </div>
                  )}
                </div>

                {/* Published date */}
                <div style={{ minWidth: 100, textAlign: "center" }}>
                  {article.publishedAt ? (
                    <span style={{ fontSize: 11, color: "#a1a1aa" }}>
                      {formatDate(article.publishedAt)}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: "#3f3f46" }}>Draft</span>
                  )}
                </div>

                {/* Counts */}
                <div style={{ minWidth: 80, textAlign: "center" }}>
                  <span style={{ fontSize: 11, color: "#52525b" }}>
                    {article._count.images} img · {article._count.products} prod
                  </span>
                </div>

                {/* Last edited */}
                <div style={{ textAlign: "right", minWidth: 140 }}>
                  <div style={{ fontSize: 12, color: "#a1a1aa" }}>
                    {timeAgo(article.lastEditedAt)}
                  </div>
                  <div style={{ fontSize: 11, color: "#52525b" }}>
                    by {displayName(article.lastEditedBy, user?.id ?? null)}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
