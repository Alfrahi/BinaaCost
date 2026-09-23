import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/tests/setup.ts"],
      env: {
        VITE_POCKETBASE_URL: "http://127.0.0.1:8090",
      },
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
