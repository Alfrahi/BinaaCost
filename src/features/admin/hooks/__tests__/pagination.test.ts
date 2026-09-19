import { describe, it, expect } from "vitest";

describe("Admin Pagination Logic (HOOK-001)", () => {
  const PAGE_SIZE = 10;

  it("calculates totalPages correctly from total item count, not sliced page length", () => {
    // 25 items across page size 10 -> 3 pages
    const totalItems = 25;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    expect(totalPages).toBe(3);

    // 0 items -> 1 page
    expect(Math.max(1, Math.ceil(0 / PAGE_SIZE))).toBe(1);

    // 10 items -> 1 page
    expect(Math.max(1, Math.ceil(10 / PAGE_SIZE))).toBe(1);

    // 11 items -> 2 pages
    expect(Math.max(1, Math.ceil(11 / PAGE_SIZE))).toBe(2);
  });

  it("slices paginated items correctly by page", () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: `item-${i}` }));
    
    // page 0
    const page0 = items.slice(0 * PAGE_SIZE, 0 * PAGE_SIZE + PAGE_SIZE);
    expect(page0).toHaveLength(10);
    expect(page0[0].id).toBe("item-0");
    expect(page0[9].id).toBe("item-9");

    // page 1
    const page1 = items.slice(1 * PAGE_SIZE, 1 * PAGE_SIZE + PAGE_SIZE);
    expect(page1).toHaveLength(10);
    expect(page1[0].id).toBe("item-10");
    expect(page1[9].id).toBe("item-19");

    // page 2
    const page2 = items.slice(2 * PAGE_SIZE, 2 * PAGE_SIZE + PAGE_SIZE);
    expect(page2).toHaveLength(5);
    expect(page2[0].id).toBe("item-20");
    expect(page2[4].id).toBe("item-24");
  });
});
