import { MissingItem, PageType, parseMissingItemRow } from "./missingItems";
import { supabase } from "./supabaseClient";

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

export interface AdminWarehouseSummary {
  pageType: PageType;
  openCount: number;
  completedReadyCount: number;
  clearedCount: number;
  downloadedCount: number;
  oldestOpenAt: string | null;
}

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
  items: MissingItem[];
  totalCount: number;
}

const searchPageTypeLabels: Record<PageType, readonly string[]> = {
  tackle: ["tackle", "tackle warehouse"],
  tennis: ["tennis", "tennis warehouse"],
  running: ["running", "running warehouse"],
  inline: ["inline", "inline warehouse"],
};

export function deriveAdminWorkflowStatus(item: MissingItem): AdminWorkflowStatus {
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
): Promise<AdminMissingItemsPageResult> {
  const page = Math.max(1, Math.floor(options.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("missing_items").select("*", { count: "exact" });

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

  const { data, error, count } = await query
    .order(options.sortField, {
      ascending: options.sortDirection === "asc",
      nullsFirst: false,
    })
    .range(from, to);

  if (error) throw error;

  return {
    items: (data || []).flatMap((row) => {
      const item = parseMissingItemRow(row);
      return item ? [item] : [];
    }),
    totalCount: count ?? 0,
  };
}

export async function getAdminMissingItems(limit = 500): Promise<MissingItem[]> {
  const { data, error } = await supabase
    .from("missing_items")
    .select("*")
    .is("cleared_at", null)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).flatMap((row) => {
    const item = parseMissingItemRow(row);
    return item ? [item] : [];
  });
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
    .select("*")
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

async function getOpenCount(pageType: PageType) {
  const { count, error } = await supabase
    .from("missing_items")
    .select("id", { count: "exact", head: true })
    .eq("page_type", pageType)
    .is("cleared_at", null)
    .eq("completed", false);

  if (error) throw error;
  return count ?? 0;
}

async function getCompletedReadyCount(pageType: PageType) {
  const { count, error } = await supabase
    .from("missing_items")
    .select("id", { count: "exact", head: true })
    .eq("page_type", pageType)
    .is("cleared_at", null)
    .eq("completed", true);

  if (error) throw error;
  return count ?? 0;
}

async function getClearedCount(pageType: PageType) {
  const { count, error } = await supabase
    .from("missing_items")
    .select("id", { count: "exact", head: true })
    .eq("page_type", pageType)
    .not("cleared_at", "is", null);

  if (error) throw error;
  return count ?? 0;
}

async function getDownloadedCount(pageType: PageType) {
  const { count, error } = await supabase
    .from("missing_items")
    .select("id", { count: "exact", head: true })
    .eq("page_type", pageType)
    .not("cleared_at", "is", null)
    .not("exported_at", "is", null);

  if (error) throw error;
  return count ?? 0;
}

async function getOldestOpenAt(pageType: PageType) {
  const { data, error } = await supabase
    .from("missing_items")
    .select("timestamp")
    .eq("page_type", pageType)
    .is("cleared_at", null)
    .eq("completed", false)
    .order("timestamp", { ascending: true })
    .limit(1);

  if (error) throw error;
  const timestamp = data?.[0]?.timestamp;
  return typeof timestamp === "string" ? timestamp : null;
}

export async function getAdminWarehouseSummaries(): Promise<
  AdminWarehouseSummary[]
> {
  return Promise.all(
    PageType.values.map(async (pageType) => {
      const [
        openCount,
        completedReadyCount,
        clearedCount,
        downloadedCount,
        oldestOpenAt,
      ] = await Promise.all([
        getOpenCount(pageType),
        getCompletedReadyCount(pageType),
        getClearedCount(pageType),
        getDownloadedCount(pageType),
        getOldestOpenAt(pageType),
      ]);

      return {
        pageType,
        openCount,
        completedReadyCount,
        clearedCount,
        downloadedCount,
        oldestOpenAt,
      };
    }),
  );
}

export function summarizeAdminMissingItems(
  activeItems: MissingItem[],
  clearedItems: MissingItem[],
): AdminWarehouseSummary[] {
  return PageType.values.map((pageType) => {
    const activeWarehouseItems = activeItems.filter(
      (item) => item.page_type === pageType,
    );
    const clearedCount = clearedItems.filter(
      (item) => item.page_type === pageType,
    ).length;
    const downloadedCount = clearedItems.filter(
      (item) => item.page_type === pageType && item.exported_at,
    ).length;
    const openItems = activeWarehouseItems.filter((item) => !item.completed);
    const oldestOpenAt = openItems.reduce<string | null>((oldest, item) => {
      if (!item.timestamp) return oldest;
      if (!oldest) return item.timestamp;
      return item.timestamp < oldest ? item.timestamp : oldest;
    }, null);

    return {
      pageType,
      openCount: openItems.length,
      completedReadyCount: activeWarehouseItems.length - openItems.length,
      clearedCount,
      downloadedCount,
      oldestOpenAt,
    };
  });
}
