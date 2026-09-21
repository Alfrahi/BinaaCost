import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getIconMarginClass(): string {
  return "me-2";
}

const RTL_LANGUAGES = ["ar", "he", "fa"];

export function isRtlLanguage(language?: string): boolean {
  if (!language) return false;
  const lang = language.toLowerCase();
  return RTL_LANGUAGES.some(
    (rtlLang) => lang === rtlLang || lang.startsWith(`${rtlLang}-`) || lang.startsWith(`${rtlLang}_`),
  );
}
