"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { addProductToCollection } from "../actions";
import type { EditorProduct, EditorCollection } from "./editor";

const CATEGORIES = [
  "shirts",
  "polos",
  "longsleeve",
  "hoodies",
  "sweaters",
  "zips",
  "shorts",
  "pants",
  "jackets",
];

type ProductResult = EditorProduct & { isNew: boolean; isHidden: boolean };

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
  const [results, setResults] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inCollectionIds = new Set(collectionProducts.map((cp) => cp.productId));

  async function fetchResults(
    q: string,
    brands: string[],
    categories: string[],
    newOnly: boolean
  ) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      brands.forEach((b) => params.append("brand", b));
      categories.forEach((c) => params.append("category", c));
      if (newOnly) params.set("newOnly", "true");

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const data = await res.json();
      setResults(data.products ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query, selectedBrands, selectedCategories, newOnly);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedBrands, selectedCategories, newOnly]);

  // Initial load
  useEffect(() => {
    fetchResults("", [], [], false);
  }, []);

  function toggleBrand(key: string) {
    setSelectedBrands((prev) =>
      prev.includes(key) ? prev.filter((b) => b !== key) : [...prev, key]
    );
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleAdd(product: ProductResult) {
    setAddingId(product.id);
    setAddErrors((prev) => ({ ...prev, [product.id]: "" }));
    const result = await addProductToCollection(collectionId, product.id);
    setAddingId(null);
    if (result.error) {
      setAddErrors((prev) => ({ ...prev, [product.id]: result.error! }));
    } else {
      onProductAdded(product);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#111113",
    border: "1px solid #27272a",
    borderRadius: 4,
    padding: "7px 10px",
    color: "#f4f4f5",
    fontSize: 12,
    fontFamily: "monospace",
    boxSizing: "border-box",
    outline: "none",
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "3px 8px",
    borderRadius: 99,
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
    border: "1px solid",
    cursor: "pointer",
    fontFamily: "monospace",
    backgroundColor: active ? "#f4f4f5" : "transparent",
    borderColor: active ? "#f4f4f5" : "#3f3f46",
    color: active ? "#09090b" : "#71717a",
    whiteSpace: "nowrap" as const,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
      {/* Search */}
      <input
        type="text"
        placeholder="Search products…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={inputStyle}
      />

      {/* Brand filter */}
      <div>
        <p
          style={{
            fontSize: 9,
            letterSpacing: 1,
            color: "#52525b",
            margin: "0 0 6px",
          }}
        >
          BRAND
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          {brands.map((b) => (
            <button
              key={b.brandKey}
              onClick={() => toggleBrand(b.brandKey)}
              style={chipStyle(selectedBrands.includes(b.brandKey))}
            >
              {b.displayName}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div>
        <p style={{ fontSize: 9, letterSpacing: 1, color: "#52525b", margin: "0 0 6px" }}>
          CATEGORY
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              style={chipStyle(selectedCategories.includes(cat))}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* New only toggle */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          fontSize: 11,
          color: "#71717a",
        }}
      >
        <input
          type="checkbox"
          checked={newOnly}
          onChange={(e) => setNewOnly(e.target.checked)}
          style={{ accentColor: "#f4f4f5" }}
        />
        New arrivals (last 7 days)
      </label>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: "#1c1c1e" }} />

      {/* Results */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {loading ? (
          <p style={{ fontSize: 11, color: "#52525b", textAlign: "center", paddingTop: 20 }}>
            Loading…
          </p>
        ) : results.length === 0 ? (
          <p style={{ fontSize: 11, color: "#3f3f46", textAlign: "center", paddingTop: 20 }}>
            No products found
          </p>
        ) : (
          results.map((product) => {
            const inCollection = inCollectionIds.has(product.id);
            const isAdding = addingId === product.id;
            const addError = addErrors[product.id];

            return (
              <div
                key={product.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  backgroundColor: "#111113",
                  borderRadius: 6,
                  opacity: inCollection ? 0.5 : 1,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  style={{
                    width: 40,
                    height: 40,
                    objectFit: "cover",
                    borderRadius: 3,
                    flexShrink: 0,
                  }}
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
                    {product.brand} · {product.category} · ${product.price.toFixed(0)}
                  </div>
                  {addError && (
                    <div style={{ fontSize: 10, color: "#f87171" }}>{addError}</div>
                  )}
                </div>
                <button
                  onClick={() => !inCollection && handleAdd(product)}
                  disabled={inCollection || isAdding}
                  style={{
                    flexShrink: 0,
                    padding: "4px 8px",
                    backgroundColor: inCollection ? "transparent" : "#27272a",
                    border: "1px solid",
                    borderColor: inCollection ? "#27272a" : "#3f3f46",
                    borderRadius: 4,
                    fontSize: 10,
                    fontFamily: "monospace",
                    color: inCollection ? "#3f3f46" : "#a1a1aa",
                    cursor: inCollection ? "default" : isAdding ? "wait" : "pointer",
                    letterSpacing: 0.5,
                  }}
                >
                  {inCollection ? "ADDED" : isAdding ? "…" : "+ADD"}
                </button>
              </div>
            );
          })
        )}
      </div>

      {!loading && results.length > 0 && (
        <p style={{ fontSize: 10, color: "#3f3f46", textAlign: "center", margin: 0 }}>
          {results.length} results (max 48)
        </p>
      )}
    </div>
  );
}
