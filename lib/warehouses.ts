import { PageType } from "./missingItems";

export interface WarehouseConfig {
  pageType: PageType;
  label: string;
  shortLabel: string;
  route: string;
  missingRoute: string;
  reportRoute: string;
  themeClass: string;
  buttonClass: string;
}

export const warehouses: Record<PageType, WarehouseConfig> = {
  tackle: {
    pageType: "tackle",
    label: "Tackle Warehouse",
    shortLabel: "Tackle",
    route: "/tackle",
    missingRoute: "/tackle-missing",
    reportRoute: "/report-missing?pageType=tackle",
    themeClass: "tackle-theme",
    buttonClass: "bg-red-500 hover:bg-red-600",
  },
  tennis: {
    pageType: "tennis",
    label: "Tennis Warehouse",
    shortLabel: "Tennis",
    route: "/tennis",
    missingRoute: "/tennis-missing",
    reportRoute: "/report-missing?pageType=tennis",
    themeClass: "tennis-theme",
    buttonClass: "bg-blue-600 hover:bg-blue-700",
  },
  running: {
    pageType: "running",
    label: "Running Warehouse",
    shortLabel: "Running",
    route: "/running",
    missingRoute: "/running-missing",
    reportRoute: "/report-missing?pageType=running",
    themeClass: "running-theme",
    buttonClass: "bg-green-800 hover:bg-green-900",
  },
  inline: {
    pageType: "inline",
    label: "Inline Warehouse",
    shortLabel: "Inline",
    route: "/inline",
    missingRoute: "/inline-missing",
    reportRoute: "/report-missing?pageType=inline",
    themeClass: "inline-theme",
    buttonClass: "bg-black hover:bg-red-600",
  },
};

export const warehouseList = PageType.values.map((pageType) => warehouses[pageType]);
