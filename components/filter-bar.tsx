"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { BRANDS } from "@/lib/config/brands";
import { COLOR_BUCKET_HEX } from "@/lib/normalize/color";
import type { ColorBucket } from "@/types";

const COLOR_BUCKETS: ColorBucket[] = [
  "Black", "White", "Grey", "Navy", "Blue", "Green",
  "Brown", "Red", "Orange", "Yellow", "Purple", "Pink",
];

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string, checked: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    const existing = params.getAll(key);
    if (checked) {
      if (!existing.includes(value)) {
        params.append(key, value);
      }
    } else {
      const remaining = existing.filter((v) => v !== value);
      params.delete(key);
      remaining.forEach((v) => params.append(key, v));
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleBool(key: string, current: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (current) {
      params.delete(key);
    } else {
      params.set(key, "true");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function setSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    router.push(pathname);
  }

  const selectedBrands = searchParams.getAll("brand");
  const selectedColors = searchParams.getAll("color");
  const selectedSizes = searchParams.getAll("size");
  const onSale = searchParams.get("onSale") === "true";
  const isNew = searchParams.get("isNew") === "true";
  const sortBy = searchParams.get("sortBy") || "lastSeenAt";

  const hasFilters =
    selectedBrands.length > 0 ||
    selectedColors.length > 0 ||
    selectedSizes.length > 0 ||
    onSale ||
    isNew ||
    sortBy !== "lastSeenAt";

  return (
    <aside className="w-56 flex-shrink-0 border-r border-zinc-800 px-4 py-6 flex flex-col gap-6 min-h-screen">
      {/* Sort */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Sort
        </h3>
        <div className="flex flex-col gap-1">
          {[
            { value: "lastSeenAt", label: "Latest" },
            { value: "newest", label: "Newest" },
            { value: "price_asc", label: "Price: Low → High" },
            { value: "price_desc", label: "Price: High → Low" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSort(value)}
              className={`text-left text-sm px-2 py-1 rounded transition-colors ${
                sortBy === value
                  ? "text-white font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick filters */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Filter
        </h3>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <Checkbox
              checked={onSale}
              onCheckedChange={() => toggleBool("onSale", onSale)}
              className="border-zinc-600"
            />
            <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
              On Sale
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <Checkbox
              checked={isNew}
              onCheckedChange={() => toggleBool("isNew", isNew)}
              className="border-zinc-600"
            />
            <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
              New Arrivals
            </span>
          </label>
        </div>
      </div>

      {/* Brands */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Brand
        </h3>
        <div className="flex flex-col gap-2">
          {BRANDS.map((brand) => (
            <label
              key={brand.brandKey}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <Checkbox
                checked={selectedBrands.includes(brand.brandKey)}
                onCheckedChange={(checked) =>
                  updateParam("brand", brand.brandKey, checked === true)
                }
                className="border-zinc-600"
              />
              <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                {brand.displayName}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Sizes */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Size
        </h3>
        <div className="flex flex-wrap gap-2">
          {["S", "M", "L", "XL", "XXL"].map((size) => {
            const isSelected = selectedSizes.includes(size);
            return (
              <button
                key={size}
                onClick={() => updateParam("size", size, !isSelected)}
                className={`w-10 h-8 text-xs font-medium rounded border transition-all ${
                  isSelected
                    ? "border-white text-white bg-zinc-700"
                    : "border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200"
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Colors */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Color
        </h3>
        <div className="flex flex-wrap gap-2">
          {COLOR_BUCKETS.map((color) => {
            const hex = COLOR_BUCKET_HEX[color];
            const isSelected = selectedColors.includes(color);
            return (
              <button
                key={color}
                title={color}
                onClick={() =>
                  updateParam("color", color, !isSelected)
                }
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  isSelected
                    ? "border-white scale-110"
                    : "border-zinc-600 hover:border-zinc-400"
                }`}
                style={{
                  backgroundColor: hex.startsWith("linear") ? undefined : hex,
                  background: hex.startsWith("linear") ? hex : undefined,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="mt-auto text-xs text-zinc-500 hover:text-zinc-300 underline text-left transition-colors"
        >
          Clear all filters
        </button>
      )}
    </aside>
  );
}
