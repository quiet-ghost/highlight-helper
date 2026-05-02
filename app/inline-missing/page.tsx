"use client";

import MissingItemsPage, {
  MissingItemsColumn,
} from "../../components/MissingItemsPage";
import { MissingItem } from "../../lib/missingItems";
import { warehouses } from "../../lib/warehouses";

const columns: MissingItemsColumn[] = [
  { type: "field", key: "initials", label: "Initials", format: "upper" },
  { type: "field", key: "description", label: "Item Description" },
  { type: "field", key: "cart_number", label: "Cart #" },
  { type: "field", key: "order_number", label: "Order #" },
  { type: "field", key: "cart_location", label: "Cart Pos" },
  { type: "field", key: "bin_location", label: "Bin", format: "upper" },
  { type: "field", key: "on_hand_qty", label: "On Hand" },
  { type: "field", key: "qty_missing", label: "Qty Missing" },
  { type: "field", key: "timestamp", label: "Timestamp", format: "timestamp" },
  { type: "checkbox", key: "completed", label: "Completed", sortable: false },
];

function getRowClassName(item: MissingItem) {
  return item.completed
    ? "bg-gray-300 dark:bg-gray-600 opacity-10"
    : "even:bg-gray-100 dark:even:bg-gray-800";
}

export default function InlineMissing() {
  const warehouse = warehouses.inline;

  return (
    <MissingItemsPage
      pageType={warehouse.pageType}
      title="Inline Warehouse Missing Items"
      backHref={warehouse.route}
      backLabel="Back to Inline"
      themeClass={warehouse.themeClass}
      columns={columns}
      getRowClassName={getRowClassName}
    />
  );
}
