import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// EN/AR key-parity regression test. Every key present in the English locale
// must exist in the Arabic locale (and vice-versa) so no raw key leaks into
// the UI. Mirrors the P1 finding where `profit_pricing.viewPricing` existed
// only in Arabic and rendered as a raw key in English.

const EN_DIR = join(process.cwd(), "public", "locales", "en");
const AR_DIR = join(process.cwd(), "public", "locales", "ar");

function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flatten(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

// i18next plural suffixes. Arabic has more plural categories (few/many/two)
// than English (one/other), so these legitimately differ per language.
const PLURAL_SUFFIXES = [
  "_zero",
  "_one",
  "_two",
  "_few",
  "_many",
  "_other",
];

function stripPluralSuffix(key: string): string {
  for (const suffix of PLURAL_SUFFIXES) {
    if (key.endsWith(suffix)) return key.slice(0, -suffix.length);
  }
  return key;
}

function load(dir: string): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    out[file] = JSON.parse(readFileSync(join(dir, file), "utf-8"));
  }
  return out;
}

describe("locale key parity", () => {
  const en = load(EN_DIR);
  const ar = load(AR_DIR);

  it("has the same set of namespace files", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });

  it("has no missing or extra keys in either language", () => {
    for (const [file, enNs] of Object.entries(en)) {
      const arNs = ar[file];
      if (!arNs) continue;
      // Compare with plural suffixes normalized so language-specific plural
      // categories (Arabic has fewer/more than English) don't false-positive.
      const enKeys = flatten(enNs).map(stripPluralSuffix).sort();
      const arKeys = flatten(arNs).map(stripPluralSuffix).sort();
      const enSet = [...new Set(enKeys)];
      const arSet = [...new Set(arKeys)];
      const missingInAr = enSet.filter((k) => !arSet.includes(k));
      const missingInEn = arSet.filter((k) => !enSet.includes(k));
      expect(missingInAr, `${file}: keys missing in ar`).toEqual([]);
      expect(missingInEn, `${file}: keys missing in en`).toEqual([]);
    }
  });

  it("has no empty translation values", () => {
    for (const [file, ns] of Object.entries(en)) {
      for (const key of flatten(ns)) {
        const val = key.split(".").reduce<any>((o, p) => o?.[p], ns);
        expect(
          typeof val === "string" && val.trim() === "",
          `${file}:${key} is empty in en`,
        ).toBe(false);
      }
    }
    for (const [file, ns] of Object.entries(ar)) {
      for (const key of flatten(ns)) {
        const val = key.split(".").reduce<any>((o, p) => o?.[p], ns);
        expect(
          typeof val === "string" && val.trim() === "",
          `${file}:${key} is empty in ar`,
        ).toBe(false);
      }
    }
  });
});