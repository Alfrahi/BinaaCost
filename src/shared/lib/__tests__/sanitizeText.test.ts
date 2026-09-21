import { describe, it, expect } from "vitest";
import { sanitizeHtml, sanitizeText } from "../sanitizeText";

describe("sanitizeText & sanitizeHtml", () => {
  describe("sanitizeHtml", () => {
    it("returns empty string for null, undefined, or empty string", () => {
      expect(sanitizeHtml(null)).toBe("");
      expect(sanitizeHtml(undefined)).toBe("");
      expect(sanitizeHtml("")).toBe("");
    });

    it("strips malicious script tags", () => {
      const malicious = '<p>Safe text</p><script>alert("xss")</script>';
      const sanitized = sanitizeHtml(malicious);
      expect(sanitized).toBe("<p>Safe text</p>");
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain("alert");
    });

    it("strips inline event handlers", () => {
      const malicious = '<img src="x" onerror="alert(1)" /><b onclick="steal()">Click</b>';
      const sanitized = sanitizeHtml(malicious);
      expect(sanitized).not.toContain("onerror");
      expect(sanitized).not.toContain("onclick");
      expect(sanitized).not.toContain("alert");
      expect(sanitized).not.toContain("steal");
    });

    it("preserves safe html formatting tags", () => {
      const safe = "<h1>Title</h1><p>Paragraph with <strong>bold</strong> and <em>italic</em>.</p>";
      expect(sanitizeHtml(safe)).toBe(safe);
    });
  });

  describe("sanitizeText", () => {
    it("returns empty string for null, undefined, or empty string", () => {
      expect(sanitizeText(null)).toBe("");
      expect(sanitizeText(undefined)).toBe("");
      expect(sanitizeText("")).toBe("");
    });

    it("strips all HTML elements from plain text", () => {
      const htmlText = "<strong>Project</strong> <em>Name</em> <script>bad()</script>";
      const sanitized = sanitizeText(htmlText);
      expect(sanitized).toBe("Project Name ");
      expect(sanitized).not.toContain("<");
      expect(sanitized).not.toContain(">");
      expect(sanitized).not.toContain("strong");
    });

    it("preserves normal plain text strings intact", () => {
      const normal = "Concrete Pour - Foundation Block A (500m3)";
      expect(sanitizeText(normal)).toBe(normal);
    });
  });
});
