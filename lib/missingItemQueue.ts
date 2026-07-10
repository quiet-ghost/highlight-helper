import type { MissingItem } from "./missingItems";

export type MissingItemQueueChange =
  | { readonly type: "upsert"; readonly item: MissingItem }
  | { readonly type: "remove"; readonly id: number };

function compareQueueOrder(left: MissingItem, right: MissingItem) {
  const timestampComparison = right.timestamp.localeCompare(left.timestamp);
  return timestampComparison || right.id - left.id;
}

export function reconcileMissingItemQueue(
  items: readonly MissingItem[],
  change: MissingItemQueueChange,
  limit: number,
) {
  const byId = new Map(items.map((item) => [item.id, item]));

  if (change.type === "remove" || change.item.cleared_at) {
    byId.delete(change.type === "remove" ? change.id : change.item.id);
  } else {
    byId.set(change.item.id, change.item);
  }

  return [...byId.values()]
    .sort(compareQueueOrder)
    .slice(0, Math.max(1, limit));
}
