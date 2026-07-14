"use client";

import { C, FONT_SANS } from "./theme";
import type { EditorProduct } from "./editor";

// Shared, image-dominant product card used by BOTH the finder grid and the collection
// grid so the collection previews exactly the way it will render. ~3:4 image, compact
// caption (title / brand · price), and a badge slot for state (in-collection / HERO / +ADD).

export function ProductTile({
  product,
  variant, // "finder" | "collection"
  inCollection = false,
  isHero = false,
  isAdding = false,
  onAdd,
  onRemove,
  onSetHero,
  dragHandleProps,
  isDragging = false,
}: {
  product: EditorProduct;
  variant: "finder" | "collection";
  inCollection?: boolean;
  isHero?: boolean;
  isAdding?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  onSetHero?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  isDragging?: boolean;
}) {
  const heroClickable = variant === "collection" && onSetHero;

  return (
    <div
      style={{
        position: "relative",
        backgroundColor: C.card,
        border: `1px solid ${isHero ? C.gold : C.border}`,
        borderRadius: 8,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        opacity: isDragging ? 0.4 : variant === "finder" && inCollection ? 0.55 : 1,
        transition: "border-color 120ms, opacity 120ms",
        fontFamily: FONT_SANS,
      }}
    >
      {/* Image — dominant. In the collection, clicking it sets HERO. */}
      <button
        type="button"
        onClick={heroClickable ? onSetHero : undefined}
        title={heroClickable ? (isHero ? "Current hero" : "Click to set as hero") : undefined}
        style={{
          all: "unset",
          display: "block",
          position: "relative",
          width: "100%",
          aspectRatio: "3 / 4",
          backgroundColor: C.raised,
          cursor: heroClickable ? "pointer" : "default",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.title}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />

        {/* HERO badge (gold — allowed) */}
        {isHero && (
          <span
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              backgroundColor: C.gold,
              color: C.goldText,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1,
              padding: "3px 7px",
              borderRadius: 4,
            }}
          >
            HERO
          </span>
        )}

        {/* in-collection check (finder only) — subtle, NOT gold */}
        {variant === "finder" && inCollection && (
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: "rgba(9,9,11,0.85)",
              color: C.text2,
              fontSize: 10,
              fontWeight: 700,
              width: 20,
              height: 20,
              borderRadius: 99,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${C.borderStrong}`,
            }}
          >
            ✓
          </span>
        )}

        {/* hero hint on hover for non-hero collection tiles */}
        {heroClickable && !isHero && (
          <span
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              backgroundColor: "rgba(9,9,11,0.8)",
              color: C.text2,
              fontSize: 8,
              letterSpacing: 1,
              padding: "3px 6px",
              borderRadius: 4,
            }}
          >
            SET HERO
          </span>
        )}
      </button>

      {/* Caption */}
      <div style={{ padding: "8px 9px 9px", display: "flex", flexDirection: "column", gap: 2 }}>
        <div
          style={{
            fontSize: 11.5,
            color: C.text,
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {product.title}
        </div>
        <div style={{ fontSize: 10, color: C.faint, display: "flex", justifyContent: "space-between", gap: 6 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {product.brand}
          </span>
          <span style={{ color: C.text2, flexShrink: 0 }}>${product.price.toFixed(0)}</span>
        </div>
      </div>

      {/* Action row */}
      <div style={{ display: "flex", borderTop: `1px solid ${C.border}` }}>
        {variant === "finder" ? (
          <>
            {/* +ADD — the primary CTA (gold — allowed) */}
            <button
              type="button"
              onClick={onAdd}
              disabled={inCollection || isAdding}
              style={{
                flex: 1,
                padding: "7px 0",
                border: "none",
                backgroundColor: inCollection ? "transparent" : C.gold,
                color: inCollection ? C.faint : C.goldText,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                fontFamily: FONT_SANS,
                cursor: inCollection ? "default" : isAdding ? "wait" : "pointer",
              }}
            >
              {inCollection ? "ADDED" : isAdding ? "…" : "+ ADD"}
            </button>
            {/* drag affordance */}
            <span
              {...dragHandleProps}
              title="Drag into collection"
              style={{
                padding: "7px 9px",
                color: C.faintest,
                fontSize: 12,
                cursor: "grab",
                borderLeft: `1px solid ${C.border}`,
                touchAction: "none",
              }}
            >
              ⠿
            </span>
          </>
        ) : (
          <>
            <span
              {...dragHandleProps}
              title="Drag to reorder"
              style={{
                flex: 1,
                padding: "7px 0",
                textAlign: "center",
                color: C.faintest,
                fontSize: 12,
                cursor: "grab",
                touchAction: "none",
              }}
            >
              ⠿
            </span>
            <button
              type="button"
              onClick={onRemove}
              title="Remove from collection"
              style={{
                padding: "7px 12px",
                border: "none",
                borderLeft: `1px solid ${C.border}`,
                backgroundColor: "transparent",
                color: C.muted,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: FONT_SANS,
              }}
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Skeleton tile shown while the finder API loads — grids look broken without one.
export function SkeletonTile() {
  return (
    <div
      style={{
        backgroundColor: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div style={{ width: "100%", aspectRatio: "3 / 4", backgroundColor: C.raised }} />
      <div style={{ padding: "8px 9px 9px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ height: 9, width: "85%", backgroundColor: C.raised, borderRadius: 3 }} />
        <div style={{ height: 8, width: "55%", backgroundColor: C.raised, borderRadius: 3 }} />
      </div>
    </div>
  );
}
