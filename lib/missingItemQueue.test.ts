import { describe, expect, it } from "vitest";
import type { MissingItem } from "./missingItems";
import { reconcileMissingItemQueue } from "./missingItemQueue";

function createItem(overrides: Partial<MissingItem> = {}): MissingItem {
  return {
    id: 1,
    initials: "AB",
    cart_number: "256",
    order_number: "123",
    cart_location: "A1",
    bin_location: "B1",
    on_hand_qty: 0,
    qty_missing: 1,
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
    ...overrides,
  };
}

describe("reconcileMissingItemQueue", () => {
  it("replaces a duplicate realtime insert by ID", () => {
    const original = createItem();
    const updated = createItem({ completed: true });

    expect(
      reconcileMissingItemQueue([original], { type: "upsert", item: updated }, 50),
    ).toEqual([updated]);
  });

  it("adds an update missed by the initial snapshot", () => {
    const item = createItem({ id: 2 });

    expect(
      reconcileMissingItemQueue([], { type: "upsert", item }, 50),
    ).toEqual([item]);
  });

  it("removes cleared and deleted items by ID", () => {
    const item = createItem();

    expect(
      reconcileMissingItemQueue(
        [item],
        { type: "upsert", item: { ...item, cleared_at: "2026-07-09" } },
        50,
      ),
    ).toEqual([]);
    expect(
      reconcileMissingItemQueue([item], { type: "remove", id: item.id }, 50),
    ).toEqual([]);
  });

  it("keeps newest items first with an ID tie-breaker and page limit", () => {
    const older = createItem({ id: 1, timestamp: "2026-07-08T00:00:00.000Z" });
    const lowerId = createItem({ id: 2 });
    const higherId = createItem({ id: 3 });

    expect(
      reconcileMissingItemQueue(
        [older, lowerId],
        { type: "upsert", item: higherId },
        2,
      ).map((item) => item.id),
    ).toEqual([3, 2]);
  });
});
