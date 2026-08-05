export type OfficeModuleId =
  | "dashboard"
  | "employees"
  | "departments"
  | "visitors"
  | "inventory"
  | "warehouse"
  | "procurement"
  | "purchase_orders"
  | "suppliers"
  | "assets"
  | "reports"
  | "notifications"
  | "settings";

export type OfficeAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "assign"
  | "return"
  | "transfer"
  | "approve"
  | "manage";

export interface OfficePermissionModule {
  id: OfficeModuleId;
  label: string;
  actions: OfficeAction[];
}

export const OFFICE_PERMISSION_MODULES: OfficePermissionModule[] = [
  { id: "dashboard", label: "Dashboard", actions: ["view"] },
  { id: "employees", label: "Employees", actions: ["view", "create", "edit", "delete", "export"] },
  { id: "departments", label: "Departments", actions: ["view", "create", "edit", "delete", "export"] },
  { id: "visitors", label: "Visitors", actions: ["view", "create", "edit", "delete", "export"] },
  { id: "inventory", label: "Inventory", actions: ["view", "create", "edit", "delete", "transfer", "export"] },
  { id: "warehouse", label: "Warehouse", actions: ["view", "create", "edit", "delete", "export"] },
  { id: "procurement", label: "Procurement", actions: ["view", "create", "edit", "approve", "export"] },
  { id: "purchase_orders", label: "Purchase Orders", actions: ["view", "create", "edit", "delete", "approve", "export"] },
  { id: "suppliers", label: "Suppliers", actions: ["view", "create", "edit", "delete", "export"] },
  { id: "assets", label: "Assets", actions: ["view", "create", "edit", "delete", "assign", "return", "export"] },
  { id: "reports", label: "Reports", actions: ["view", "export"] },
  { id: "notifications", label: "Notifications", actions: ["view", "manage"] },
  { id: "settings", label: "Settings", actions: ["view", "edit"] },
];

export type OfficePermissionKey = `${OfficeModuleId}_${OfficeAction}`;

export const OFFICE_PERMISSION_KEYS = OFFICE_PERMISSION_MODULES.flatMap((module) =>
  module.actions.map((action) => `${module.id}_${action}`)
) as OfficePermissionKey[];

export interface OfficePermissionState extends Record<OfficePermissionKey, boolean> {}

export interface OfficeUserRecord {
  id: number;
  auth_user_id: string;
  public_user_id: number | null;
  full_name: string;
  email: string;
  employee_id: string | null;
  department: string | null;
  designation: string | null;
  status: "active" | "inactive";
  is_admin: boolean;
  office_access: boolean;
  created_at: string;
  updated_at: string;
}

export const EMPTY_OFFICE_PERMISSIONS: OfficePermissionState = OFFICE_PERMISSION_KEYS.reduce(
  (acc, key) => ({ ...acc, [key]: false }),
  {} as OfficePermissionState
);

export const buildDefaultOfficePermissions = (isAdmin: boolean): OfficePermissionState => {
  if (!isAdmin) {
    return { ...EMPTY_OFFICE_PERMISSIONS };
  }

  return OFFICE_PERMISSION_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: true }),
    {} as OfficePermissionState
  );
};

const readBoolean = (value: unknown) => value === true || value === "true" || value === 1;

export const mapPermissionRowToState = (row: Record<string, unknown> | null | undefined, isAdmin: boolean): OfficePermissionState => {
  if (isAdmin) {
    return buildDefaultOfficePermissions(true);
  }

  if (!row) {
    return buildDefaultOfficePermissions(false);
  }

  return OFFICE_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = readBoolean(row[key]);
    return acc;
  }, { ...EMPTY_OFFICE_PERMISSIONS });
};

export const hasOfficePermission = (permissions: OfficePermissionState, key: OfficePermissionKey, isAdmin = false) => {
  if (isAdmin) {
    return true;
  }
  return Boolean(permissions[key]);
};

export const getModulePermissionKeys = (moduleId: OfficeModuleId) => {
  const module = OFFICE_PERMISSION_MODULES.find((item) => item.id === moduleId);
  if (!module) return [];
  return module.actions.map((action) => `${moduleId}_${action}` as OfficePermissionKey);
};

export const isOfficeModuleEnabled = (permissions: OfficePermissionState, moduleId: OfficeModuleId, isAdmin = false) => {
  if (isAdmin) {
    return true;
  }

  const keys = getModulePermissionKeys(moduleId);
  return keys.some((key) => Boolean(permissions[key]));
};

const ROUTE_PERMISSION_RULES: Array<{ prefix: string; permission: OfficePermissionKey }> = [
  { prefix: "/office/dashboard", permission: "dashboard_view" },
  { prefix: "/office/employees", permission: "employees_view" },
  { prefix: "/office/people/employees", permission: "employees_view" },
  { prefix: "/office/people/departments", permission: "departments_view" },
  { prefix: "/office/people/visitors", permission: "visitors_view" },
  { prefix: "/office/inventory/warehouses", permission: "warehouse_view" },
  { prefix: "/office/inventory/suppliers", permission: "suppliers_view" },
  { prefix: "/office/inventory", permission: "inventory_view" },
  { prefix: "/office/purchase-requests", permission: "procurement_view" },
  { prefix: "/office/purchase-orders", permission: "purchase_orders_view" },
  { prefix: "/office/vendors", permission: "suppliers_view" },
  { prefix: "/office/assets", permission: "assets_view" },
  { prefix: "/office/assignments", permission: "assets_view" },
  { prefix: "/office/tickets", permission: "employees_view" },
  { prefix: "/office/knowledge-base", permission: "employees_view" },
  { prefix: "/office/sla", permission: "employees_view" },
  { prefix: "/office/reports", permission: "reports_view" },
  { prefix: "/office/analytics", permission: "reports_view" },
  { prefix: "/office/activity", permission: "reports_view" },
  { prefix: "/office/network", permission: "reports_view" },
  { prefix: "/office/settings", permission: "settings_view" },
  { prefix: "/office/users", permission: "settings_edit" },
  { prefix: "/office/roles", permission: "settings_edit" },
  { prefix: "/office/company-profile", permission: "settings_edit" },
];

export const getOfficeRoutePermission = (pathname: string | null): OfficePermissionKey | null => {
  if (!pathname || !pathname.startsWith("/office")) {
    return null;
  }

  const match = ROUTE_PERMISSION_RULES.find((rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`));
  return match ? match.permission : null;
};
