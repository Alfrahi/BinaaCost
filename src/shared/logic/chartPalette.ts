/**
 * Single source of truth for ECharts color palettes.
 * Chart colors are intentionally decoupled from UI semantic tokens
 * (they need distinct hues for series differentiation).
 */

export const COST_CATEGORY_COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
] as const;

export const SCENARIO_COLORS = {
  original: "#60A5FA",
  simulated: "#34D399",
} as const;

export const CHART_EMPHASIS_SHADOW = "rgba(0, 0, 0, 0.5)";
