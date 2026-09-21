import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";

const ROOT_DIR = resolve(process.cwd());

describe("documentation consistency", () => {
  const packageJson = JSON.parse(
    readFileSync(join(ROOT_DIR, "package.json"), "utf-8"),
  );
  const packageScripts = Object.keys(packageJson.scripts || {});

  it("ensures all documented package scripts in README and development.md exist in package.json", () => {
    const readme = readFileSync(join(ROOT_DIR, "README.md"), "utf-8");
    const devDoc = readFileSync(join(ROOT_DIR, "docs", "development.md"), "utf-8");

    // Match all `pnpm <script>` mentions in code blocks
    const pnpmCommandRegex = /pnpm\s+([a-z0-9:-]+)/g;
    const documentedCommands = new Set<string>();

    for (const text of [readme, devDoc]) {
      let match;
      while ((match = pnpmCommandRegex.exec(text)) !== null) {
        const cmd = match[1];
        // Exclude general package manager subcommands like install, exec, etc.
        if (!["install", "exec"].includes(cmd)) {
          documentedCommands.add(cmd);
        }
      }
    }

    for (const cmd of documentedCommands) {
      expect(
        packageScripts,
        `Documented command 'pnpm ${cmd}' does not exist in package.json scripts`,
      ).toContain(cmd);
    }
  });

  it("ensures environment variables in .env.example are documented in docs/development.md", () => {
    const envExample = readFileSync(join(ROOT_DIR, ".env.example"), "utf-8");
    const devDoc = readFileSync(join(ROOT_DIR, "docs", "development.md"), "utf-8");

    const envVarRegex = /^[#\s]*([A-Z0-9_]+)=/gm;
    const envVars: string[] = [];
    let match;
    while ((match = envVarRegex.exec(envExample)) !== null) {
      envVars.push(match[1]);
    }

    for (const envVar of envVars) {
      expect(
        devDoc,
        `Environment variable ${envVar} from .env.example is not documented in docs/development.md`,
      ).toContain(envVar);
    }
  });

  it("ensures all relative markdown links in README, CONTRIBUTING, and docs point to existing files", () => {
    const docFiles: string[] = [
      join(ROOT_DIR, "README.md"),
      join(ROOT_DIR, "CONTRIBUTING.md"),
      join(ROOT_DIR, "SECURITY.md"),
    ];

    const docsDir = join(ROOT_DIR, "docs");
    if (existsSync(docsDir)) {
      for (const f of readdirSync(docsDir)) {
        if (f.endsWith(".md")) {
          docFiles.push(join(docsDir, f));
        }
      }
    }

    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

    for (const filePath of docFiles) {
      const content = readFileSync(filePath, "utf-8");
      let match;
      while ((match = mdLinkRegex.exec(content)) !== null) {
        const url = match[2].trim();
        // Skip external URLs, anchors, mailto links, file:// links, and badge images
        if (
          url.startsWith("http://") ||
          url.startsWith("https://") ||
          url.startsWith("#") ||
          url.startsWith("mailto:") ||
          url.startsWith("file://")
        ) {
          continue;
        }

        // Clean query/anchor params
        const cleanPath = url.split("#")[0].split("?")[0];
        if (!cleanPath) continue;

        const targetFile = resolve(dirname(filePath), cleanPath);
        expect(
          existsSync(targetFile),
          `In ${filePath}: Link target '${url}' (resolved to '${targetFile}') does not exist`,
        ).toBe(true);
      }
    }
  });

  it("ensures all documented source directories exist on disk", () => {
    const coreDirectories = [
      "src/app",
      "src/features/admin",
      "src/features/auth",
      "src/features/cost-library",
      "src/features/projects",
      "src/features/projects/project-core",
      "src/features/projects/project-costs",
      "src/features/projects/project-analytics",
      "src/features/projects/project-reports",
      "src/features/projects/project-sharing",
      "src/features/projects/project-versions",
      "src/features/reports",
      "src/features/settings",
      "src/integrations/pocketbase",
      "src/pages",
      "src/shared/components",
      "src/shared/components/ui",
      "src/shared/hooks",
      "src/shared/lib",
      "src/shared/logic",
      "pocketbase/pb_hooks",
      "pocketbase/pb_migrations",
      "public/locales/en",
      "public/locales/ar",
      "tests/e2e",
      "screenshots",
    ];

    for (const dir of coreDirectories) {
      expect(
        existsSync(join(ROOT_DIR, dir)),
        `Documented directory '${dir}' does not exist on disk`,
      ).toBe(true);
    }
  });
});
