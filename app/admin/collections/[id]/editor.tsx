"use client";

import { useState, useTransition, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  updateCollectionMeta,
  setCollectionActive,
  deleteCollection,
  setCollectionHeroImage,
  removeCollectionHeroImage,
  reorderCollectionProducts,
  addProductToCollection,
} from "../actions";
import { slugify } from "../utils";
import { ProductFinder } from "./product-finder";
import { CollectionContents } from "./collection-contents";
import { ProductTile } from "./product-tile";
import { PreviewModal } from "./preview-modal";
import { C, FONT_SANS } from "./theme";

// ── Types ────────────────────────────────────────────────────────────────────

export type EditorProduct = {
  id: string;
  title: string;
  brand: string;
  price: number;
  imageUrl: string;
  category: string | null;
  inStock: boolean;
};

export type EditorCollectionProduct = {
  productId: string;
  position: number;
  addedAt: string;
  product: EditorProduct;
};

export type EditorCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  heroProductId: string | null;
  heroImageUrl: string | null;
  lastEditedAt: string;
  lastEditedBy: string | null;
  heroProduct: { id: string; title: string; imageUrl: string } | null;
  products: EditorCollectionProduct[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function resolveDisplayName(
  userId: string | null,
  currentUserId: string | null,
  editorNames: Record<string, string>
): string {
  if (!userId) return "—";
  if (userId === currentUserId) return "you";
  return editorNames[userId] ?? userId.slice(0, 8);
}

// ── Root component ────────────────────────────────────────────────────────────

export function CollectionEditor({
  collection: initial,
  currentUserId,
  editorNames,
  brands,
}: {
  collection: EditorCollection;
  currentUserId: string | null;
  editorNames: Record<string, string>;
  brands: { brandKey: string; displayName: string }[];
}) {
  const [collection, setCollection] = useState<EditorCollection>(initial);
  const [showPreview, setShowPreview] = useState(false);

  function onCollectionUpdate(patch: Partial<EditorCollection>) {
    setCollection((prev) => ({ ...prev, ...patch }));
  }

  function handleProductAdded(product: EditorProduct) {
    setCollection((prev) => {
      if (prev.products.some((cp) => cp.productId === product.id)) return prev;
      return {
        ...prev,
        products: [
          ...prev.products,
          { productId: product.id, position: prev.products.length, addedAt: new Date().toISOString(), product },
        ],
      };
    });
  }

  // ── Single DndContext (lifted here) drives both finder→collection ADD-by-drag
  //    and in-collection reorder, so one drag layer spans both grids.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [activeProduct, setActiveProduct] = useState<EditorProduct | null>(null);
  const [activeType, setActiveType] = useState<"finder" | "collection" | null>(null);

  function handleDragStart(e: DragStartEvent) {
    const d = e.active.data.current as { type?: "finder" | "collection"; product?: EditorProduct } | undefined;
    setActiveProduct(d?.product ?? null);
    setActiveType(d?.type ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    const active = e.active.data.current as { type?: string; product?: EditorProduct } | undefined;
    const overData = e.over?.data.current as { type?: string } | undefined;
    setActiveProduct(null);
    setActiveType(null);
    if (!active) return;

    // Finder → collection : ADD (dropped on the collection grid or any collection tile)
    if (active.type === "finder" && active.product) {
      const droppedOnCollection = !!e.over && (e.over.id === "collection-drop" || overData?.type === "collection");
      if (!droppedOnCollection) return;
      const p = active.product;
      if (collection.products.some((cp) => cp.productId === p.id)) return;
      handleProductAdded(p); // optimistic
      const res = await addProductToCollection(collection.id, p.id);
      if (res.error) {
        setCollection((prev) => ({ ...prev, products: prev.products.filter((cp) => cp.productId !== p.id) }));
      }
      return;
    }

    // In-collection reorder
    if (active.type === "collection") {
      const overId = e.over?.id;
      if (!overId || overId === e.active.id || overData?.type !== "collection") return;
      const oldIndex = collection.products.findIndex((cp) => cp.productId === e.active.id);
      const newIndex = collection.products.findIndex((cp) => cp.productId === overId);
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = arrayMove(collection.products, oldIndex, newIndex).map((cp, i) => ({ ...cp, position: i }));
      setCollection((prev) => ({ ...prev, products: reordered }));
      await reorderCollectionProducts(collection.id, reordered.map((cp) => cp.productId));
    }
  }

  const canPreview = collection.products.length > 0;

  return (
    <div
      style={{
        fontFamily: FONT_SANS,
        backgroundColor: C.bg,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        color: C.text,
        overflow: "hidden",
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: 52,
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href="/admin/collections"
            style={{ color: C.faint, fontSize: 12, textDecoration: "none" }}
          >
            ← Collections
          </a>
          <span style={{ color: C.border }}>/</span>
          <span style={{ fontSize: 13, color: C.text2 }}>{collection.name}</span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 99,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1,
              backgroundColor: collection.isActive ? C.activeGreenBg : C.border,
              color: collection.isActive ? C.activeGreen : C.muted,
            }}
          >
            {collection.isActive ? "ACTIVE" : "DRAFT"}
          </span>
        </div>

        <button
          onClick={() => canPreview && setShowPreview(true)}
          disabled={!canPreview}
          title={canPreview ? "Preview collection" : "Add products first"}
          style={{
            backgroundColor: "transparent",
            border: "1px solid",
            borderColor: canPreview ? C.borderStrong : C.border,
            borderRadius: 4,
            padding: "6px 14px",
            fontSize: 11,
            fontFamily: FONT_SANS,
            letterSpacing: 1,
            color: canPreview ? C.text2 : C.faintest,
            cursor: canPreview ? "pointer" : "not-allowed",
          }}
        >
          PREVIEW
        </button>
      </div>

      {/* ── Three panels ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Left: Product finder (visual grid) */}
          <div
            style={{
              flex: "1.4 1 0",
              minWidth: 320,
              borderRight: `1px solid ${C.border}`,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <p style={{ fontSize: 11, letterSpacing: 1.5, color: C.faint, margin: "0 0 12px" }}>
              PRODUCT FINDER
            </p>
            <ProductFinder
              collectionId={collection.id}
              collectionProducts={collection.products}
              brands={brands}
              onProductAdded={handleProductAdded}
            />
          </div>

          {/* Middle: Collection grid */}
          <div style={{ flex: "1 1 0", minWidth: 300, borderRight: `1px solid ${C.border}`, overflow: "hidden", padding: 24 }}>
            <CollectionContents collection={collection} onUpdate={onCollectionUpdate} />
          </div>

          {/* Drag preview */}
          <DragOverlay dropAnimation={null}>
            {activeProduct ? (
              <div style={{ width: 168, cursor: "grabbing" }}>
                <ProductTile
                  product={activeProduct}
                  variant={activeType === "collection" ? "collection" : "finder"}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Right: Metadata rail (persistent — hero preview stays visible while arranging) */}
        <MetadataPanel
          collection={collection}
          currentUserId={currentUserId}
          editorNames={editorNames}
          onUpdate={onCollectionUpdate}
        />
      </div>

      {/* Preview modal */}
      {showPreview && (
        <PreviewModal collection={collection} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

// ── Metadata panel ────────────────────────────────────────────────────────────

function MetadataPanel({
  collection,
  currentUserId,
  editorNames,
  onUpdate,
}: {
  collection: EditorCollection;
  currentUserId: string | null;
  editorNames: Record<string, string>;
  onUpdate: (patch: Partial<EditorCollection>) => void;
}) {
  const [name, setName] = useState(collection.name);
  const [slug, setSlug] = useState(collection.slug);
  const [description, setDescription] = useState(collection.description ?? "");
  const [slugDirty, setSlugDirty] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [activeError, setActiveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [heroUploading, setHeroUploading] = useState(false);
  const [heroUploadError, setHeroUploadError] = useState<string | null>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  async function handleHeroImageUpload(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setHeroUploadError("Only JPEG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setHeroUploadError("Image must be under 5 MB.");
      return;
    }
    setHeroUploading(true);
    setHeroUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("context", "collection");
      formData.append("entityId", collection.id);
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Upload failed.");

      const result = await setCollectionHeroImage(collection.id, json.url);
      if (result.error) throw new Error(result.error);
      onUpdate({ heroImageUrl: json.url });
    } catch (err) {
      setHeroUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setHeroUploading(false);
      if (heroFileInputRef.current) heroFileInputRef.current.value = "";
    }
  }

  async function handleRemoveHeroImage() {
    const result = await removeCollectionHeroImage(collection.id);
    if (!result.error) onUpdate({ heroImageUrl: null });
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugDirty) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value);
    setSlugDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const result = await updateCollectionMeta(collection.id, { name, slug, description });
    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
    } else {
      setSaveSuccess(true);
      onUpdate({ name, slug, description: description || null });
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  }

  function handleToggleActive() {
    setActiveError(null);
    const next = !collection.isActive;
    startTransition(async () => {
      const result = await setCollectionActive(collection.id, next);
      if (result.error) {
        setActiveError(result.error);
      } else {
        onUpdate({ isActive: next });
      }
    });
  }

  async function handleDelete() {
    setDeleting(true);
    await deleteCollection(collection.id);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: C.raised,
    border: `1px solid ${C.border}`,
    borderRadius: 5,
    padding: "8px 10px",
    color: C.text,
    fontSize: 13,
    fontFamily: FONT_SANS,
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    letterSpacing: 1,
    color: C.muted,
    display: "block",
    marginBottom: 5,
  };

  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        overflowY: "auto",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        fontFamily: FONT_SANS,
        backgroundColor: C.panel,
      }}
    >
      <p style={{ fontSize: 11, letterSpacing: 1.5, color: C.faint, margin: 0 }}>
        METADATA
      </p>

      {/* Hero image */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>HERO IMAGE</label>
          {collection.heroImageUrl && (
            <button
              onClick={handleRemoveHeroImage}
              style={{
                backgroundColor: "transparent",
                border: "none",
                color: C.muted,
                fontSize: 10,
                fontFamily: FONT_SANS,
                cursor: "pointer",
                padding: 0,
                letterSpacing: 0.5,
              }}
            >
              × REMOVE
            </button>
          )}
        </div>

        {/* Image preview — live hero (custom upload → hero product → none) */}
        <div
          style={{
            width: "100%",
            aspectRatio: "4/3",
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          {collection.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={collection.heroImageUrl}
              alt="Custom hero"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : collection.heroProduct ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={collection.heroProduct.imageUrl}
                alt={collection.heroProduct.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </>
          ) : (
            <span style={{ fontSize: 11, color: C.faintest }}>No hero set</span>
          )}
        </div>

        {/* Source label */}
        {collection.heroImageUrl ? (
          <p style={{ fontSize: 10, color: C.faint, margin: "0 0 8px" }}>
            Custom image
          </p>
        ) : collection.heroProduct ? (
          <p style={{ fontSize: 10, color: C.faint, margin: "0 0 8px" }}>
            From product: {collection.heroProduct.title}
          </p>
        ) : null}

        {/* Upload button */}
        <input
          ref={heroFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleHeroImageUpload(file);
          }}
        />
        <button
          onClick={() => heroFileInputRef.current?.click()}
          disabled={heroUploading}
          style={{
            width: "100%",
            padding: "7px 10px",
            backgroundColor: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 5,
            fontFamily: FONT_SANS,
            fontSize: 10,
            letterSpacing: 1,
            color: heroUploading ? C.faint : C.text2,
            cursor: heroUploading ? "wait" : "pointer",
          }}
        >
          {heroUploading ? "UPLOADING…" : collection.heroImageUrl ? "REPLACE IMAGE" : "UPLOAD CUSTOM IMAGE"}
        </button>
        {heroUploadError && (
          <p style={{ fontSize: 11, color: C.danger, margin: "6px 0 0" }}>
            {heroUploadError}
          </p>
        )}
      </div>

      {/* Active toggle */}
      <div>
        <label style={labelStyle}>STATUS</label>
        <button
          onClick={handleToggleActive}
          disabled={isPending}
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: 5,
            border: "1px solid",
            fontFamily: FONT_SANS,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            cursor: isPending ? "wait" : "pointer",
            backgroundColor: collection.isActive ? C.activeGreenBg : C.raised,
            borderColor: collection.isActive ? "#166534" : C.border,
            color: collection.isActive ? C.activeGreen : C.text2,
            transition: "all 0.15s",
          }}
        >
          {isPending ? "..." : collection.isActive ? "● ACTIVE" : "○ DRAFT"}
        </button>
        {activeError && (
          <p style={{ fontSize: 11, color: C.danger, marginTop: 6, margin: "6px 0 0" }}>
            {activeError}
          </p>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: C.border }} />

      {/* Name */}
      <div>
        <label style={labelStyle}>NAME</label>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          style={inputStyle}
          placeholder="Collection name"
        />
      </div>

      {/* Slug */}
      <div>
        <label style={labelStyle}>SLUG</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          style={inputStyle}
          placeholder="url-slug"
        />
        <p style={{ fontSize: 10, color: C.faintest, marginTop: 4, margin: "4px 0 0" }}>
          /collections/{slug || "…"}
        </p>
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>DESCRIPTION</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Optional short description"
        />
      </div>

      {/* Save */}
      <div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            padding: "10px 12px",
            backgroundColor: saving ? C.border : C.text,
            color: saving ? C.muted : C.bg,
            border: "none",
            borderRadius: 5,
            fontFamily: FONT_SANS,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "SAVING…" : saveSuccess ? "SAVED ✓" : "SAVE"}
        </button>
        {saveError && (
          <p style={{ fontSize: 11, color: C.danger, marginTop: 6, margin: "6px 0 0" }}>
            {saveError}
          </p>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: C.border }} />

      {/* Last edited */}
      <div>
        <label style={labelStyle}>LAST EDITED</label>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
          {timeAgo(collection.lastEditedAt)} by{" "}
          {resolveDisplayName(collection.lastEditedBy, currentUserId, editorNames)}
        </p>
      </div>

      {/* Delete */}
      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              width: "100%",
              padding: "8px 12px",
              backgroundColor: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 5,
              fontFamily: FONT_SANS,
              fontSize: 11,
              letterSpacing: 1,
              color: C.faint,
              cursor: "pointer",
            }}
          >
            DELETE COLLECTION
          </button>
        ) : (
          <div
            style={{
              backgroundColor: "#1c0a0a",
              border: "1px solid #3f1010",
              borderRadius: 6,
              padding: 12,
            }}
          >
            <p style={{ fontSize: 12, color: "#fca5a5", marginBottom: 10, margin: "0 0 10px" }}>
              Delete &ldquo;{collection.name}&rdquo;? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  backgroundColor: "#dc2626",
                  border: "none",
                  borderRadius: 5,
                  fontFamily: FONT_SANS,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  cursor: deleting ? "wait" : "pointer",
                }}
              >
                {deleting ? "…" : "CONFIRM"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  backgroundColor: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: 5,
                  fontFamily: FONT_SANS,
                  fontSize: 11,
                  color: C.muted,
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
