import { PageType } from "./missingItems";

export type AppRole = "admin" | "exporter" | "operator" | `warehouse:${PageType}`;

export interface RoleClaims {
  userId: string;
  email: string | null;
  roles: AppRole[];
}

export interface AuthorizedWarehouseSet {
  canAdmin: boolean;
  canReport: boolean;
  canExport: boolean;
  warehouses: PageType[];
}

const warehouseRoles: Record<PageType, AppRole> = {
  tackle: "warehouse:tackle",
  tennis: "warehouse:tennis",
  running: "warehouse:running",
  inline: "warehouse:inline",
};

export function parseAppRoles(value: unknown): AppRole[] {
  if (!Array.isArray(value)) return [];

  return value.filter((role): role is AppRole => {
    if (typeof role !== "string") return false;
    return (
      role === "admin" ||
      role === "exporter" ||
      role === "operator" ||
      role === "warehouse:tackle" ||
      role === "warehouse:tennis" ||
      role === "warehouse:running" ||
      role === "warehouse:inline"
    );
  });
}

export function getAuthorizedWarehouseSet(
  claims: RoleClaims | null,
): AuthorizedWarehouseSet {
  const roles = claims?.roles ?? [];
  const canAdmin = roles.includes("admin");
  const warehouses = PageType.values.filter(
    (warehouse) => canAdmin || roles.includes(warehouseRoles[warehouse]),
  );

  return {
    canAdmin,
    canReport: canAdmin || roles.includes("operator") || warehouses.length > 0,
    canExport: canAdmin || roles.includes("exporter"),
    warehouses,
  };
}

export function canAccessWarehouse(
  claims: RoleClaims | null,
  warehouse: PageType,
) {
  if (!claims) return false;
  if (claims.roles.length === 0) return true;

  const access = getAuthorizedWarehouseSet(claims);
  return access.canAdmin || access.warehouses.includes(warehouse);
}

export function canExportWarehouse(
  claims: RoleClaims | null,
  warehouse: PageType,
) {
  const access = getAuthorizedWarehouseSet(claims);
  return access.canAdmin || (access.canExport && access.warehouses.includes(warehouse));
}
