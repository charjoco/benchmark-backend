// Shared curation exclusions — applied to EVERY brand at the menProducts stage of the
// scrape (lib/scrapers/shopify.ts), so excluded products fall out of validMensExternalIds
// and are pruned by the stale-cleanup on the next scrape. This is what fixes the
// "grandfathered accessory" bug: previously, isExcludedProductType only ran for
// not-yet-categorized products (shopify.ts Step 3a), so an accessory categorized before an
// exclusion existed hit the Step 2 "reuse category" shortcut and served forever. Filtering
// here — before validMensExternalIds is built — removes those existing rows too.
//
// Benchmark v1 = curated men's APPAREL only: no accessories/non-apparel, no licensed
// college/pro sports.

// ── 1. Non-apparel / accessory product_type ─────────────────────────────────────
// Word-boundary keyword match on the normalized product_type. Validated against all 835
// distinct product_types across 21 brands: flags 173 accessory/non-apparel types, 0 apparel.
const NON_APPAREL_PT =
  /\b(hat|hats|headwear|cap|caps|snapback|strapback|beanie|beanies|visor|visors|belt|belts|glove|gloves|mitten|mittens|sock|socks|underwear|boxer|boxers|brief|briefs|footwear|shoe|shoes|sneaker|sneakers|sandal|sandals|loafer|loafers|boot|boots|slipper|slippers|mule|mules|bag|bags|backpack|tote|duffle|duffel|wallet|wallets|sunglass|sunglasses|cooler|coolers|tumbler|bottle|flask|canteen|blanket|towel|towels|dopp|lanyard|keychain|umbrella|headband|scarf|scarves|gaiter|jewelry|watch|watches|candle|fragrance|mat|mats|strap|straps|block|blocks|headcover|drinkware|equipment|accessor\w*|gift ?card|giftcard|ball marker|divot|hair tie|ear ?muff|legwarmer)\b/i;

// PLURAL-AWARE apparel guard — an apparel garment word ALWAYS wins, so breadcrumb-style
// product_types like "Apparel & Accessories > ... > Coats & Jackets > Parkas" can never be
// flagged non-apparel. (Missing plurals here previously flagged that Parkas type — fixed.)
const APPAREL_PT =
  /\b(tees?|t-shirts?|polos?|shirts?|shorts?|pants?|jeans?|denim|joggers?|sweatpants?|hoodies?|pullovers?|crews?|sweaters?|cardigans?|jackets?|coats?|parkas?|vests?|shackets?|overshirts?|henley|henleys|tanks?|tops?|buttons?|zips?|leggings?|trousers?|chinos?|blazers?|bombers?|shells?|anoraks?|windbreakers?|dress|dresses|skirts?|skorts?|rompers?|jumpsuits?|swim|boardshorts?|midlayers?|knits?|wovens?|base ?layer|long ?sleeve|short ?sleeve|apparel|clothing)\b/i;

export function isNonApparelProductType(productType: string | null | undefined): boolean {
  const t = (productType ?? "").toLowerCase();
  if (!t) return false;
  if (APPAREL_PT.test(t)) return false; // apparel wins
  return NON_APPAREL_PT.test(t);
}

/** True when the product_type contains a recognized apparel garment word. Used by the
 *  new-type tripwire to surface product_types that are neither recognized apparel nor a
 *  known accessory — the "neither" bucket that defaults to KEEP and would fail open for a
 *  novel accessory type a brand invents. */
export function isRecognizedApparelType(productType: string | null | undefined): boolean {
  return APPAREL_PT.test((productType ?? "").toLowerCase());
}

// ── 2. Narrow title backstop ─────────────────────────────────────────────────────
// Catches accessories that got MIScategorized into a real apparel category (their
// product_type slipped the rule above). Deliberately narrow + tuned against the false
// positives the dry-run surfaced: "Belt Loop All Day Shorts", "Belt-Pack Run Jogger",
// "Towel Terry Short" (a fabric). Only unambiguous accessory nouns, plus "belt" as the
// HEAD noun (title ends with "belt"/"belts", optionally "- Color").
export function isAccessoryByTitle(title: string | null | undefined): boolean {
  const t = (title ?? "").toLowerCase();
  if (!t) return false;
  if (/\b(snapback|beanie|visor|sunglasses|dopp kit)\b/.test(t)) return true;
  // "belt" only when it's the product itself (ends the title, ignoring a trailing "- color")
  if (/\bbelts?\b\s*(-\s*[a-z0-9 /'&."]+)?$/.test(t)) return true;
  return false;
}

// ── 3. Licensed college/pro sports product_type ─────────────────────────────────
// johnnie-o encodes league in product_type: "NCAA CMPO", "MLB CMKO", "NFL CMPO", "NHL ...".
// Word-boundary league tokens. (TravisMathew + faherty + greyson use COLLECTIONS instead —
// handled per-brand via licensedCollectionHandles in the scraper; see brands.ts.)
export function isLicensedSportsProductType(productType: string | null | undefined): boolean {
  return /\b(ncaa|mlb|nfl|nhl|nba)\b/i.test(productType ?? "");
}

// ── Combined curation gate + reason (for logging which rule fired) ───────────────
export type ExclusionReason = "non-apparel-type" | "accessory-title" | "licensed-sports-type";

export function curationExclusionReason(
  productType: string | null | undefined,
  title: string | null | undefined
): ExclusionReason | null {
  if (isNonApparelProductType(productType)) return "non-apparel-type";
  if (isAccessoryByTitle(title)) return "accessory-title";
  if (isLicensedSportsProductType(productType)) return "licensed-sports-type";
  return null;
}
