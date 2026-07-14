"use client";

import { useState } from "react";
import { SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { removeProductFromCollection, setCollectionHero } from "../actions";
import { ProductTile } from "./product-tile";
import { C, FONT_SANS } from "./theme";
import type { EditorCollectionProduct, EditorCollection } from "./editor";

// ── Sortable collection tile (grid) ───────────────────────────────────────────
// Reorder is handled by the single DndContext lifted to editor.tsx (so finder tiles
// can be dragged in). This component only renders the SortableContext + droppable grid.

function SortableTile({
  cp,
  isHero,
  collectionId,
  onRemove,
  onSetHero,
}: {
  cp: EditorCollectionProduct;
  isHero: boolean;
  collectionId: string;
  onRemove: (productId: string) => void;
  onSetHero: (productId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cp.productId,
    data: { type: "collection", product: cp.product },
  });
  const [busy, setBusy] = useState(false);

  async function handleRemove() {
    setBusy(true);
    await removeProductFromCollection(collectionId, cp.productId);
    onRemove(cp.productId);
  }
  async function handleSetHero() {
    if (isHero) return;
    setBusy(true);
    await setCollectionHero(collectionId, cp.productId);
    onSetHero(cp.productId);
    setBusy(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: busy ? 0.5 : 1 }}
    >
      <ProductTile
        product={cp.product}
        variant="collection"
        isHero={isHero}
        isDragging={isDragging}
        onRemove={handleRemove}
        onSetHero={handleSetHero}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function CollectionContents({
  collection,
  onUpdate,
}: {
  collection: EditorCollection;
  onUpdate: (patch: Partial<EditorCollection>) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "collection-drop" });

  function handleRemove(productId: string) {
    onUpdate({
      products: collection.products
        .filter((cp) => cp.productId !== productId)
        .map((cp, i) => ({ ...cp, position: i })),
      ...(collection.heroProductId === productId && { heroProductId: null, heroProduct: null }),
    });
  }

  function handleSetHero(productId: string) {
    const cp = collection.products.find((p) => p.productId === productId);
    onUpdate({
      heroProductId: productId,
      heroProduct: cp
        ? { id: cp.product.id, title: cp.product.title, imageUrl: cp.product.imageUrl }
        : collection.heroProduct,
    });
  }

  const ids = collection.products.map((cp) => cp.productId);
  const empty = collection.products.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: FONT_SANS }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ fontSize: 11, letterSpacing: 1.5, color: C.faint, margin: 0 }}>COLLECTION</p>
        <span style={{ fontSize: 11, color: C.muted }}>
          {collection.products.length} {collection.products.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          overflowY: "auto",
          borderRadius: 8,
          border: `1px ${empty ? "dashed" : "solid"} ${isOver ? C.text2 : C.border}`,
          padding: empty ? 0 : 12,
          backgroundColor: isOver ? "rgba(244,244,245,0.04)" : "transparent",
          transition: "border-color 120ms, background-color 120ms",
        }}
      >
        {empty ? (
          <div
            style={{
              height: "100%",
              minHeight: 240,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              textAlign: "center",
              padding: 24,
            }}
          >
            <span style={{ fontSize: 26, color: C.faintest }}>⊕</span>
            <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>Drag products here</p>
            <p style={{ fontSize: 11, color: C.faint, margin: 0 }}>
              or click <span style={{ color: C.gold, fontWeight: 700 }}>+ ADD</span> on any product in the finder
            </p>
          </div>
        ) : (
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
              {collection.products.map((cp) => (
                <SortableTile
                  key={cp.productId}
                  cp={cp}
                  isHero={collection.heroProductId === cp.productId}
                  collectionId={collection.id}
                  onRemove={handleRemove}
                  onSetHero={handleSetHero}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>

      {!empty && (
        <p style={{ fontSize: 10, color: C.faintest, marginTop: 12, marginBottom: 0 }}>
          Drag to reorder · click a product image to set the hero
        </p>
      )}
    </div>
  );
}
