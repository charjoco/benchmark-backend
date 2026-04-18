import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCollection } from "./actions";

export const dynamic = "force-dynamic";

/** Maps a Supabase user ID to a display name using the allowlist order.
 *  First ID in ADMIN_ALLOWLIST_IDS = "Jason", second = "Heather". */
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

export default async function CollectionsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const collections = await prisma.collection.findMany({
    orderBy: { lastEditedAt: "desc" },
    include: {
      heroProduct: { select: { imageUrl: true, title: true } },
      _count: { select: { products: true } },
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
            COLLECTIONS
          </h1>
          <p style={{ color: "#52525b", fontSize: 12, marginTop: 4 }}>
            {collections.filter((c) => c.isActive).length} active /{" "}
            {collections.length} total
          </p>
        </div>

        <form action={createCollection}>
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
            + NEW COLLECTION
          </button>
        </form>
      </div>

      {/* List */}
      {collections.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 0",
            color: "#52525b",
            fontSize: 14,
          }}
        >
          No collections yet. Create your first one.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {collections.map((col) => (
            <a
              key={col.id}
              href={`/admin/collections/${col.id}`}
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
                  transition: "background 0.1s",
                }}
              >
                {/* Hero thumbnail */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 4,
                    backgroundColor: "#1c1c1e",
                    flexShrink: 0,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {col.heroProduct ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={col.heroProduct.imageUrl}
                      alt={col.heroProduct.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: 18, color: "#3f3f46" }}>□</span>
                  )}
                </div>

                {/* Name + slug */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: "#f4f4f5",
                      marginBottom: 2,
                    }}
                  >
                    {col.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#52525b" }}>/{col.slug}</div>
                </div>

                {/* Item count */}
                <div style={{ textAlign: "center", minWidth: 48 }}>
                  <div style={{ fontSize: 18, fontWeight: "bold", color: "#a1a1aa" }}>
                    {col._count.products}
                  </div>
                  <div style={{ fontSize: 10, color: "#52525b", letterSpacing: 0.5 }}>
                    {col._count.products === 1 ? "item" : "items"}
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ minWidth: 72, textAlign: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: "bold",
                      letterSpacing: 1,
                      backgroundColor: col.isActive ? "#14532d" : "#27272a",
                      color: col.isActive ? "#4ade80" : "#71717a",
                    }}
                  >
                    {col.isActive ? "ACTIVE" : "DRAFT"}
                  </span>
                </div>

                {/* Last edited */}
                <div style={{ textAlign: "right", minWidth: 140 }}>
                  <div style={{ fontSize: 12, color: "#a1a1aa" }}>
                    {timeAgo(col.lastEditedAt)}
                  </div>
                  <div style={{ fontSize: 11, color: "#52525b" }}>
                    by {displayName(col.lastEditedBy, user?.id ?? null)}
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
