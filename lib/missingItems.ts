import { supabase } from "./supabaseClient";

export type PageType = "tackle" | "tennis" | "running" | "inline";

export const PageType = {
  values: ["tackle", "tennis", "running", "inline"] as const,
  parse(value: string | null): PageType | null {
    if (
      value === "tackle" ||
      value === "tennis" ||
      value === "running" ||
      value === "inline"
    ) {
      return value;
    }
    return null;
  },
} as const;

export interface MissingItem {
  id: number;
  initials: string;
  cart_number: string;
  order_number: string;
  cart_location: string;
  bin_location: string;
  on_hand_qty: number;
  qty_missing: number;
  description?: string;
  page_type: PageType;
  timestamp: string;
  completed: boolean;
  on_cart: boolean;
  looked_for: boolean;
  fulf_1: boolean;
  fulf_2: boolean;
  cleared_at: string | null;
  cleared_by: string | null;
  clear_batch_id: string | null;
  exported_at: string | null;
  exported_by: string | null;
  export_batch_id: string | null;
}

function getObjectValue(value: unknown, key: string) {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined;
  }
  return value[key as keyof typeof value];
}

function parseString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function parseNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }
  return 0;
}

function parseBoolean(value: unknown) {
  return value === true;
}

export function parseMissingItemRow(value: unknown): MissingItem | null {
  const pageType = PageType.parse(parseString(getObjectValue(value, "page_type")));
  const id = getObjectValue(value, "id");

  if (typeof id !== "number" || !pageType) return null;

  return {
    id,
    initials: parseString(getObjectValue(value, "initials")),
    cart_number: parseString(getObjectValue(value, "cart_number")),
    order_number: parseString(getObjectValue(value, "order_number")),
    cart_location: parseString(getObjectValue(value, "cart_location")),
    bin_location: parseString(getObjectValue(value, "bin_location")),
    on_hand_qty: parseNumber(getObjectValue(value, "on_hand_qty")),
    qty_missing: parseNumber(getObjectValue(value, "qty_missing")),
    description: parseOptionalString(getObjectValue(value, "description")),
    page_type: pageType,
    timestamp: parseString(getObjectValue(value, "timestamp")),
    completed: parseBoolean(getObjectValue(value, "completed")),
    on_cart: parseBoolean(getObjectValue(value, "on_cart")),
    looked_for: parseBoolean(getObjectValue(value, "looked_for")),
    fulf_1: parseBoolean(getObjectValue(value, "fulf_1")),
    fulf_2: parseBoolean(getObjectValue(value, "fulf_2")),
    cleared_at: parseNullableString(getObjectValue(value, "cleared_at")),
    cleared_by: parseNullableString(getObjectValue(value, "cleared_by")),
    clear_batch_id: parseNullableString(getObjectValue(value, "clear_batch_id")),
    exported_at: parseNullableString(getObjectValue(value, "exported_at")),
    exported_by: parseNullableString(getObjectValue(value, "exported_by")),
    export_batch_id: parseNullableString(getObjectValue(value, "export_batch_id")),
  };
}

export type NewMissingItem = Omit<
  MissingItem,
  | "id"
  | "timestamp"
  | "completed"
  | "cleared_at"
  | "cleared_by"
  | "clear_batch_id"
  | "exported_at"
  | "exported_by"
  | "export_batch_id"
>;

async function getSessionUserIdentifier() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  return session?.user.email ?? session?.user.id ?? "unknown";
}

export async function saveMissingItem(item: NewMissingItem) {
  await saveMissingItems([item]);
}

export async function saveMissingItems(items: NewMissingItem[]) {
  if (items.length === 0) return;
  const { error } = await supabase.from("missing_items").insert(items);
  if (error) throw error;
}

export async function getMissingItems(pageType: PageType): Promise<MissingItem[]> {
  const { data, error } = await supabase
    .from("missing_items")
    .select("*")
    .eq("page_type", pageType)
    .is("cleared_at", null)
    .order("timestamp", { ascending: false });
  if (error) throw error;
  return (data || []).flatMap((row) => {
    const item = parseMissingItemRow(row);
    return item ? [item] : [];
  });
}

export async function getCompletedMissingItems(
  pageType: PageType,
): Promise<MissingItem[]> {
  const { data, error } = await supabase
    .from("missing_items")
    .select("*")
    .eq("page_type", pageType)
    .eq("completed", true)
    .is("cleared_at", null)
    .order("timestamp", { ascending: false });
  if (error) throw error;
  return (data || []).flatMap((row) => {
    const item = parseMissingItemRow(row);
    return item ? [item] : [];
  });
}

export async function updateMissingItem(
  pageType: PageType,
  id: number,
  updates: Partial<MissingItem>,
) {
  const { error } = await supabase
    .from("missing_items")
    .update(updates)
    .eq("id", id)
    .eq("page_type", pageType);
  if (error) throw error;
}

export async function clearMissingItems(
  pageType: PageType,
  clearBatchId: string,
  itemIds: number[],
) {
  if (itemIds.length === 0) return;

  const clearedAt = new Date().toISOString();
  const clearedBy = await getSessionUserIdentifier();
  const { error } = await supabase
    .from("missing_items")
    .update({
      cleared_at: clearedAt,
      cleared_by: clearedBy,
      clear_batch_id: clearBatchId,
    })
    .eq("page_type", pageType)
    .eq("completed", true)
    .is("cleared_at", null)
    .in("id", itemIds);
  if (error) throw error;
}

export async function restoreMissingItems(pageType: PageType, itemIds: number[]) {
  if (itemIds.length === 0) return;

  const { error } = await supabase
    .from("missing_items")
    .update({
      cleared_at: null,
      cleared_by: null,
      clear_batch_id: null,
      exported_at: null,
      exported_by: null,
      export_batch_id: null,
    })
    .eq("page_type", pageType)
    .not("cleared_at", "is", null)
    .is("exported_at", null)
    .in("id", itemIds);

  if (error) throw error;
}

export async function markMissingItemsExported(
  pageType: PageType,
  exportBatchId: string,
  exportedAt: string,
  itemIds: number[],
) {
  if (itemIds.length === 0) return;

  const exportedBy = await getSessionUserIdentifier();
  const { error } = await supabase
    .from("missing_items")
    .update({
      exported_at: exportedAt,
      exported_by: exportedBy,
      export_batch_id: exportBatchId,
    })
    .eq("page_type", pageType)
    .not("cleared_at", "is", null)
    .in("id", itemIds);

  if (error) throw error;
}

export async function deleteDownloadedMissingItems(
  pageType: PageType,
  itemIds: number[],
) {
  if (itemIds.length === 0) return;

  const { error } = await supabase
    .from("missing_items")
    .delete()
    .eq("page_type", pageType)
    .not("cleared_at", "is", null)
    .not("exported_at", "is", null)
    .in("id", itemIds);

  if (error) throw error;
}
