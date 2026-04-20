import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CollectionDeepLinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const collection = await prisma.collection.findUnique({
    where: { slug, isActive: true },
    select: { name: true, description: true },
  });

  if (!collection) notFound();

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        backgroundColor: "#0a0a0a",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#e4e4e7",
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: 11,
          letterSpacing: 3,
          color: "#52525b",
          marginBottom: 16,
          textTransform: "uppercase",
        }}
      >
        Benchmark Collection
      </p>
      <h1
        style={{
          fontSize: 28,
          fontWeight: "bold",
          color: "#f4f4f5",
          marginBottom: 12,
          letterSpacing: 1,
        }}
      >
        {collection.name}
      </h1>
      {collection.description && (
        <p
          style={{
            fontSize: 15,
            color: "#a1a1aa",
            maxWidth: 400,
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          {collection.description}
        </p>
      )}
      <p style={{ fontSize: 14, color: "#71717a", marginBottom: 32 }}>
        View this collection in the Benchmark iOS app.
      </p>
      <a
        href="https://apps.apple.com/app/benchmark"
        style={{
          display: "inline-block",
          backgroundColor: "#f4f4f5",
          color: "#09090b",
          textDecoration: "none",
          padding: "12px 28px",
          borderRadius: 6,
          fontSize: 14,
          fontWeight: "bold",
          letterSpacing: 0.5,
        }}
      >
        Open in Benchmark
      </a>
    </div>
  );
}
