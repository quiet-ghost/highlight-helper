import { MissingItem, PageType, parseMissingItemRow } from "./missingItems";
import { supabase } from "./supabaseClient";

export type AdminWorkflowStatus =
  | "new"
  | "in_progress"
  | "completed_ready"
  | "cleared"
  | "downloaded";

export interface AdminWarehouseSummary {
  pageType: PageType;
  openCount: number;
  completedReadyCount: number;
  clearedCount: number;
  downloadedCount: number;
  oldestOpenAt: string | null;
}

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
