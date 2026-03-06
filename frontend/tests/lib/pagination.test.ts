import { describe, expect, it } from "vitest";
import { getPageCount, paginationSearchSchema } from "@/lib/pagination";

describe("getPageCount", () => {
  it("returns 0 when pagination is undefined", () => {
    expect(getPageCount(undefined)).toBe(0);
  });

  it("returns 1 when total fits within limit", () => {
    expect(getPageCount({ page: 1, limit: 10, total: 5 })).toBe(1);
  });

  it("returns exact page count for even division", () => {
    expect(getPageCount({ page: 1, limit: 10, total: 100 })).toBe(10);
  });

  it("rounds up for uneven division", () => {
    expect(getPageCount({ page: 1, limit: 10, total: 101 })).toBe(11);
  });

  it("returns 1 for total=1 limit=1", () => {
    expect(getPageCount({ page: 1, limit: 1, total: 1 })).toBe(1);
  });

  it("returns 0 for total=0", () => {
    expect(getPageCount({ page: 1, limit: 10, total: 0 })).toBe(0);
  });
});

describe("paginationSearchSchema", () => {
  it("parses a valid page number", () => {
    expect(paginationSearchSchema.parse({ page: 3 })).toEqual({ page: 3 });
  });

  it("falls back to 1 for page=0", () => {
    expect(paginationSearchSchema.parse({ page: 0 })).toEqual({ page: 1 });
  });

  it("falls back to 1 for negative page", () => {
    expect(paginationSearchSchema.parse({ page: -5 })).toEqual({ page: 1 });
  });

  it("falls back to 1 for non-number page", () => {
    expect(paginationSearchSchema.parse({ page: "abc" })).toEqual({ page: 1 });
  });

  it("falls back to 1 when page is missing", () => {
    expect(paginationSearchSchema.parse({})).toEqual({ page: 1 });
  });
});
