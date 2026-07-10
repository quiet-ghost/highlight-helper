import { describe, expect, it } from "vitest";
import type { MissingItem } from "./missingItems";
import { createMissingItemsCsv } from "./missingItemsExport";

const item: MissingItem = {
  id: 1,
  initials: "AB",
  cart_number: "256",
  order_number: "123",
  cart_location: "A1",
  bin_location: "B1",
  on_hand_qty: -3,
  qty_missing: 2,
  description: "hooks",
  page_type: "tackle",
  timestamp: "2026-07-09T00:00:00.000Z",
  completed: false,
  on_cart: false,
  looked_for: false,
  fulf_1: false,
  fulf_2: false,
  cleared_at: null,
  cleared_by: null,
  clear_batch_id: null,
  exported_at: null,
  exported_by: null,
  export_batch_id: null,
};

describe("createMissingItemsCsv", () => {
  it("keeps negative on-hand quantities numeric", () => {
    const csv = createMissingItemsCsv([item]);
    const [header, row] = csv.trimEnd().split("\n");
    const columns = header.split(",");
    const values = row.split(",");

    expect(values[columns.indexOf("on_hand_qty")]).toBe("-3");
    expect(values[columns.indexOf("qty_missing")]).toBe("2");
  });

  it("still protects text values from spreadsheet formulas", () => {
    const csv = createMissingItemsCsv([{ ...item, description: "=1+1" }]);
    const [header, row] = csv.trimEnd().split("\n");
    const columns = header.split(",");
    const values = row.split(",");

    expect(values[columns.indexOf("description")]).toBe("'=1+1");
  });
});
