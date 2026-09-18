/**
 * Single source of truth for ECharts color palettes.
 * Chart colors are themeable via CSS custom properties defined in globals.css.
 */

// In-browser helper to read CSS custom properties as HSL strings
function getChartColorVar(name: string): string {
  if (typeof window === "undefined") {
    // SSR fallback - return light theme defaults
    const defaults: Record<string, string> = {
      "--chart-1": "195 89% 46%",
      "--chart-2": "162 100% 41%",
      "--chart-3": "48 100% 58%",
      "--chart-4": "21 100% 63%",
      "--chart-5": "217 91% 60%",
      "--chart-6": "142 76% 36%",
    };
    return defaults[name] ?? "0 0% 0%";
  }
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Convert HSL string to CSS color (ECharts accepts hsl() format)
function hslVarToColor(hsl: string): string {
  return `hsl(${hsl})`;
}

export const COST_CATEGORY_COLORS = [
  hslVarToColor(getChartColorVar("--chart-1")),
  hslVarToColor(getChartColorVar("--chart-2")),
  hslVarToColor(getChartColorVar("--chart-3")),
  hslVarToColor(getChartColorVar("--chart-4")),
] as const;

export const SCENARIO_COLORS = {
  original: hslVarToColor(getChartColorVar("--chart-5")),
  simulated: hslVarToColor(getChartColorVar("--chart-6")),
} as const;

export const CHART_EMPHASIS_SHADOW = (() => {
  if (typeof window === "undefined") return "rgba(0, 0, 0, 0.5)";
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--chart-emphasis-shadow")
    .trim();
})();
