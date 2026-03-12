export type AppCategory =
  | "shirts"
  | "longsleeve"
  | "hoodies"
  | "sweaters"
  | "zips"
  | "shorts"
  | "pants";

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

export interface ProductRow {
  id: string;
  externalId: string;
  brand: string;
  title: string;
  handle: string;
  productUrl: string;
  category: string;
  colorName: string;
  colorBucket: string;
  price: number;
  compareAtPrice: number | null;
  onSale: boolean;
  imageUrl: string;
  sizes: SizeVariant[];
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
  colorName: string;
  colorBucket: string;
  price: number;
  compareAtPrice: number | null;
  onSale: boolean;
  imageUrl: string;
  sizes: SizeVariant[];
  inStock: boolean;
}

export interface ProductsApiResponse {
  products: ProductRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
