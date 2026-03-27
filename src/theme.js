// ── GLOGO PREMIUM DESIGN SYSTEM ─────────────────────────
// One file to rule all colors, fonts, and spacing.

export const T = {
  // Core palette
  emerald:   "#10B981",   // Primary green — CTA buttons, accents
  forest:    "#064E3B",   // Deep green — headers, hero backgrounds
  emeraldLt: "#D1FAE5",   // Light green — hover states, subtle fills
  emeraldMd: "#059669",   // Medium green — active states

  // Neutrals
  white:     "#FFFFFF",
  offWhite:  "#F9FAFB",   // Page background
  surface:   "#F3F4F6",   // Card background
  surfaceMd: "#E5E7EB",   // Borders, dividers
  charcoal:  "#111827",   // Primary text
  slate:     "#374151",   // Secondary text
  muted:     "#6B7280",   // Placeholder, captions
  ghost:     "#9CA3AF",   // Disabled states

  // Accents
  amber:     "#F59E0B",   // Gold/Kente accent
  amberLt:   "#FEF3C7",   // Light amber fill
  red:       "#EF4444",   // Error, danger
  redLt:     "#FEE2E2",   // Light red fill

  // Kente colors
  kenteGold: "#F59E0B",
  kenteRed:  "#DC2626",
  kenteGreen:"#10B981",
  kenteDark: "#111827",

  // Shadows
  shadow:    "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:  "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)",
  shadowLg:  "0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)",

  // Typography — Inter + Montserrat
  fontSans:  "'Inter', 'DM Sans', 'Segoe UI', sans-serif",
  fontMono:  "'JetBrains Mono', 'Courier Prime', monospace",
  fontHead:  "'Montserrat', 'Inter', sans-serif",

  // Border radius
  r:    "8px",
  rMd:  "12px",
  rLg:  "16px",
  rXl:  "24px",
  rFull:"9999px",
};

// Semantic component styles
export const btn = {
  primary: {
    background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldMd})`,
    color: T.white,
    border: "none",
    borderRadius: T.rMd,
    padding: "14px 24px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: T.fontSans,
    width: "100%",
    transition: "all 0.2s",
    boxShadow: `0 2px 8px ${T.emerald}44`,
    letterSpacing: "0.01em",
  },
  secondary: {
    background: T.white,
    color: T.charcoal,
    border: `1.5px solid ${T.surfaceMd}`,
    borderRadius: T.rMd,
    padding: "13px 24px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: T.fontSans,
    width: "100%",
    transition: "all 0.2s",
    boxShadow: T.shadow,
  },
  ghost: {
    background: "transparent",
    color: T.emerald,
    border: `1.5px solid ${T.emerald}`,
    borderRadius: T.rMd,
    padding: "11px 20px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: T.fontSans,
    width: "100%",
  },
};

export const card = {
  base: {
    background: T.white,
    borderRadius: T.rLg,
    padding: "20px",
    border: `1px solid ${T.surfaceMd}`,
    boxShadow: T.shadowMd,
  },
  elevated: {
    background: T.white,
    borderRadius: T.rXl,
    padding: "28px 24px",
    border: `1px solid ${T.surfaceMd}`,
    boxShadow: T.shadowLg,
  },
  dark: {
    background: T.forest,
    borderRadius: T.rLg,
    padding: "20px",
    border: `1px solid ${T.emerald}33`,
    boxShadow: T.shadowMd,
  },
  green: {
    background: T.emeraldLt,
    borderRadius: T.rLg,
    padding: "20px",
    border: `1px solid ${T.emerald}44`,
  },
};

export const inp = {
  base: {
    background: T.white,
    border: `1.5px solid ${T.surfaceMd}`,
    borderRadius: T.rMd,
    padding: "13px 16px",
    color: T.charcoal,
    fontSize: "15px",
    width: "100%",
    fontFamily: T.fontSans,
    outline: "none",
    marginBottom: "14px",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
};
