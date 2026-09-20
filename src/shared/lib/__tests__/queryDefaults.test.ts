import { describe, it, expect } from "vitest";
import { STALE_TIME } from "../queryDefaults";

describe("queryDefaults STALE_TIME", () => {
  it("defines standard ascending intervals for query caching", () => {
    expect(STALE_TIME.REALTIME).toBe(10_000);
    expect(STALE_TIME.SHORT).toBe(30_000);
    expect(STALE_TIME.DYNAMIC).toBe(60_000);
    expect(STALE_TIME.ENTITY).toBe(120_000);
    expect(STALE_TIME.LISTS).toBe(300_000);
    expect(STALE_TIME.STATIC).toBe(3_600_000);

    expect(STALE_TIME.REALTIME).toBeLessThan(STALE_TIME.SHORT);
    expect(STALE_TIME.SHORT).toBeLessThan(STALE_TIME.DYNAMIC);
    expect(STALE_TIME.DYNAMIC).toBeLessThan(STALE_TIME.ENTITY);
    expect(STALE_TIME.ENTITY).toBeLessThan(STALE_TIME.LISTS);
    expect(STALE_TIME.LISTS).toBeLessThan(STALE_TIME.STATIC);
  });
});
