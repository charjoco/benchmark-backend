"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { addProductToCollection } from "../actions";
import { ProductTile, SkeletonTile } from "./product-tile";
import { C, FONT_SANS } from "./theme";
import type { EditorProduct, EditorCollection } from "./editor";

const CATEGORIES = [
  "shirts", "polos", "longsleeve", "hoodies", "sweaters", "zips", "shorts", "pants", "jackets",
];

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
  { key: "brand", label: "Brand" },
];

type ProductResult = EditorProduct & { isNew: boolean; isHidden: boolean };

// Finder tile made draggable into the collection grid (drag via the ⠿ handle so it
// doesn't fight the +ADD button / hero image). Drop is handled by editor's DndContext.
function DraggableTile({
  product,
  inCollection,
  isAdding,
  onAdd,
}: {
  product: ProductResult;
  inCollection: boolean;
  isAdding: boolean;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `finder:${product.id}`,
    data: { type: "finder", product },
    disabled: inCollection,
  });
  return (
    <div ref={setNodeRef}>
      <ProductTile
        product={product}
        variant="finder"
        inCollection={inCollection}
        isAdding={isAdding}
        isDragging={isDragging}
        onAdd={onAdd}
        dragHandleProps={inCollection ? undefined : { ...attributes, ...listeners }}
      />
    </div>
  );
}

export function ProductFinder({
  collectionId,
  collectionProducts,
  brands,
  onProductAdded,
}: {
  collectionId: string;
  collectionProducts: EditorCollection["products"];
  brands: { brandKey: string; displayName: string }[];
  onProductAdded: (product: EditorProduct) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newOnly, setNewOnly] = useState(false);
  const [sort, setSort] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [results, setResults] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqId = useRef(0);

  const inCollectionIds = new Set(collectionProducts.map((cp) => cp.productId));

  const buildParams = useCallback(
    (p: number) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      selectedBrands.forEach((b) => params.append("brand", b));
      selectedCategories.forEach((c) => params.append("category", c));
      if (newOnly) params.set("newOnly", "true");
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      params.set("sort", sort);
      params.set("page", String(p));
      return params;
    },
    [query, selectedBrands, selectedCategories, newOnly, minPrice, maxPrice, sort]
  );

  const fetchPage = useCallback(
    async (p: number, append: boolean) => {
      const myReq = ++reqId.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await fetch(`/api/admin/products?${buildParams(p).toString()}`);
        const data = await res.json();
        if (myReq !== reqId.current) return; // stale
        setResults((prev) => (append ? [...prev, ...(data.products ?? [])] : data.products ?? []));
        setHasMore(!!data.hasMore);
        setPage(p);
      } catch {
        if (myReq === reqId.current && !append) setResults([]);
      } finally {
        if (myReq === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [buildParams]
  );

  // Refetch from page 1 whenever any filter/sort changes (debounced).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPage(1, false), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedBrands, selectedCategories, newOnly, minPrice, maxPrice, sort]);

  const hasActiveFilters =
    !!query || selectedBrands.length > 0 || selectedCategories.length > 0 || newOnly || !!minPrice || !!maxPrice;

  function clearFilters() {
    setQuery("");
    setSelectedBrands([]);
    setSelectedCategories([]);
    setNewOnly(false);
    setMinPrice("");
    setMaxPrice("");
  }

  function toggleBrand(key: string) {
    setSelectedBrands((prev) => (prev.includes(key) ? prev.filter((b) => b !== key) : [...prev, key]));
  }
  function toggleCategory(cat: string) {
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  async function handleAdd(product: ProductResult) {
    setAddingId(product.id);
    setAddErrors((prev) => ({ ...prev, [product.id]: "" }));
    const result = await addProductToCollection(collectionId, product.id);
    setAddingId(null);
    if (result.error) setAddErrors((prev) => ({ ...prev, [product.id]: result.error! }));
    else onProductAdded(product);
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: C.raised,
    border: `1px solid ${C.border}`,
    borderRadius: 5,
    padding: "7px 10px",
    color: C.text,
    fontSize: 12,
    fontFamily: FONT_SANS,
    boxSizing: "border-box",
    outline: "none",
  };

  // Gold ONLY when a chip is selected.
  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "3px 9px",
    borderRadius: 99,
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: 0.3,
    border: "1px solid",
    cursor: "pointer",
    fontFamily: FONT_SANS,
    backgroundColor: active ? C.gold : "transparent",
    borderColor: active ? C.gold : C.borderStrong,
    color: active ? C.goldText : C.text2,
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12, fontFamily: FONT_SANS }}>
      {/* Search + sort row */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Search products…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
          {SORTS.map((s) => (
            <option key={s.key} value={s.key} style={{ backgroundColor: C.raised }}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filters (scrollable so the grid keeps most of the height) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 190, overflowY: "auto", flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 9, letterSpacing: 1, color: C.faint, margin: "0 0 6px" }}>BRAND</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {brands.map((b) => (
              <button key={b.brandKey} onClick={() => toggleBrand(b.brandKey)} style={chipStyle(selectedBrands.includes(b.brandKey))}>
                {b.displayName}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize: 9, letterSpacing: 1, color: C.faint, margin: "0 0 6px" }}>CATEGORY</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => toggleCategory(cat)} style={chipStyle(selectedCategories.includes(cat))}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 9, letterSpacing: 1, color: C.faint }}>PRICE</span>
            <input type="number" placeholder="min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} style={{ ...inputStyle, width: 62, padding: "5px 8px" }} />
            <span style={{ color: C.faint }}>–</span>
            <input type="number" placeholder="max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} style={{ ...inputStyle, width: 62, padding: "5px 8px" }} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: C.text2 }}>
            <input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} style={{ accentColor: C.gold }} />
            New (7d)
          </label>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.muted, fontSize: 10.5, cursor: "pointer", textDecoration: "underline", fontFamily: FONT_SANS, padding: 0 }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div style={{ height: 1, backgroundColor: C.border, flexShrink: 0 }} />

      {/* Results grid */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonTile key={i} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 48, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 24, color: C.faintest }}>⌕</span>
            <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>No products match</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} style={{ background: "none", border: `1px solid ${C.borderStrong}`, color: C.text2, fontSize: 11, padding: "5px 12px", borderRadius: 5, cursor: "pointer", fontFamily: FONT_SANS }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {results.map((product) => (
                <div key={product.id}>
                  <DraggableTile
                    product={product}
                    inCollection={inCollectionIds.has(product.id)}
                    isAdding={addingId === product.id}
                    onAdd={() => handleAdd(product)}
                  />
                  {addErrors[product.id] && (
                    <div style={{ fontSize: 9, color: C.danger, marginTop: 3 }}>{addErrors[product.id]}</div>
                  )}
                </div>
              ))}
            </div>
            {hasMore && (
              <button
                onClick={() => fetchPage(page + 1, true)}
                disabled={loadingMore}
                style={{ margin: "16px auto 0", display: "block", background: "transparent", border: `1px solid ${C.borderStrong}`, color: C.text2, fontSize: 11, letterSpacing: 1, padding: "8px 20px", borderRadius: 6, cursor: loadingMore ? "wait" : "pointer", fontFamily: FONT_SANS }}
              >
                {loadingMore ? "LOADING…" : "LOAD MORE"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
