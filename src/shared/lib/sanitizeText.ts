import DOMPurify from "dompurify";

export const sanitizeHtml = (html: string | null | undefined): string => {
  if (!html) {
    return "";
  }
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
};

export const sanitizeText = (text: string | null | undefined): string => {
  if (!text) {
    return "";
  }
  return DOMPurify.sanitize(text, {
    USE_PROFILES: { html: false, svg: false, mathMl: false },
  });
};
