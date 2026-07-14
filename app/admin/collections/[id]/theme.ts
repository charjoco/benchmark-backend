// Benchmark internal-admin palette. Charcoal surfaces + cream text carry the whole
// interface; GOLD is disciplined — used ONLY on selected filter chips, the HERO badge,
// and the primary CTA. Gold in three places reads premium; gold everywhere reads bronze.

export const C = {
  // Charcoal surfaces (darkest → raised)
  bg: "#09090b",
  panel: "#0c0c0e",
  card: "#111113",
  raised: "#18181b",
  // Borders
  border: "#27272a",
  borderStrong: "#3f3f46",
  // Cream text (primary → faint)
  text: "#f4f4f5",
  text2: "#a1a1aa",
  muted: "#71717a",
  faint: "#52525b",
  faintest: "#3f3f46",
  // Gold accent — RESTRICTED USE
  gold: "#c27c28",
  goldSoft: "rgba(194,124,40,0.14)",
  goldText: "#09090b",
  // Status
  danger: "#f87171",
  activeGreen: "#4ade80",
  activeGreenBg: "#14532d",
} as const;

export const FONT_SANS =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
