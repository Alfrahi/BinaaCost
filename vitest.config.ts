import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: [],
      coverage: {
        provider: "istanbul",
      },
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/tests/e2e/**",
      ],
    },
  }),
);
