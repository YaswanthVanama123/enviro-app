/**
 * Typography tokens — the SINGLE source of truth for every text size, weight and
 * line-height in the app. Always pull sizes from here instead of hardcoding
 * numbers in component styles.
 *
 *  • FontSize  — semantic scale (xs … hero). Prefer these in components.
 *  • TextSize  — raw numeric scale (TextSize[14], TextSize[20] …) for exact sizes.
 *  • FontWeight / LineHeight — shared weight + line-height tokens.
 */

// Raw numeric scale — every supported pixel size in one place.
export const TextSize = {
  9: 9,
  10: 10,
  11: 11,
  12: 12,
  13: 13,
  14: 14,
  15: 15,
  16: 16,
  17: 17,
  18: 18,
  19: 19,
  20: 20,
  22: 22,
  24: 24,
  26: 26,
  28: 28,
  30: 30,
  32: 32,
  36: 36,
  40: 40,
  48: 48,
} as const;

// Semantic scale — kept compact for mobile so headings never feel oversized.
export const FontSize = {
  // body & labels
  xxs: 10,
  xs: 11,
  sm: 13,
  md: 15,
  lg: 16,
  // headings
  xl: 18,
  xxl: 20,
  xxxl: 22,
  // hero / display
  display: 24,
  hero: 26,
};

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const LineHeight = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.45,
  relaxed: 1.6,
};
