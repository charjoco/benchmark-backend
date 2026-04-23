"use client";

import type { EditorArticle } from "./editor";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function ArticlePreviewModal({
  article,
  onClose,
}: {
  article: EditorArticle;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.85)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      {/* ProseMirror preview styles */}
      <style>{`
        .article-preview-body h2 {
          font-size: 18px;
          font-weight: bold;
          color: #f4f4f5;
          margin: 20px 0 8px;
        }
        .article-preview-body h3 {
          font-size: 15px;
          font-weight: bold;
          color: #e4e4e7;
          margin: 16px 0 6px;
        }
        .article-preview-body p {
          margin: 0 0 12px;
          color: #a1a1aa;
          line-height: 1.7;
          font-size: 14px;
        }
        .article-preview-body ul,
        .article-preview-body ol {
          padding-left: 20px;
          margin: 0 0 12px;
          color: #a1a1aa;
          font-size: 14px;
          line-height: 1.7;
        }
        .article-preview-body li { margin-bottom: 4px; }
        .article-preview-body blockquote {
          border-left: 3px solid #3f3f46;
          margin: 0 0 12px;
          padding: 4px 0 4px 14px;
          color: #71717a;
          font-style: italic;
          font-size: 14px;
        }
        .article-preview-body hr {
          border: none;
          border-top: 1px solid #27272a;
          margin: 20px 0;
        }
        .article-preview-body a {
          color: #a1a1aa;
          text-decoration: underline;
        }
        .article-preview-body strong { color: #f4f4f5; }
      `}</style>

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
            <p style={{ fontSize: 10, letterSpacing: 1, color: "#52525b", margin: "0 0 2px" }}>
              PREVIEW
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#f4f4f5",
                margin: 0,
                fontWeight: "bold",
                maxWidth: 260,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {article.title || "Untitled Article"}
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

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 16px" }}>
          {/* Title */}
          <h1
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: "#f4f4f5",
              margin: "0 0 8px",
              lineHeight: 1.25,
            }}
          >
            {article.title || "Untitled Article"}
          </h1>

          {/* Subtitle */}
          {article.subtitle && (
            <p
              style={{
                fontSize: 15,
                color: "#71717a",
                margin: "0 0 10px",
                lineHeight: 1.4,
              }}
            >
              {article.subtitle}
            </p>
          )}

          {/* Published date */}
          {article.publishedAt && (
            <p
              style={{
                fontSize: 11,
                color: "#52525b",
                margin: "0 0 20px",
                letterSpacing: 0.5,
              }}
            >
              {formatDate(article.publishedAt)}
            </p>
          )}

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: "#1c1c1e", marginBottom: 20 }} />

          {/* Body */}
          {article.body && article.body !== "<p></p>" ? (
            <div
              className="article-preview-body"
              dangerouslySetInnerHTML={{ __html: article.body }}
              style={{ marginBottom: 24 }}
            />
          ) : (
            <p style={{ fontSize: 13, color: "#3f3f46", marginBottom: 24 }}>
              No body content yet.
            </p>
          )}

          {/* Images */}
          {article.images.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              {article.images.map((img, i) => (
                <div key={img.id} style={{ marginBottom: 12 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.imageUrl}
                    alt={img.altText ?? `Image ${i + 1}`}
                    style={{
                      width: "100%",
                      borderRadius: 6,
                      display: "block",
                    }}
                  />
                  {img.altText && (
                    <p
                      style={{
                        fontSize: 11,
                        color: "#52525b",
                        margin: "6px 0 0",
                        textAlign: "center",
                      }}
                    >
                      {img.altText}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Relevant products */}
          {article.products.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  color: "#52525b",
                  margin: "0 0 12px",
                }}
              >
                RELEVANT PRODUCTS
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {article.products.map((ap) => (
                  <div
                    key={ap.productId}
                    style={{
                      backgroundColor: "#111113",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ap.product.imageUrl}
                      alt={ap.product.title}
                      style={{
                        width: "100%",
                        aspectRatio: "3/4",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <div style={{ padding: "8px 10px" }}>
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
                        {ap.product.title}
                      </p>
                      <p style={{ fontSize: 10, color: "#71717a", margin: 0 }}>
                        {ap.product.brand} · ${ap.product.price.toFixed(0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
