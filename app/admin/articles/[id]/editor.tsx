"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
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
import { uploadImageToStorage } from "@/app/admin/upload-image";
import {
  saveArticle,
  setArticleActive,
  deleteArticle,
  addImageToArticle,
  updateImageAltText,
  removeImageFromArticle,
  reorderArticleImages,
  addProductToArticle,
  removeProductFromArticle,
  reorderArticleProducts,
} from "../actions";
import { ArticlePreviewModal } from "./preview-modal";

// ── Types ─────────────────────────────────────────────────────────────────────

export type EditorArticleImage = {
  id: string;
  imageUrl: string;
  altText: string | null;
  position: number;
};

export type EditorArticleProduct = {
  productId: string;
  position: number;
  product: {
    id: string;
    title: string;
    brand: string;
    price: number;
    imageUrl: string;
    category: string;
    inStock: boolean;
  };
};

export type EditorArticle = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string;
  isActive: boolean;
  publishedAt: string | null;
  lastEditedAt: string;
  lastEditedBy: string | null;
  images: EditorArticleImage[];
  products: EditorArticleProduct[];
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

// ── Tiptap toolbar ────────────────────────────────────────────────────────────

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  function handleSetLink() {
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("Enter URL", prev);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 8px",
    backgroundColor: active ? "#3f3f46" : "transparent",
    border: "1px solid",
    borderColor: active ? "#52525b" : "#27272a",
    borderRadius: 4,
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: active ? "bold" : "normal",
    color: active ? "#f4f4f5" : "#71717a",
    cursor: "pointer",
    lineHeight: 1,
  });

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        padding: "8px 12px",
        borderBottom: "1px solid #27272a",
        backgroundColor: "#111113",
      }}
    >
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        style={btnStyle(editor.isActive("heading", { level: 2 }))}
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        style={btnStyle(editor.isActive("heading", { level: 3 }))}
      >
        H3
      </button>
      <div style={{ width: 1, backgroundColor: "#27272a", margin: "0 2px" }} />
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        style={btnStyle(editor.isActive("bold"))}
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        style={btnStyle(editor.isActive("italic"))}
      >
        <em>I</em>
      </button>
      <div style={{ width: 1, backgroundColor: "#27272a", margin: "0 2px" }} />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        style={btnStyle(editor.isActive("bulletList"))}
      >
        • List
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        style={btnStyle(editor.isActive("orderedList"))}
      >
        1. List
      </button>
      <div style={{ width: 1, backgroundColor: "#27272a", margin: "0 2px" }} />
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        style={btnStyle(editor.isActive("blockquote"))}
      >
        &ldquo; Quote
      </button>
      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        style={btnStyle(false)}
      >
        ── Rule
      </button>
      <div style={{ width: 1, backgroundColor: "#27272a", margin: "0 2px" }} />
      <button onClick={handleSetLink} style={btnStyle(editor.isActive("link"))}>
        Link
      </button>
    </div>
  );
}

// ── Sortable image item ───────────────────────────────────────────────────────

function SortableImageItem({
  img,
  articleId,
  onRemove,
  onAltChange,
}: {
  img: EditorArticleImage;
  articleId: string;
  onRemove: (id: string) => void;
  onAltChange: (id: string, altText: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: img.id });

  const [localAlt, setLocalAlt] = useState(img.altText ?? "");
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    await removeImageFromArticle(articleId, img.id);
    onRemove(img.id);
  }

  async function handleAltBlur() {
    if (localAlt !== (img.altText ?? "")) {
      await updateImageAltText(img.id, localAlt);
      onAltChange(img.id, localAlt);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "10px 12px",
        backgroundColor: "#111113",
        borderRadius: 6,
        border: "1px solid #1c1c1e",
      }}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          flexShrink: 0,
          cursor: isDragging ? "grabbing" : "grab",
          color: "#3f3f46",
          fontSize: 14,
          paddingTop: 2,
        }}
      >
        ⠿
      </div>

      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.imageUrl}
        alt={localAlt || "Article image"}
        style={{
          width: 72,
          height: 72,
          objectFit: "cover",
          borderRadius: 4,
          flexShrink: 0,
        }}
      />

      {/* Alt text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <label
          style={{
            fontSize: 9,
            letterSpacing: 1,
            color: "#52525b",
            display: "block",
            marginBottom: 4,
          }}
        >
          ALT TEXT
        </label>
        <input
          type="text"
          value={localAlt}
          onChange={(e) => setLocalAlt(e.target.value)}
          onBlur={handleAltBlur}
          placeholder="Describe this image…"
          style={{
            width: "100%",
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
            borderRadius: 4,
            padding: "6px 8px",
            color: "#f4f4f5",
            fontSize: 12,
            fontFamily: "monospace",
            boxSizing: "border-box",
            outline: "none",
          }}
        />
      </div>

      {/* Remove */}
      <button
        onClick={handleRemove}
        disabled={removing}
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          backgroundColor: "transparent",
          border: "1px solid #27272a",
          borderRadius: 4,
          color: removing ? "#3f3f46" : "#71717a",
          fontSize: 14,
          cursor: removing ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── Images section ────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:image/jpeg;base64,")
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ImagesSection({
  articleId,
  initialImages,
}: {
  articleId: string;
  initialImages: EditorArticleImage[];
}) {
  const [images, setImages] = useState<EditorArticleImage[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("Only JPEG, PNG, or WebP images are accepted.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const storagePath = `${articleId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Convert file to base64 and upload server-side via service role key,
    // bypassing Storage RLS entirely.
    const base64 = await fileToBase64(file);
    const { url: publicUrl, error: uploadErr } = await uploadImageToStorage(
      base64,
      file.type,
      storagePath
    );

    if (uploadErr || !publicUrl) {
      setUploadError(uploadErr ?? "Upload failed.");
      setUploading(false);
      return;
    }

    const result = await addImageToArticle(articleId, { imageUrl: publicUrl, altText: "" });
    setUploading(false);

    if (result.error) {
      setUploadError(result.error);
    } else if (result.image) {
      setImages((prev) => [...prev, result.image!]);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);
    const reordered = arrayMove(images, oldIndex, newIndex).map((img, i) => ({
      ...img,
      position: i,
    }));

    setImages(reordered);
    await reorderArticleImages(
      articleId,
      reordered.map((img) => img.id)
    );
  }

  function handleRemove(id: string) {
    setImages((prev) =>
      prev.filter((img) => img.id !== id).map((img, i) => ({ ...img, position: i }))
    );
  }

  function handleAltChange(id: string, altText: string) {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, altText } : img))
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <p style={{ fontSize: 10, letterSpacing: 1, color: "#52525b", margin: 0 }}>
          IMAGES · {images.length} / 3
        </p>
        {images.length < 3 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #27272a",
              borderRadius: 4,
              padding: "4px 10px",
              fontSize: 10,
              fontFamily: "monospace",
              letterSpacing: 0.5,
              color: uploading ? "#52525b" : "#a1a1aa",
              cursor: uploading ? "wait" : "pointer",
            }}
          >
            {uploading ? "UPLOADING…" : "+ ADD IMAGE"}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {uploadError && (
        <p style={{ fontSize: 11, color: "#f87171", marginBottom: 8 }}>{uploadError}</p>
      )}

      {images.length === 0 ? (
        <div
          style={{
            padding: "20px",
            backgroundColor: "#111113",
            border: "1px dashed #27272a",
            borderRadius: 6,
            textAlign: "center",
            color: "#3f3f46",
            fontSize: 12,
          }}
        >
          No images — click &quot;+ Add Image&quot; to upload (JPEG, PNG, WebP · max 5MB)
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={images.map((img) => img.id)}
            strategy={verticalListSortingStrategy}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {images.map((img) => (
                <SortableImageItem
                  key={img.id}
                  img={img}
                  articleId={articleId}
                  onRemove={handleRemove}
                  onAltChange={handleAltChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ── Compact product section (right panel) ─────────────────────────────────────

type ProductSearchResult = {
  id: string;
  title: string;
  brand: string;
  price: number;
  imageUrl: string;
  category: string;
  inStock: boolean;
};

function SortableAttachedProduct({
  ap,
  articleId,
  onRemove,
}: {
  ap: EditorArticleProduct;
  articleId: string;
  onRemove: (productId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ap.productId });
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    await removeProductFromArticle(articleId, ap.productId);
    onRemove(ap.productId);
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        backgroundColor: "#18181b",
        borderRadius: 4,
      }}
    >
      <div
        {...attributes}
        {...listeners}
        style={{ cursor: isDragging ? "grabbing" : "grab", color: "#3f3f46", fontSize: 12 }}
      >
        ⠿
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ap.product.imageUrl}
        alt={ap.product.title}
        style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 3, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: "#f4f4f5",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {ap.product.title}
        </div>
        <div style={{ fontSize: 10, color: "#52525b" }}>
          {ap.product.brand} · ${ap.product.price.toFixed(0)}
        </div>
      </div>
      <button
        onClick={handleRemove}
        disabled={removing}
        style={{
          flexShrink: 0,
          width: 20,
          height: 20,
          backgroundColor: "transparent",
          border: "1px solid #27272a",
          borderRadius: 3,
          color: removing ? "#3f3f46" : "#71717a",
          fontSize: 12,
          cursor: removing ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

function ArticleProductSection({
  articleId,
  initialProducts,
}: {
  articleId: string;
  initialProducts: EditorArticleProduct[];
}) {
  const [products, setProducts] = useState<EditorArticleProduct[]>(initialProducts);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const attachedIds = new Set(products.map((p) => p.productId));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/admin/products?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults((data.products ?? []).slice(0, 6));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  async function handleAdd(product: ProductSearchResult) {
    setAddingId(product.id);
    setAddError(null);
    const result = await addProductToArticle(articleId, product.id);
    setAddingId(null);
    if (result.error) {
      setAddError(result.error);
    } else {
      const newAp: EditorArticleProduct = {
        productId: product.id,
        position: products.length,
        product,
      };
      setProducts((prev) => [...prev, newAp]);
      setQuery("");
      setResults([]);
      setShowDropdown(false);
    }
  }

  function handleRemove(productId: string) {
    setProducts((prev) =>
      prev
        .filter((p) => p.productId !== productId)
        .map((p, i) => ({ ...p, position: i }))
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.productId === active.id);
    const newIndex = products.findIndex((p) => p.productId === over.id);
    const reordered = arrayMove(products, oldIndex, newIndex).map((p, i) => ({
      ...p,
      position: i,
    }));
    setProducts(reordered);
    await reorderArticleProducts(
      articleId,
      reordered.map((p) => p.productId)
    );
  }

  return (
    <div>
      <p style={{ fontSize: 10, letterSpacing: 1, color: "#52525b", margin: "0 0 8px" }}>
        PRODUCTS · {products.length} / 5
      </p>

      {/* Search */}
      {products.length < 5 && (
        <div ref={containerRef} style={{ position: "relative", marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Search to attach product…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => query && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            style={{
              width: "100%",
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 4,
              padding: "7px 10px",
              color: "#f4f4f5",
              fontSize: 12,
              fontFamily: "monospace",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
          {showDropdown && results.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 20,
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 4,
                marginTop: 2,
                overflow: "hidden",
              }}
            >
              {results.map((product) => {
                const already = attachedIds.has(product.id);
                const isAdding = addingId === product.id;
                return (
                  <div
                    key={product.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      borderBottom: "1px solid #27272a",
                      opacity: already ? 0.4 : 1,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 3 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#f4f4f5",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {product.title}
                      </div>
                      <div style={{ fontSize: 10, color: "#52525b" }}>
                        {product.brand} · ${product.price.toFixed(0)}
                      </div>
                    </div>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (!already && !isAdding) handleAdd(product);
                      }}
                      disabled={already || isAdding}
                      style={{
                        flexShrink: 0,
                        padding: "3px 8px",
                        backgroundColor: already ? "transparent" : "#27272a",
                        border: "1px solid #3f3f46",
                        borderRadius: 3,
                        fontSize: 10,
                        fontFamily: "monospace",
                        color: already ? "#3f3f46" : "#a1a1aa",
                        cursor: already ? "default" : isAdding ? "wait" : "pointer",
                      }}
                    >
                      {already ? "✓" : isAdding ? "…" : "+"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {addError && (
        <p style={{ fontSize: 11, color: "#f87171", marginBottom: 6 }}>{addError}</p>
      )}

      {/* Attached products */}
      {products.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={products.map((p) => p.productId)}
            strategy={verticalListSortingStrategy}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {products.map((ap) => (
                <SortableAttachedProduct
                  key={ap.productId}
                  ap={ap}
                  articleId={articleId}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ── Right panel ───────────────────────────────────────────────────────────────

function RightPanel({
  article,
  currentUserId,
  editorNames,
  getBody,
  title,
  subtitle,
  onUpdate,
}: {
  article: EditorArticle;
  currentUserId: string | null;
  editorNames: Record<string, string>;
  getBody: () => string;
  title: string;
  subtitle: string;
  onUpdate: (patch: Partial<EditorArticle>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const result = await saveArticle(article.id, {
      title,
      subtitle,
      body: getBody(),
    });
    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
    } else {
      setSaveSuccess(true);
      onUpdate({
        title: title.trim() || "Untitled Article",
        subtitle: subtitle.trim() || null,
      });
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  }

  function handleToggleActive() {
    setActiveError(null);
    startTransition(async () => {
      const result = await setArticleActive(article.id, !article.isActive);
      if (result.error) {
        setActiveError(result.error);
      } else {
        const wasNeverPublished = !article.publishedAt;
        onUpdate({
          isActive: !article.isActive,
          ...(wasNeverPublished && !article.isActive
            ? { publishedAt: new Date().toISOString() }
            : {}),
        });
      }
    });
  }

  async function handleDelete() {
    setDeleting(true);
    await deleteArticle(article.id);
  }

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
        borderLeft: "1px solid #27272a",
        overflowY: "auto",
        padding: 20,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        fontFamily: "monospace",
      }}
    >
      {/* Status */}
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
            backgroundColor: article.isActive ? "#14532d" : "#1c1c1e",
            borderColor: article.isActive ? "#166534" : "#27272a",
            color: article.isActive ? "#4ade80" : "#a1a1aa",
            transition: "all 0.15s",
          }}
        >
          {isPending ? "..." : article.isActive ? "● ACTIVE" : "○ DRAFT"}
        </button>
        {activeError && (
          <p style={{ fontSize: 11, color: "#f87171", marginTop: 6 }}>{activeError}</p>
        )}
      </div>

      {/* Published date */}
      {article.publishedAt && (
        <div>
          <label style={labelStyle}>PUBLISHED</label>
          <p style={{ fontSize: 12, color: "#71717a", margin: 0 }}>
            {formatDate(article.publishedAt)}
          </p>
        </div>
      )}

      {/* Last edited */}
      <div>
        <label style={labelStyle}>LAST EDITED</label>
        <p style={{ fontSize: 12, color: "#71717a", margin: 0 }}>
          {timeAgo(article.lastEditedAt)} by{" "}
          {resolveDisplayName(article.lastEditedBy, currentUserId, editorNames)}
        </p>
      </div>

      <div style={{ height: 1, backgroundColor: "#1c1c1e" }} />

      {/* Products */}
      <ArticleProductSection
        articleId={article.id}
        initialProducts={article.products}
      />

      <div style={{ height: 1, backgroundColor: "#1c1c1e" }} />

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
          <p style={{ fontSize: 11, color: "#f87171", marginTop: 6 }}>{saveError}</p>
        )}
      </div>

      {/* Delete */}
      <div style={{ marginTop: "auto" }}>
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
            DELETE ARTICLE
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
            <p style={{ fontSize: 12, color: "#fca5a5", margin: "0 0 10px" }}>
              Delete this article? Cannot be undone.
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

// ── Root component ────────────────────────────────────────────────────────────

export function ArticleEditor({
  article: initial,
  currentUserId,
  editorNames,
  brands: _brands,
}: {
  article: EditorArticle;
  currentUserId: string | null;
  editorNames: Record<string, string>;
  brands: { brandKey: string; displayName: string }[];
}) {
  const [article, setArticle] = useState<EditorArticle>(initial);
  const [title, setTitle] = useState(initial.title === "New Article" ? "" : initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle ?? "");
  const [showPreview, setShowPreview] = useState(false);

  function onUpdate(patch: Partial<EditorArticle>) {
    setArticle((prev) => ({ ...prev, ...patch }));
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
    ],
    content: initial.body || "",
    editorProps: {
      attributes: {
        class: "article-tiptap-editor",
      },
    },
  });

  // Stable ref for reading body in save handler without stale closure
  const getBody = useCallback(() => editor?.getHTML() ?? "", [editor]);

  const previewArticle: EditorArticle = {
    ...article,
    title: title || article.title,
    subtitle: subtitle || null,
  };

  return (
    <>
      {/* Editor styles */}
      <style>{`
        .article-tiptap-editor {
          outline: none;
          min-height: 320px;
          padding: 16px;
          color: #e4e4e7;
          font-family: monospace;
          font-size: 14px;
          line-height: 1.75;
        }
        .article-tiptap-editor h2 {
          font-size: 18px;
          font-weight: bold;
          color: #f4f4f5;
          margin: 20px 0 8px;
        }
        .article-tiptap-editor h3 {
          font-size: 15px;
          font-weight: bold;
          color: #e4e4e7;
          margin: 16px 0 6px;
        }
        .article-tiptap-editor p { margin: 0 0 10px; }
        .article-tiptap-editor p:last-child { margin-bottom: 0; }
        .article-tiptap-editor ul,
        .article-tiptap-editor ol {
          padding-left: 22px;
          margin: 0 0 10px;
        }
        .article-tiptap-editor li { margin-bottom: 3px; }
        .article-tiptap-editor blockquote {
          border-left: 3px solid #3f3f46;
          margin: 0 0 10px;
          padding: 4px 0 4px 14px;
          color: #71717a;
          font-style: italic;
        }
        .article-tiptap-editor hr {
          border: none;
          border-top: 1px solid #27272a;
          margin: 20px 0;
        }
        .article-tiptap-editor a {
          color: #a1a1aa;
          text-decoration: underline;
        }
        .article-tiptap-editor strong { color: #f4f4f5; font-weight: bold; }
        .article-tiptap-editor em { font-style: italic; }
        .article-tiptap-editor .ProseMirror-focused { outline: none; }
        .article-tiptap-editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #3f3f46;
          pointer-events: none;
          float: left;
          height: 0;
        }
      `}</style>

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
        {/* Top bar */}
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
              href="/admin/articles"
              style={{ color: "#52525b", fontSize: 12, textDecoration: "none" }}
            >
              ← Articles
            </a>
            <span style={{ color: "#27272a" }}>/</span>
            <span
              style={{
                fontSize: 13,
                color: "#a1a1aa",
                maxWidth: 300,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title || article.title}
            </span>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 99,
                fontSize: 9,
                fontWeight: "bold",
                letterSpacing: 1,
                backgroundColor: article.isActive ? "#14532d" : "#27272a",
                color: article.isActive ? "#4ade80" : "#71717a",
              }}
            >
              {article.isActive ? "ACTIVE" : "DRAFT"}
            </span>
          </div>

          <button
            onClick={() => setShowPreview(true)}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #3f3f46",
              borderRadius: 4,
              padding: "6px 14px",
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: 1,
              color: "#a1a1aa",
              cursor: "pointer",
            }}
          >
            PREVIEW
          </button>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left panel — content editor */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {/* Title */}
            <div style={{ padding: "24px 24px 0" }}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title"
                style={{
                  width: "100%",
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom: "1px solid #27272a",
                  padding: "0 0 12px",
                  color: "#f4f4f5",
                  fontSize: 22,
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Subtitle */}
            <div style={{ padding: "12px 24px 0" }}>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Optional tagline"
                style={{
                  width: "100%",
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom: "1px solid #1c1c1e",
                  padding: "0 0 12px",
                  color: "#71717a",
                  fontSize: 15,
                  fontFamily: "monospace",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Tiptap */}
            <div
              style={{
                margin: "16px 16px 0",
                border: "1px solid #1c1c1e",
                borderRadius: 6,
                overflow: "hidden",
                backgroundColor: "#0d0d0f",
              }}
            >
              <Toolbar editor={editor} />
              <EditorContent editor={editor} />
            </div>

            {/* Images */}
            <div style={{ margin: "24px 24px 32px" }}>
              <ImagesSection
                articleId={article.id}
                initialImages={article.images}
              />
            </div>
          </div>

          {/* Right panel */}
          <RightPanel
            article={article}
            currentUserId={currentUserId}
            editorNames={editorNames}
            getBody={getBody}
            title={title}
            subtitle={subtitle}
            onUpdate={onUpdate}
          />
        </div>
      </div>

      {showPreview && (
        <ArticlePreviewModal
          article={previewArticle}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
