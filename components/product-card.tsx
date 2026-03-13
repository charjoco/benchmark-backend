"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { COLOR_BUCKET_HEX } from "@/lib/normalize/color";
import type { ProductRow, Colorway, SizeVariant } from "@/types";

interface ProductCardProps {
  product: ProductRow;
}

export function ProductCard({ product }: ProductCardProps) {
  const colorways: Colorway[] = Array.isArray(product.colorways)
    ? product.colorways
    : [];

  const [activeIndex, setActiveIndex] = useState(0);

  const active: Colorway | undefined = colorways[activeIndex];

  // Fall back to top-level product fields if no colorways (shouldn't happen)
  const imageUrl = active?.imageUrl ?? product.imageUrl;
  const colorName = active?.colorName ?? product.colorName;
  const colorBucket = active?.colorBucket ?? product.colorBucket;
  const price = active?.price ?? product.price;
  const compareAtPrice = active?.compareAtPrice ?? product.compareAtPrice;
  const onSale = active?.onSale ?? product.onSale;
  const sizes: SizeVariant[] = active?.sizes ?? (Array.isArray(product.sizes) ? product.sizes : []);
  const activeUrl = active?.productUrl ?? product.productUrl;

  const colorHex =
    COLOR_BUCKET_HEX[colorBucket as keyof typeof COLOR_BUCKET_HEX] ?? "#6b7280";

  const hasImage = imageUrl && imageUrl.length > 0;

  // Show at most 8 swatches; indicate overflow
  const MAX_SWATCHES = 8;
  const visibleSwatches = colorways.slice(0, MAX_SWATCHES);
  const extraCount = colorways.length - MAX_SWATCHES;

  return (
    <div className="group flex flex-col bg-zinc-900 rounded-xl overflow-hidden hover:bg-zinc-800 transition-colors duration-200">
      {/* Image — clicking opens the active colorway URL */}
      <a
        href={activeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[4/5] bg-zinc-800 overflow-hidden"
      >
        {hasImage ? (
          <Image
            src={imageUrl}
            alt={`${product.title} - ${colorName}`}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
            No image
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {onSale && (
            <Badge className="bg-red-600 hover:bg-red-600 text-white text-xs font-semibold px-1.5 py-0.5">
              SALE
            </Badge>
          )}
          {product.isNew && (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs font-semibold px-1.5 py-0.5">
              NEW
            </Badge>
          )}
        </div>
      </a>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3">
        {/* Brand */}
        <span className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
          {product.brand.replace(/-/g, " ")}
        </span>

        {/* Title */}
        <a
          href={activeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-white font-medium leading-snug line-clamp-2 hover:text-zinc-300 transition-colors"
        >
          {product.title}
        </a>

        {/* Color swatches */}
        {colorways.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {visibleSwatches.map((cw, i) => {
              const hex =
                COLOR_BUCKET_HEX[cw.colorBucket as keyof typeof COLOR_BUCKET_HEX] ??
                "#6b7280";
              const isActive = i === activeIndex;
              const isMulti = cw.colorBucket === "Multi";
              const isWhite = cw.colorBucket === "White";

              return (
                <button
                  key={`${cw.colorName}-${i}`}
                  onClick={() => setActiveIndex(i)}
                  title={cw.colorName}
                  className={`w-4 h-4 rounded-full flex-shrink-0 border transition-all duration-150 ${
                    isActive
                      ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-900 scale-110"
                      : "hover:scale-110"
                  } ${isWhite ? "border-zinc-500" : "border-zinc-700"}`}
                  style={{
                    background: isMulti
                      ? "linear-gradient(135deg, #f00 0%, #0f0 50%, #00f 100%)"
                      : hex,
                  }}
                />
              );
            })}
            {extraCount > 0 && (
              <span className="text-xs text-zinc-500">+{extraCount}</span>
            )}
          </div>
        )}

        {/* Active color name */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className="inline-block w-3 h-3 rounded-full border border-zinc-600 flex-shrink-0"
            style={{
              background:
                colorBucket === "Multi"
                  ? "linear-gradient(135deg, #f00 0%, #0f0 50%, #00f 100%)"
                  : colorHex,
            }}
          />
          <span className="text-xs text-zinc-500 truncate">{colorName}</span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-1">
          <span
            className={`text-sm font-semibold ${
              onSale ? "text-red-400" : "text-white"
            }`}
          >
            ${price.toFixed(0)}
          </span>
          {compareAtPrice && compareAtPrice > price && (
            <span className="text-xs text-zinc-500 line-through">
              ${compareAtPrice.toFixed(0)}
            </span>
          )}
        </div>

        {/* Sizes for active colorway */}
        {sizes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {sizes.slice(0, 6).map((sv) => (
              <span
                key={sv.size}
                className={`text-xs px-1.5 py-0.5 rounded border ${
                  sv.available
                    ? "border-zinc-600 text-zinc-300"
                    : "border-zinc-700 text-zinc-600 line-through"
                }`}
              >
                {sv.size}
              </span>
            ))}
            {sizes.length > 6 && (
              <span className="text-xs text-zinc-600">+{sizes.length - 6}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
