import { MissingItem, PageType } from "./missingItems";

const exportColumns: Array<{ key: keyof MissingItem; label: string }> = [
  { key: "id", label: "id" },
  { key: "page_type", label: "warehouse" },
  { key: "initials", label: "initials" },
  { key: "cart_number", label: "cart_number" },
  { key: "order_number", label: "order_number" },
  { key: "cart_location", label: "cart_location" },
  { key: "bin_location", label: "bin_location" },
  { key: "on_hand_qty", label: "on_hand_qty" },
  { key: "qty_missing", label: "qty_missing" },
  { key: "description", label: "description" },
  { key: "completed", label: "completed" },
  { key: "on_cart", label: "on_cart" },
  { key: "looked_for", label: "looked_for" },
  { key: "fulf_1", label: "fulf_1" },
  { key: "fulf_2", label: "fulf_2" },
  { key: "timestamp", label: "timestamp" },
  { key: "cleared_at", label: "cleared_at" },
  { key: "cleared_by", label: "cleared_by" },
  { key: "clear_batch_id", label: "clear_batch_id" },
  { key: "exported_at", label: "exported_at" },
  { key: "exported_by", label: "exported_by" },
  { key: "export_batch_id", label: "export_batch_id" },
];

function formatCsvCell(value: MissingItem[keyof MissingItem]) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  const spreadsheetSafeValue = /^[=+\-@]/.test(stringValue)
    ? `'${stringValue}`
    : stringValue;
  if (
    spreadsheetSafeValue.includes('"') ||
    spreadsheetSafeValue.includes(",") ||
    spreadsheetSafeValue.includes("\n") ||
    spreadsheetSafeValue.includes("\r")
  ) {
    return `"${spreadsheetSafeValue.replaceAll('"', '""')}"`;
  }
  return spreadsheetSafeValue;
}

function toTimestampSlug(date: Date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function downloadMissingItemsCsv(
  pageType: PageType,
  items: MissingItem[],
  exportContext?: {
    clearedAt?: string;
    clearBatchId?: string;
    exportedAt?: string;
    exportBatchId?: string;
    filenameLabel?: string;
  },
) {
  const now = new Date();
  const filenameParts = [
    "missing-items",
    pageType,
    exportContext?.filenameLabel,
    toTimestampSlug(now),
  ].filter((part): part is string => typeof part === "string");
  const filename = `${filenameParts.join("-")}.csv`;
  const rows = [
    exportColumns.map((column) => column.label).join(","),
    ...items.map((item) =>
      exportColumns
        .map((column) => {
          if (column.key === "cleared_at" && exportContext?.clearedAt) {
            return formatCsvCell(exportContext.clearedAt);
          }
          if (column.key === "clear_batch_id" && exportContext?.clearBatchId) {
            return formatCsvCell(exportContext.clearBatchId);
          }
          if (column.key === "exported_at" && exportContext?.exportedAt) {
            return formatCsvCell(exportContext.exportedAt);
          }
          if (column.key === "export_batch_id" && exportContext?.exportBatchId) {
            return formatCsvCell(exportContext.exportBatchId);
          }
          return formatCsvCell(item[column.key]);
        })
        .join(","),
    ),
  ];

  const blob = new Blob([`${rows.join("\n")}\n`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
