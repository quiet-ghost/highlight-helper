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
  { type: "checkbox", key: "completed", label: "Complete", sortable: false },
  { type: "checkbox", key: "fulf_1", label: "Fulf #1" },
  { type: "checkbox", key: "fulf_2", label: "Fulf #2" },
];

function getRowClassName(item: MissingItem) {
  if (item.completed) return "bg-gray-300 dark:bg-gray-600 opacity-10";
  if (item.fulf_1) return "bg-blue-100 dark:bg-red-400";
  if (item.fulf_2) return "bg-green-100 dark:bg-blue-900";
  return "even:bg-gray-100 dark:even:bg-gray-800";
}

export default function TackleMissing() {
  const warehouse = warehouses.tackle;

  return (
    <MissingItemsPage
      pageType={warehouse.pageType}
      title="Tackle Warehouse Missing Items"
      backHref={warehouse.route}
      backLabel="Back to Tackle"
      themeClass={warehouse.themeClass}
      columns={columns}
      getRowClassName={getRowClassName}
    />
  );
}
