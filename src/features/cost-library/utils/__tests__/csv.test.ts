// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  parseAndValidateCostItemsCsv,
  escapeCsvCell,
} from "../csv";

function makeCsvFile(content: string): File {
  return new File([content], "items.csv", { type: "text/csv" });
}

const mapping = {
  csi_division: "Division",
  csi_code: "Code",
  description: "Description",
  unit: "Unit",
  unit_price: "Price",
};

describe("parseAndValidateCostItemsCsv", () => {
  it("stores text fields without a leading apostrophe", async () => {
    const file = makeCsvFile(
      "Division,Code,Description,Unit,Price\n03,033100,Concrete,m3,120.5\n",
    );
    const { parsedData, invalidRows } = await parseAndValidateCostItemsCsv(
      file,
      mapping,
    );
    expect(invalidRows).toEqual([]);
    expect(parsedData[0].description).toBe("Concrete");
    expect(parsedData[0].unit).toBe("m3");
    expect(parsedData[0].csi_division).toBe("03");
    expect(parsedData[0].csi_code).toBe("033100");
    expect(parsedData[0].unit_price).toBe(120.5);
  });

  it("stores formula-like values as-is (no prefix on import)", async () => {
    const file = makeCsvFile(
      'Division,Code,Description,Unit,Price\n03,033100,"=SUM(1,2)",m3,10\n',
    );
    const { parsedData } = await parseAndValidateCostItemsCsv(file, mapping);
    expect(parsedData[0].description).toBe("=SUM(1,2)");
  });
});

describe("escapeCsvCell", () => {
  it("prefixes formula-leading values on export", () => {
    expect(escapeCsvCell("=SUM(1,2)")).toBe("'=SUM(1,2)");
    expect(escapeCsvCell("+1")).toBe("'+1");
    expect(escapeCsvCell("-1")).toBe("'-1");
    expect(escapeCsvCell("@cmd")).toBe("'@cmd");
  });

  it("leaves normal values untouched", () => {
    expect(escapeCsvCell("Concrete")).toBe("Concrete");
    expect(escapeCsvCell(120.5)).toBe("120.5");
    expect(escapeCsvCell("")).toBe("");
  });
});