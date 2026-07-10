import { PageType } from "./pageType";

export interface AdminWarehouseSummary {
  pageType: PageType;
  openCount: number;
  completedReadyCount: number;
  clearedCount: number;
  downloadedCount: number;
  oldestOpenAt: string | null;
}

function getObjectValue(value: unknown, key: string) {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined;
  }
  return value[key as keyof typeof value];
}

function parseCount(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

export function parseAdminWarehouseSummaries(
  value: unknown,
): AdminWarehouseSummary[] {
  if (!Array.isArray(value)) {
    throw new Error("Admin summary response must be an array.");
  }

  const summaries = new Map<PageType, AdminWarehouseSummary>();
  for (const row of value) {
    const pageType = PageType.parse(
      typeof getObjectValue(row, "page_type") === "string"
        ? String(getObjectValue(row, "page_type"))
        : null,
    );
    if (!pageType) throw new Error("Admin summary contains an unknown warehouse.");
    if (summaries.has(pageType)) {
      throw new Error(`Admin summary contains duplicate ${pageType} rows.`);
    }

    const openCount = parseCount(getObjectValue(row, "open_count"));
    const completedReadyCount = parseCount(
      getObjectValue(row, "completed_ready_count"),
    );
    const clearedCount = parseCount(getObjectValue(row, "cleared_count"));
    const downloadedCount = parseCount(getObjectValue(row, "downloaded_count"));
    if (
      openCount === null ||
      completedReadyCount === null ||
      clearedCount === null ||
      downloadedCount === null
    ) {
      throw new Error(`Admin summary for ${pageType} has invalid counts.`);
    }

    const oldestValue = getObjectValue(row, "oldest_open_at");
    if (oldestValue !== null && typeof oldestValue !== "string") {
      throw new Error(`Admin summary for ${pageType} has an invalid timestamp.`);
    }

    summaries.set(pageType, {
      pageType,
      openCount,
      completedReadyCount,
      clearedCount,
      downloadedCount,
      oldestOpenAt: oldestValue,
    });
  }

  return PageType.values.map((pageType) => {
    const summary = summaries.get(pageType);
    if (!summary) throw new Error(`Admin response is missing summary for ${pageType}.`);
    return summary;
  });
}
