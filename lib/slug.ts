import { BRAND_KEYS } from "@/lib/config/brands";

// ─── Canonical product slug: {brandKey}-{handle} ────────────────────────────────
// The public SEO URL scheme for benchmark-web (/products/{slug}). The backend owns this
// contract so the web never has to guess: B1 resolves a slug, B4 enumerates every slug.
//
// Brand keys contain hyphens (buck-mason, holderness-bourne), so parsing is by LONGEST known
// brand-key prefix. Verified 2026-08-14: no brand key is a prefix of another, so the parse is
// unambiguous.
//
// DISAMBIGUATION: [brand, handle] is NOT unique in the DB (only [brand, externalId] is).
// A handful of rows collide — a brand renames a product and a newer row lands on a handle an
// older row still holds. The newest in-stock row wins the clean slug; every other row in the
// group gets an explicit "--{externalId}" suffix so that EVERY product has exactly one
// canonical, reachable URL. Verified 2026-08-14: 4 colliding groups catalog-wide (3 visible).

const BRANDS_BY_LENGTH = [...BRAND_KEYS].sort((a, b) => b.length - a.length);

const DISAMBIGUATOR = "--";

export interface ParsedSlug {
  brand: string;
  handle: string;
  /** Present when the slug carries an explicit "--{externalId}" disambiguator. */
  externalId?: string;
}

/** Build the clean slug. Callers that need collision-correct slugs use canonicalSlugFor(). */
export function productSlug(brand: string, handle: string): string {
  return `${brand}-${handle}`;
}

/** Build the explicitly disambiguated slug for a row that lost its handle group. */
export function disambiguatedSlug(brand: string, handle: string, externalId: string): string {
  return `${productSlug(brand, handle)}${DISAMBIGUATOR}${externalId}`;
}

export function parseProductSlug(raw: string): ParsedSlug | null {
  let slug = raw;
  let externalId: string | undefined;

  // Split the disambiguator off first — handles themselves never contain "--" followed by an
  // all-digit tail, and externalIds are always numeric Shopify IDs.
  const cut = slug.lastIndexOf(DISAMBIGUATOR);
  if (cut > 0) {
    const tail = slug.slice(cut + DISAMBIGUATOR.length);
    if (tail.length > 0 && /^\d+$/.test(tail)) {
      externalId = tail;
      slug = slug.slice(0, cut);
    }
  }

  for (const brand of BRANDS_BY_LENGTH) {
    const prefix = `${brand}-`;
    if (slug.startsWith(prefix)) {
      const handle = slug.slice(prefix.length);
      if (!handle) return null;
      return { brand, handle, externalId };
    }
  }
  return null;
}

/**
 * Deterministic winner within a [brand, handle] group: in-stock first, then newest.
 * Must stay in sync with the ordering used by the B4 slug feed.
 */
export function pickCanonicalRow<T extends { inStock: boolean; firstSeenAt: Date }>(rows: T[]): T | undefined {
  return [...rows].sort((a, b) => {
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
    return b.firstSeenAt.getTime() - a.firstSeenAt.getTime();
  })[0];
}
