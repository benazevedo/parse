export const colors = {
  background: "#F5F3EE",
  surface: "#FFFFFF",
  surfaceMuted: "#ECE9E1",
  ink: "#1D2822",
  text: "#334039",
  muted: "#748079",
  border: "#DEDAD0",
  accent: "#315E4D",
  accentPressed: "#274C3E",
  accentSoft: "#DCE8E1",
  success: "#4D765F",
  successSoft: "#E2ECE6",
  must: "#A75343",
  mustSoft: "#F3E3DF",
  should: "#8A6A2F",
  shouldSoft: "#F1E9D6",
  could: "#657681",
  couldSoft: "#E5EAED",
  disabled: "#B8BDBA",
  overlay: "rgba(29, 40, 34, 0.38)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  size: {
    caption: 12,
    body: 15,
    bodyLarge: 17,
    title: 24,
    display: 34,
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;
