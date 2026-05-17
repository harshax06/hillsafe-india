// ─── HillSafe Design System ────────────────────────────────────────────────
// All colors, spacing, and font sizes in one place.
// Import COLORS from here in every screen/component.

export const COLORS = {
  // Backgrounds
  bg:       '#0a0f1a',   // main app background (darkest)
  surface:  '#111827',   // tab bar, cards
  card:     '#162033',   // inner card background
  border:   '#1e3a5f',   // borders everywhere

  // Text
  text:     '#e2eaf4',   // primary text
  muted:    '#6b8ab0',   // secondary / label text

  // Accent
  accent:   '#00d4ff',   // blue highlight (links, active tab)

  // Risk levels
  safe:     '#00ff88',   // green  — altitude < 800m
  caution:  '#ffd700',   // yellow — altitude 800–1400m
  danger:   '#ff4455',   // red    — altitude > 1400m
  orange:   '#ff8c42',   // medium warning

  // Semantic
  white:    '#ffffff',
  black:    '#000000',
};

export const FONTS = {
  small:   12,
  body:    14,
  label:   15,
  title:   18,
  heading: 24,
  hero:    42,
};

export const RADIUS = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  full: 999,
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
};

// ─── Risk zone thresholds (metres) ─────────────────────────────────────────
export const ALTITUDE_THRESHOLDS = {
  safe:    800,    // below this = safe (green)
  caution: 1400,   // below this = caution (yellow), above = danger (red)
};

// ─── Slope angle thresholds (degrees) ──────────────────────────────────────
export const SLOPE_THRESHOLDS = {
  safe:     20,   // gentle slope
  moderate: 35,   // moderate risk
  // above 35° = steep, high risk
};

// ─── Risk score formula weights ─────────────────────────────────────────────
export const RISK_WEIGHTS = {
  altitude:     4,   // max points from altitude
  slope:        3,   // max points from slope
  nearbyPins:   2,   // max points from community danger reports
  rain:         3,   // max points from rain forecast (Week 5)
};
