"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  removeProductFromCollection,
  setCollectionHero,
  reorderCollectionProducts,
} from "../actions";
import type { EditorCollectionProduct, EditorCollection } from "./editor";

// ── Sortable item ─────────────────────────────────────────────────────────────

function SortableProduct({
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cp.productId });

  const [removing, setRemoving] = useState(false);
  const [settingHero, setSettingHero] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    backgroundColor: "#111113",
    borderRadius: 6,
    border: isHero ? "1px solid #713f12" : "1px solid transparent",
    userSelect: "none",
  };

  async function handleRemove() {
    setRemoving(true);
    await removeProductFromCollection(collectionId, cp.productId);
    onRemove(cp.productId);
    // If remove redirects or revalidates, this might not run
    setRemoving(false);
  }

  async function handleSetHero() {
    if (isHero) return;
    setSettingHero(true);
    await setCollectionHero(collectionId, cp.productId);
    onSetHero(cp.productId);
    setSettingHero(false);
  }

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          flexShrink: 0,
          cursor: isDragging ? "grabbing" : "grab",
          color: "#3f3f46",
          fontSize: 14,
          lineHeight: 1,
          padding: "0 2px",
        }}
        title="Drag to reorder"
      >
        ⠿
      </div>

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cp.product.imageUrl}
        alt={cp.product.title}
        style={{
          width: 44,
          height: 44,
          objectFit: "cover",
          borderRadius: 4,
          flexShrink: 0,
        }}
      />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            color: "#f4f4f5",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {cp.product.title}
        </div>
        <div style={{ fontSize: 10, color: "#71717a" }}>
          {cp.product.brand} · ${cp.product.price.toFixed(0)}
        </div>
      </div>

      {/* Hero toggle */}
      <button
        onClick={handleSetHero}
        disabled={isHero || settingHero}
        title={isHero ? "Hero" : "Set as hero"}
        style={{
          flexShrink: 0,
          padding: "4px 8px",
          backgroundColor: isHero ? "#2d2006" : "transparent",
          border: "1px solid",
          borderColor: isHero ? "#713f12" : "#27272a",
          borderRadius: 4,
          fontSize: 10,
          fontFamily: "monospace",
          letterSpacing: 0.5,
          color: isHero ? "#ca8a04" : "#3f3f46",
          cursor: isHero ? "default" : settingHero ? "wait" : "pointer",
        }}
      >
        {isHero ? "HERO" : settingHero ? "…" : "HERO"}
      </button>

      {/* Remove */}
      <button
        onClick={handleRemove}
        disabled={removing}
        title="Remove from collection"
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "transparent",
          border: "1px solid #27272a",
          borderRadius: 4,
          fontSize: 12,
          color: removing ? "#3f3f46" : "#71717a",
          cursor: removing ? "wait" : "pointer",
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CollectionContents({
  collection,
  onUpdate,
}: {
  collection: EditorCollection;
  onUpdate: (patch: Partial<EditorCollection>) => void;
}) {
  const [items, setItems] = useState<EditorCollectionProduct[]>(collection.products);
  const [reordering, setReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Keep in sync when parent adds a product
  if (items.length !== collection.products.length) {
    setItems(collection.products);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((cp) => cp.productId === active.id);
    const newIndex = items.findIndex((cp) => cp.productId === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);

    // Optimistic update
    setItems(reordered);
    onUpdate({ products: reordered });

    setReordering(true);
    await reorderCollectionProducts(
      collection.id,
      reordered.map((cp) => cp.productId)
    );
    setReordering(false);
  }

  function handleRemove(productId: string) {
    const updated = items
      .filter((cp) => cp.productId !== productId)
      .map((cp, i) => ({ ...cp, position: i }));
    setItems(updated);
    const heroProductId =
      collection.heroProductId === productId ? null : collection.heroProductId;
    onUpdate({ products: updated, heroProductId });
  }

  function handleSetHero(productId: string) {
    onUpdate({ heroProductId: productId });
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <p style={{ fontSize: 11, letterSpacing: 1, color: "#52525b", margin: 0 }}>
          COLLECTION · {items.length} / 15
        </p>
        {reordering && (
          <span style={{ fontSize: 10, color: "#52525b" }}>Saving order…</span>
        )}
      </div>

      {items.length === 0 ? (
        <div
          style={{
            flex: 1,
            backgroundColor: "#111113",
            border: "1px dashed #27272a",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#3f3f46",
            fontSize: 12,
          }}
        >
          No products yet — add some from the finder
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((cp) => cp.productId)}
            strategy={verticalListSortingStrategy}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
              {items.map((cp) => (
                <SortableProduct
                  key={cp.productId}
                  cp={cp}
                  isHero={cp.productId === collection.heroProductId}
                  collectionId={collection.id}
                  onRemove={handleRemove}
                  onSetHero={handleSetHero}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {items.length > 0 && (
        <p
          style={{
            fontSize: 10,
            color: "#3f3f46",
            marginTop: 12,
            marginBottom: 0,
          }}
        >
          Drag to reorder · Click HERO to set the cover image
        </p>
      )}
    </div>
  );
}
