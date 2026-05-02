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
  { type: "checkbox", key: "on_cart", label: "On Cart" },
  { type: "checkbox", key: "looked_for", label: "Looked For" },
];

function getRowClassName(item: MissingItem) {
  if (item.completed) return "bg-gray-300 dark:bg-gray-600 opacity-10";
  if (item.on_cart) return "bg-blue-100 dark:bg-green-900";
  if (item.looked_for) return "bg-green-100 dark:bg-blue-900";
  return "even:bg-gray-100 dark:even:bg-gray-800";
}

export default function RunningMissing() {
  const warehouse = warehouses.running;

  return (
    <MissingItemsPage
      pageType={warehouse.pageType}
      title="Running Warehouse Missing Items"
      backHref={warehouse.route}
      backLabel="Back to Running"
      themeClass={warehouse.themeClass}
      columns={columns}
      getRowClassName={getRowClassName}
    />
  );
}
