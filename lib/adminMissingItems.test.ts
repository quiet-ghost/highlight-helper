import { describe, expect, it } from "vitest";
import { parseAdminWarehouseSummaries } from "./adminMissingItemSummary";

describe("parseAdminWarehouseSummaries", () => {
  it("parses and orders one aggregate row per warehouse", () => {
    const rows = ["inline", "running", "tennis", "tackle"].map(
      (pageType, index) => ({
        page_type: pageType,
        open_count: index,
        completed_ready_count: index + 1,
        cleared_count: index + 2,
        downloaded_count: index + 3,
        oldest_open_at: index === 0 ? null : "2026-07-09T00:00:00.000Z",
      }),
    );

    expect(parseAdminWarehouseSummaries(rows).map((row) => row.pageType)).toEqual([
      "tackle",
      "tennis",
      "running",
      "inline",
    ]);
  });

  it("rejects missing, duplicate, and malformed aggregate rows", () => {
    expect(() => parseAdminWarehouseSummaries([])).toThrow(
      "summary for tackle",
    );
    expect(() =>
      parseAdminWarehouseSummaries([
        {
          page_type: "tackle",
          open_count: -1,
          completed_ready_count: 0,
          cleared_count: 0,
          downloaded_count: 0,
          oldest_open_at: null,
        },
      ]),
    ).toThrow("invalid counts");
  });
});
