import type { SizeVariant, Colorway, Seller } from "@/types";

// The public product shape: DB row with its JSON-string columns parsed. Shared by every public
// endpoint (feed, single-product, collections) so all clients see one identical contract.

type SerializableProduct = {
  sizes: string;
  colorways: string;
  sellers: string;
};

export function parseProduct<T extends SerializableProduct>(p: T) {
  return {
    ...p,
    sizes: JSON.parse(p.sizes) as SizeVariant[],
    colorways: JSON.parse(p.colorways) as Colorway[],
    sellers: JSON.parse(p.sellers) as Seller[],
  };
}

export function parseProducts<T extends SerializableProduct>(raw: T[]) {
  return raw.map(parseProduct);
}
