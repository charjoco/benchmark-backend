export type AppCategory =
  | "shirts"
  | "polos"
  | "longsleeve"
  | "hoodies"
  | "sweaters"
  | "zips"
  | "shorts"
  | "pants"
  | "jackets";

export type ColorBucket =
  | "Black"
  | "White"
  | "Grey"
  | "Navy"
  | "Blue"
  | "Green"
  | "Brown"
  | "Red"
  | "Orange"
  | "Yellow"
  | "Purple"
  | "Pink"
  | "Multi"
  | "Other";

export interface SizeVariant {
  size: string;
  available: boolean;
}

/** An additional retailer that carries this product */
export interface Seller {
  seller: string;        // e.g. "nordstrom" | "rei"
  displayName: string;   // e.g. "Nordstrom" | "REI"
  url: string;
  price: number;
  compareAtPrice: number | null;
  onSale: boolean;
}

/** A single color variant of a product */
export interface Colorway {
  colorName: string;
  colorBucket: string;
  imageUrl: string;
  price: number;
  compareAtPrice: number | null;
  onSale: boolean;
  sizes: SizeVariant[];
  /** Per-colorway URL if it differs from the product's base URL */
  productUrl?: string;
}

export interface ProductRow {
  id: string;
  externalId: string;
  brand: string;
  title: string;
  handle: string;
  productUrl: string;
  category: string;
  // Primary colorway (used for initial display / sort)
  colorName: string;
  colorBucket: string;
  imageUrl: string;
  price: number;            // min price across all colorways
  compareAtPrice: number | null;
  onSale: boolean;
  // All colorways
  colorways: Colorway[];
  // Additional retailer options (Nordstrom, REI, etc.)
  sellers: Seller[];
  colorBuckets: string;     // comma-sep list of unique color buckets
  sizes: SizeVariant[];     // union of all sizes
  inStock: boolean;
  isNew: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
  updatedAt: Date;
}

export interface UpsertableProduct {
  externalId: string;
  brand: string;
  title: string;
  handle: string;
  productUrl: string;
  category: string;
  colorways: Colorway[];
  inStock: boolean;
}

export interface ProductsApiResponse {
  products: ProductRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
