import type { AppCategory } from "@/types";

// Alo Yoga is a women's-led athleisure catalog (~3,750 products). We ingest men's
// apparel only. Gender is carried in product_type as a structured taxonomy
// (e.g. "Men:Bottoms:Shorts", "Women:Tops:Short Sleeves"), which is the reliable
// gender gate — verified both directions in the Phase-0 dry run (2026-06-23):
//   - 0 women's items leak into product_type ^Men:
//   - the 13 unisex dual-tagged accessories (socks/hats/sneakers) all carry a
//     non-gendered Accessories product_type → excluded here as accessories
//   - men's collection (mens-shop-all + mens-bestsellers) apparel is a strict
//     subset of product_type ^Men: apparel → 0 false negatives
//
// Men's apparel families and locked category mapping (dry run, 656 products):
//   Men:Bottoms:Pants        92 → pants
//   Men:Bottoms:Sweatpants   87 → pants
//   Men:Bottoms:Shorts      133 → shorts
//   Men:Outerwear:Jackets    84 → jackets   (incl. bombers, coats, puffers, shackets)
//   Men:Outerwear:Coverups:Hoodies   94 → hoodies, or zips when full/quarter-zip
//   Men:Outerwear:Coverups:Pullovers 76 → zips / hoodies / sweaters / shirts by title
//   Men:Outerwear:Coverups:Sweaters  15 → sweaters
//   Men:Tops:Short Sleeves   90 → polos | shirts   (after basic-tier cut)
//   Men:Tops:Long Sleeves    84 → zips | hoodies | polos | shirts | longsleeve (after cut)
//   Men:Tops:Tanks           37 → CUT entirely (basic tier)
//
// Basic-tier cut within Tops: all tanks, plus plain tees/crewnecks. A Short/Long
// Sleeve is KEPT only if its title signals an elevated style or a structured layer
// (see KEEP_TOPS_KEYWORDS). Everything else (Triumph/Vapor/Idol tees, Essential
// Street Tee, generic crewnecks, Micro Waffle Fast Break, Raglan Tee) is cut.
//
// Color source: colorSource="option" (Color variant option), title-suffix fallback.
// Dry run confirmed Color option == title suffix for 656/656 men's products.

const MENS_APPAREL_PREFIX = /^Men:(Bottoms|Tops|Outerwear):/;

// Title signals that rescue a Short/Long Sleeve from the basic-tier cut.
// "polo, button up, button-up, henley" → elevated collared/placket styles
// "cashmere, linen" → premium-fabric crews/tees
// "mock neck" → elevated mock-neck long sleeves
// "1/4 zip, 1/2 zip, full zip, hood" → structured zip/hooded layers (approved keep,
//   routed to zips/hoodies rather than cut — decision 2026-06-23)
const KEEP_TOPS_KEYWORDS = [
  "polo",
  "button up",
  "button-up",
  "henley",
  "cashmere",
  "linen",
  "mock neck",
  "1/4 zip",
  "1/2 zip",
  "full zip",
  "hood",
];

function isSleevesType(productType: string): boolean {
  return /^Men:Tops:(Short|Long) Sleeves$/.test(productType.trim());
}

function titleSignalsKeep(title: string): boolean {
  const t = title.toLowerCase();
  return KEEP_TOPS_KEYWORDS.some((kw) => t.includes(kw));
}

/**
 * Hard gender + scope gate for Alo. Returns true to EXCLUDE the product.
 * Excludes anything that isn't men's apparel (Women:*, Men:Accessories:*, Beauty,
 * Wellness, Internal, gift cards, etc.), all tanks, and basic-tier plain tees.
 */
export function isExcludedAloProductType(productType: string, title = ""): boolean {
  const pt = productType.trim();

  // Men's apparel gate — only Bottoms/Tops/Outerwear under the Men: prefix.
  // Drops Women:*, Men:Accessories:* (sneakers, underwear, beanies, slippers,
  // slides, hats, scarves), and all non-gendered/non-apparel types.
  if (!MENS_APPAREL_PREFIX.test(pt)) return true;

  // Cut all tanks (basic tier).
  if (pt === "Men:Tops:Tanks") return true;

  // Within Short/Long Sleeves, cut plain tees/crewnecks; keep only elevated/structured.
  if (isSleevesType(pt) && !titleSignalsKeep(title)) return true;

  return false;
}

/**
 * Map a men's apparel product to an AppCategory.
 * Only products that passed isExcludedAloProductType() should reach here.
 * Returns null for anything unexpected — caller falls through to vision.
 */
export function lookupAloCategory(
  productType: string,
  _tags: string[] = [],
  title = ""
): AppCategory | null {
  const pt = productType.trim();
  const t = title.toLowerCase();
  const hasZip = /\b1\/4 zip\b|\b1\/2 zip\b|\bfull zip\b/.test(t);

  // ── Bottoms ────────────────────────────────────────────────────────────────
  if (pt === "Men:Bottoms:Pants" || pt === "Men:Bottoms:Sweatpants") return "pants";
  if (pt === "Men:Bottoms:Shorts") return "shorts";

  // ── Outerwear ────────────────────────────────────────────────────────────────
  if (pt === "Men:Outerwear:Jackets") return "jackets";
  if (pt === "Men:Outerwear:Coverups:Sweaters") return "sweaters";

  if (pt === "Men:Outerwear:Coverups:Hoodies") {
    return hasZip ? "zips" : "hoodies";
  }

  if (pt === "Men:Outerwear:Coverups:Pullovers") {
    if (t.includes("zip")) return "zips";          // 1/4 zip, full zip, mock-neck full zip
    if (t.includes("hood")) return "hoodies";       // hooded pullovers
    if (t.includes("henley")) return "shirts";      // henley pullover → elevated top
    return "sweaters";                              // crew-neck sweatshirts/pullovers
  }

  // ── Tops (only KEEP items reach here) ────────────────────────────────────────
  if (pt === "Men:Tops:Short Sleeves") {
    if (t.includes("polo")) return "polos";
    return "shirts";                                // button-ups + premium SS crews
  }

  if (pt === "Men:Tops:Long Sleeves") {
    if (hasZip) return "zips";                       // Conquer 1/4 Zip, Double Take 1/4 Zip
    if (t.includes("hood")) return "hoodies";        // Conquer Reform LS With Hood
    if (t.includes("polo")) return "polos";
    if (t.includes("button up") || t.includes("button-up")) return "shirts";
    return "longsleeve";                            // cashmere/linen/mock-neck LS
  }

  return null;
}
