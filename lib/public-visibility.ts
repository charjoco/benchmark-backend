import type { Prisma } from "@/app/generated/prisma/client";

// ─── Internal title markers must never reach a customer ─────────────────────────
// Some brands publish operational channel markers inside the product title itself.
// Rhone ships "[OFFLINE] Commuter® Pant 36\" - Slim -- Iron" through its public products.json,
// and the scraper stores the title verbatim, so these render as product names in the app and
// would become indexed page titles on the web.
//
// This is a SERVING rule, not a purge: the rows stay in the catalog (they carry real price and
// availability history, and the reason Rhone marks 401 products offline while still refreshing
// their lastSeenAt hourly is an open question worth investigating). They are simply never
// served on a public surface — so occurrences that appear in future scrapes are excluded
// automatically, with no backfill and no scraper change.
//
// Audited 2026-08-14, all Rhone, marker always at the start of the title, no case variants:
//   [OFFLINE]    401 rows (185 otherwise-visible)
//   [RETAIL]       9 rows (  5 otherwise-visible)
//   [WHOLESALE]    1 row  (  0 otherwise-visible)
// Any future marker of this kind belongs in this list — it is the whole rule.
export const INTERNAL_TITLE_MARKERS = ["[OFFLINE]", "[RETAIL]", "[WHOLESALE]"];

/**
 * AND-able conditions excluding every internal marker. Case-insensitive so a future casing
 * change in a brand's feed can't slip past the rule.
 */
export function internalMarkerExclusions(): Prisma.ProductWhereInput[] {
  return INTERNAL_TITLE_MARKERS.map((marker) => ({
    NOT: { title: { contains: marker, mode: "insensitive" } },
  }));
}

/** The whole rule as a single where fragment, for queries that don't build an AND list. */
export const PUBLIC_PRODUCT_WHERE: Prisma.ProductWhereInput = {
  AND: internalMarkerExclusions(),
};
