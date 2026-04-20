"use client";

import type { EditorCollection } from "./editor";

export function PreviewModal({
  collection,
  onClose,
}: {
  collection: EditorCollection;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 390,
          maxHeight: "90vh",
          backgroundColor: "#0a0a0a",
          borderRadius: 12,
          border: "1px solid #27272a",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid #1c1c1e",
            flexShrink: 0,
          }}
        >
          <div>
            <p style={{ fontSize: 11, letterSpacing: 1, color: "#52525b", margin: "0 0 2px" }}>
              PREVIEW
            </p>
            <p style={{ fontSize: 14, color: "#f4f4f5", margin: 0, fontWeight: "bold" }}>
              {collection.name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #27272a",
              borderRadius: 4,
              padding: "4px 10px",
              color: "#71717a",
              fontSize: 12,
              fontFamily: "monospace",
              cursor: "pointer",
            }}
          >
            CLOSE
          </button>
        </div>

        {/* Hero image */}
        {collection.heroProduct && (
          <div
            style={{
              width: "100%",
              height: 220,
              overflow: "hidden",
              flexShrink: 0,
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={collection.heroProduct.imageUrl}
              alt={collection.heroProduct.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(10,10,10,0.7) 0%, transparent 60%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 16,
                left: 16,
                right: 16,
              }}
            >
              <p
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: "#f4f4f5",
                  margin: "0 0 4px",
                  letterSpacing: 1,
                }}
              >
                {collection.name}
              </p>
              {collection.description && (
                <p style={{ fontSize: 12, color: "#a1a1aa", margin: 0 }}>
                  {collection.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* No hero fallback */}
        {!collection.heroProduct && (
          <div
            style={{
              padding: "16px",
              flexShrink: 0,
              borderBottom: "1px solid #1c1c1e",
            }}
          >
            {collection.description && (
              <p style={{ fontSize: 13, color: "#a1a1aa", margin: 0 }}>
                {collection.description}
              </p>
            )}
          </div>
        )}

        {/* Product list */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {collection.products.length === 0 ? (
            <div
              style={{
                padding: "40px 16px",
                textAlign: "center",
                color: "#3f3f46",
                fontSize: 13,
              }}
            >
              No products in this collection
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1,
                backgroundColor: "#1c1c1e",
              }}
            >
              {collection.products.map((cp) => (
                <div
                  key={cp.productId}
                  style={{
                    backgroundColor: "#0a0a0a",
                    padding: 12,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cp.product.imageUrl}
                    alt={cp.product.title}
                    style={{
                      width: "100%",
                      aspectRatio: "3/4",
                      objectFit: "cover",
                      borderRadius: 6,
                      display: "block",
                      marginBottom: 8,
                    }}
                  />
                  <p
                    style={{
                      fontSize: 11,
                      color: "#f4f4f5",
                      margin: "0 0 2px",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {cp.product.title}
                  </p>
                  <p style={{ fontSize: 11, color: "#71717a", margin: 0 }}>
                    ${cp.product.price.toFixed(0)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
