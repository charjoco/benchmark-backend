"use client";

import { useState, useTransition } from "react";
import {
  updateCollectionMeta,
  setCollectionActive,
  deleteCollection,
  slugify,
} from "../actions";

// ── Types ────────────────────────────────────────────────────────────────────

export type EditorProduct = {
  id: string;
  title: string;
  brand: string;
  price: number;
  imageUrl: string;
  category: string;
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
}: {
  collection: EditorCollection;
  currentUserId: string | null;
  editorNames: Record<string, string>;
}) {
  const [collection, setCollection] = useState<EditorCollection>(initial);

  // Callbacks for child panels to update shared state
  function onCollectionUpdate(patch: Partial<EditorCollection>) {
    setCollection((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div
      style={{
        fontFamily: "monospace",
        backgroundColor: "#0a0a0a",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        color: "#e4e4e7",
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
          borderBottom: "1px solid #27272a",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href="/admin/collections"
            style={{ color: "#52525b", fontSize: 12, textDecoration: "none" }}
          >
            ← Collections
          </a>
          <span style={{ color: "#27272a" }}>/</span>
          <span style={{ fontSize: 13, color: "#a1a1aa" }}>{collection.name}</span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 99,
              fontSize: 9,
              fontWeight: "bold",
              letterSpacing: 1,
              backgroundColor: collection.isActive ? "#14532d" : "#27272a",
              color: collection.isActive ? "#4ade80" : "#71717a",
            }}
          >
            {collection.isActive ? "ACTIVE" : "DRAFT"}
          </span>
        </div>

        <button
          disabled
          title="Preview available after adding products"
          style={{
            backgroundColor: "transparent",
            border: "1px solid #27272a",
            borderRadius: 4,
            padding: "6px 14px",
            fontSize: 11,
            fontFamily: "monospace",
            letterSpacing: 1,
            color: "#3f3f46",
            cursor: "not-allowed",
          }}
        >
          PREVIEW
        </button>
      </div>

      {/* ── Three panels ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: Product finder (Step 4) */}
        <div
          style={{
            width: 340,
            borderRight: "1px solid #27272a",
            overflowY: "auto",
            padding: 24,
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: 11, letterSpacing: 1, color: "#3f3f46", marginBottom: 12 }}>
            PRODUCT FINDER
          </p>
          <div
            style={{
              height: 200,
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
            Coming in next step
          </div>
        </div>

        {/* Middle: Collection contents (Step 5) */}
        <div
          style={{
            flex: 1,
            borderRight: "1px solid #27272a",
            overflowY: "auto",
            padding: 24,
          }}
        >
          <p style={{ fontSize: 11, letterSpacing: 1, color: "#3f3f46", marginBottom: 12 }}>
            COLLECTION CONTENTS · {collection.products.length} / 15
          </p>
          {collection.products.length === 0 ? (
            <div
              style={{
                height: 200,
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
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {collection.products.map((cp) => (
                <div
                  key={cp.productId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    backgroundColor: "#111113",
                    borderRadius: 6,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cp.product.imageUrl}
                    alt={cp.product.title}
                    style={{
                      width: 48,
                      height: 48,
                      objectFit: "cover",
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#f4f4f5",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {cp.product.title}
                    </div>
                    <div style={{ fontSize: 11, color: "#71717a" }}>
                      {cp.product.brand} · ${cp.product.price.toFixed(2)}
                    </div>
                  </div>
                  {cp.productId === collection.heroProductId && (
                    <span
                      style={{
                        fontSize: 9,
                        letterSpacing: 1,
                        color: "#ca8a04",
                        fontWeight: "bold",
                        padding: "2px 6px",
                        backgroundColor: "#2d2006",
                        borderRadius: 4,
                      }}
                    >
                      HERO
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Metadata */}
        <MetadataPanel
          collection={collection}
          currentUserId={currentUserId}
          editorNames={editorNames}
          onUpdate={onCollectionUpdate}
        />
      </div>
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
    // deleteCollection redirects, so this line is never reached
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: 4,
    padding: "8px 10px",
    color: "#f4f4f5",
    fontSize: 13,
    fontFamily: "monospace",
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    letterSpacing: 1,
    color: "#71717a",
    display: "block",
    marginBottom: 5,
  };

  return (
    <div
      style={{
        width: 300,
        overflowY: "auto",
        padding: 24,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <p style={{ fontSize: 11, letterSpacing: 1, color: "#52525b", margin: 0 }}>
        METADATA
      </p>

      {/* Hero preview */}
      <div>
        <label style={labelStyle}>HERO IMAGE</label>
        <div
          style={{
            width: "100%",
            aspectRatio: "4/3",
            backgroundColor: "#111113",
            border: "1px solid #27272a",
            borderRadius: 6,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {collection.heroProduct ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={collection.heroProduct.imageUrl}
              alt={collection.heroProduct.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: 11, color: "#3f3f46" }}>No hero set</span>
          )}
        </div>
        {collection.heroProduct && (
          <p style={{ fontSize: 10, color: "#52525b", marginTop: 4, margin: "4px 0 0" }}>
            {collection.heroProduct.title}
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
            borderRadius: 4,
            border: "1px solid",
            fontFamily: "monospace",
            fontSize: 11,
            fontWeight: "bold",
            letterSpacing: 1.5,
            cursor: isPending ? "wait" : "pointer",
            backgroundColor: collection.isActive ? "#14532d" : "#1c1c1e",
            borderColor: collection.isActive ? "#166534" : "#27272a",
            color: collection.isActive ? "#4ade80" : "#a1a1aa",
            transition: "all 0.15s",
          }}
        >
          {isPending ? "..." : collection.isActive ? "● ACTIVE" : "○ DRAFT"}
        </button>
        {activeError && (
          <p style={{ fontSize: 11, color: "#f87171", marginTop: 6, margin: "6px 0 0" }}>
            {activeError}
          </p>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: "#1c1c1e" }} />

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
        <p style={{ fontSize: 10, color: "#3f3f46", marginTop: 4, margin: "4px 0 0" }}>
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
            backgroundColor: saving ? "#27272a" : "#f4f4f5",
            color: saving ? "#71717a" : "#09090b",
            border: "none",
            borderRadius: 4,
            fontFamily: "monospace",
            fontSize: 11,
            fontWeight: "bold",
            letterSpacing: 1.5,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "SAVING…" : saveSuccess ? "SAVED ✓" : "SAVE"}
        </button>
        {saveError && (
          <p style={{ fontSize: 11, color: "#f87171", marginTop: 6, margin: "6px 0 0" }}>
            {saveError}
          </p>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: "#1c1c1e" }} />

      {/* Last edited */}
      <div>
        <label style={labelStyle}>LAST EDITED</label>
        <p style={{ fontSize: 12, color: "#71717a", margin: 0 }}>
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
              border: "1px solid #27272a",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 11,
              letterSpacing: 1,
              color: "#52525b",
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
                  borderRadius: 4,
                  fontFamily: "monospace",
                  fontSize: 11,
                  fontWeight: "bold",
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
                  border: "1px solid #27272a",
                  borderRadius: 4,
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#71717a",
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
