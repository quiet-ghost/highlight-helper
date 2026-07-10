import {
  missingItemProjection,
  type MissingItem,
  parseMissingItemRow,
} from "./missingItems";
import {
  type AdminWarehouseSummary,
  parseAdminWarehouseSummaries,
} from "./adminMissingItemSummary";
import { PageType } from "./pageType";
import { supabase } from "./supabaseClient";

export type { AdminWarehouseSummary } from "./adminMissingItemSummary";

export type AdminWorkflowStatus =
  | "new"
  | "in_progress"
  | "completed_ready"
  | "cleared"
  | "downloaded";

export type AdminDashboardView = "all" | "active" | "history";
export type AdminStatusFilter = "all" | AdminWorkflowStatus;
export type AdminSortDirection = "asc" | "desc";
export type AdminSortField =
  | "page_type"
  | "timestamp"
  | "initials"
  | "description"
  | "cart_number"
  | "order_number"
  | "bin_location"
  | "qty_missing"
  | "cleared_at"
  | "exported_at";

export type AdminMissingItem = Pick<
  MissingItem,
  | "id"
  | "page_type"
  | "timestamp"
  | "initials"
  | "description"
  | "cart_number"
  | "order_number"
  | "bin_location"
  | "qty_missing"
  | "completed"
  | "on_cart"
  | "looked_for"
  | "fulf_1"
  | "fulf_2"
  | "cleared_at"
  | "exported_at"
>;

export interface AdminMissingItemsPageOptions {
  page: number;
  pageSize: number;
  view: AdminDashboardView;
  pageTypes?: readonly PageType[];
  status: AdminStatusFilter;
  search: string;
  sortField: AdminSortField;
  sortDirection: AdminSortDirection;
}

export interface AdminMissingItemsPageResult {
  items: AdminMissingItem[];
  totalCount: number;
}

const adminMissingItemProjection = [
  "id",
  "page_type",
  "timestamp",
  "initials",
  "description",
  "cart_number",
  "order_number",
  "bin_location",
  "qty_missing",
  "completed",
  "on_cart",
  "looked_for",
  "fulf_1",
  "fulf_2",
  "cleared_at",
  "exported_at",
].join(",");

const searchPageTypeLabels: Record<PageType, readonly string[]> = {
  tackle: ["tackle", "tackle warehouse"],
  tennis: ["tennis", "tennis warehouse"],
  running: ["running", "running warehouse"],
  inline: ["inline", "inline warehouse"],
};

export function deriveAdminWorkflowStatus(
  item: AdminMissingItem,
): AdminWorkflowStatus {
  if (item.cleared_at && item.exported_at) return "downloaded";
  if (item.cleared_at) return "cleared";
  if (item.completed) return "completed_ready";

  if (item.page_type === "tackle" && (item.fulf_1 || item.fulf_2)) {
    return "in_progress";
  }

  if (
    (item.page_type === "tennis" || item.page_type === "running") &&
    (item.on_cart || item.looked_for)
  ) {
    return "in_progress";
  }

  return "new";
}

function getObjectValue(value: unknown, key: string) {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined;
  }
  return value[key as keyof typeof value];
}

function parseRequiredString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function parseNullableString(value: unknown) {
  return value === null || typeof value === "string" ? value : undefined;
}

function parseAdminMissingItemRow(value: unknown): AdminMissingItem | null {
  const id = getObjectValue(value, "id");
  const pageTypeValue = getObjectValue(value, "page_type");
  const pageType = PageType.parse(
    typeof pageTypeValue === "string" ? pageTypeValue : null,
  );
  const timestamp = parseRequiredString(getObjectValue(value, "timestamp"));
  const initials = parseRequiredString(getObjectValue(value, "initials"));
  const cartNumber = parseRequiredString(getObjectValue(value, "cart_number"));
  const orderNumber = parseRequiredString(getObjectValue(value, "order_number"));
  const binLocation = parseRequiredString(getObjectValue(value, "bin_location"));
  const qtyMissing = getObjectValue(value, "qty_missing");
  const clearedAt = parseNullableString(getObjectValue(value, "cleared_at"));
  const exportedAt = parseNullableString(getObjectValue(value, "exported_at"));

  if (
    typeof id !== "number" ||
    !pageType ||
    timestamp === null ||
    initials === null ||
    cartNumber === null ||
    orderNumber === null ||
    binLocation === null ||
    typeof qtyMissing !== "number" ||
    clearedAt === undefined ||
    exportedAt === undefined
  ) {
    return null;
  }

  return {
    id,
    page_type: pageType,
    timestamp,
    initials,
    description:
      typeof getObjectValue(value, "description") === "string"
        ? String(getObjectValue(value, "description"))
        : undefined,
    cart_number: cartNumber,
    order_number: orderNumber,
    bin_location: binLocation,
    qty_missing: qtyMissing,
    completed: getObjectValue(value, "completed") === true,
    on_cart: getObjectValue(value, "on_cart") === true,
    looked_for: getObjectValue(value, "looked_for") === true,
    fulf_1: getObjectValue(value, "fulf_1") === true,
    fulf_2: getObjectValue(value, "fulf_2") === true,
    cleared_at: clearedAt,
    exported_at: exportedAt,
  };
}

function sanitizeSearchTerm(value: string) {
  return value
    .trim()
    .replace(/[%_*(),]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 100)
    .trim();
}

function parseUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;
}

export async function getAdminMissingItemsPage(
  options: AdminMissingItemsPageOptions,
  signal?: AbortSignal,
): Promise<AdminMissingItemsPageResult> {
  const page = Math.max(1, Math.floor(options.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("missing_items")
    .select(adminMissingItemProjection, { count: "exact" });

  if (options.pageTypes && options.pageTypes.length > 0) {
    query = query.in("page_type", [...options.pageTypes]);
  }

  if (options.view === "active") {
    query = query.is("cleared_at", null);
  }

  if (options.view === "history") {
    query = query.not("cleared_at", "is", null);
  }

  if (options.status === "downloaded") {
    query = query.not("cleared_at", "is", null).not("exported_at", "is", null);
  }

  if (options.status === "cleared") {
    query = query.not("cleared_at", "is", null).is("exported_at", null);
  }

  if (options.status === "completed_ready") {
    query = query.is("cleared_at", null).eq("completed", true);
  }

  if (options.status === "in_progress") {
    query = query
      .is("cleared_at", null)
      .eq("completed", false)
      .or(
        [
          "and(page_type.eq.tackle,fulf_1.eq.true)",
          "and(page_type.eq.tackle,fulf_2.eq.true)",
          "and(page_type.eq.tennis,on_cart.eq.true)",
          "and(page_type.eq.tennis,looked_for.eq.true)",
          "and(page_type.eq.running,on_cart.eq.true)",
          "and(page_type.eq.running,looked_for.eq.true)",
        ].join(","),
      );
  }

  if (options.status === "new") {
    query = query
      .is("cleared_at", null)
      .eq("completed", false)
      .or(
        [
          "page_type.eq.inline",
          "and(page_type.eq.tackle,fulf_1.eq.false,fulf_2.eq.false)",
          "and(page_type.eq.tennis,on_cart.eq.false,looked_for.eq.false)",
          "and(page_type.eq.running,on_cart.eq.false,looked_for.eq.false)",
        ].join(","),
      );
  }

  const searchTerm = sanitizeSearchTerm(options.search);
  if (searchTerm) {
    const pattern = `%${searchTerm}%`;
    const uuidSearchTerm = parseUuid(searchTerm);
    const normalizedSearchTerm = searchTerm.toLowerCase();
    const searchFilters = [
      `initials.ilike.${pattern}`,
      `cart_number.ilike.${pattern}`,
      `order_number.ilike.${pattern}`,
      `cart_location.ilike.${pattern}`,
      `bin_location.ilike.${pattern}`,
      `description.ilike.${pattern}`,
      `cleared_by.ilike.${pattern}`,
      `exported_by.ilike.${pattern}`,
    ];

    if (uuidSearchTerm) {
      searchFilters.push(
        `clear_batch_id.eq.${uuidSearchTerm}`,
        `export_batch_id.eq.${uuidSearchTerm}`,
      );
    }

    PageType.values.forEach((pageType) => {
      if (
        searchPageTypeLabels[pageType].some((label) =>
          label.includes(normalizedSearchTerm),
        )
      ) {
        searchFilters.push(`page_type.eq.${pageType}`);
      }
    });

    query = query.or(
      searchFilters.join(","),
    );
  }

  let request = query
    .order(options.sortField, {
      ascending: options.sortDirection === "asc",
      nullsFirst: false,
    })
    .order("id", { ascending: options.sortDirection === "asc" })
    .range(from, to);

  if (signal) request = request.abortSignal(signal);
  const { data, error, count } = await request;

  if (error) throw error;

  return {
    items: (data || []).flatMap((row) => {
      const item = parseAdminMissingItemRow(row);
      return item ? [item] : [];
    }),
    totalCount: count ?? 0,
  };
}

export async function getAdminClearedMissingItems(
  options: {
    pageType?: PageType;
    exported?: "all" | "downloaded" | "not_downloaded";
    limit?: number;
  } = {},
): Promise<MissingItem[]> {
  const query = supabase
    .from("missing_items")
    .select(missingItemProjection)
    .not("cleared_at", "is", null)
    .order("cleared_at", { ascending: false })
    .limit(options.limit ?? 200);

  if (options.pageType) {
    query.eq("page_type", options.pageType);
  }

  if (options.exported === "downloaded") {
    query.not("exported_at", "is", null);
  }

  if (options.exported === "not_downloaded") {
    query.is("exported_at", null);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).flatMap((row) => {
    const item = parseMissingItemRow(row);
    return item ? [item] : [];
  });
}

export async function getAdminWarehouseSummaries(signal?: AbortSignal) {
  let request = supabase.rpc("get_admin_missing_item_summaries");
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return parseAdminWarehouseSummaries(data);
}
