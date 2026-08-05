"use client";

import { useMemo, useState } from "react";
import { useOfficePermissions } from "./useOfficePermissions";

export type InventoryPermission = {
  canView: boolean;
  canManageStock: boolean;
  canManageWarehouses: boolean;
  canManageRequests: boolean;
  canManageTransfers: boolean;
  canManageSuppliers: boolean;
  canManageAudits: boolean;
  canManageSettings: boolean;
  canExport: boolean;
};

export function useInventoryPermissions(): InventoryPermission {
  const { can } = useOfficePermissions();

  return useMemo(() => {
    const inventoryManage = can("inventory_create") || can("inventory_edit") || can("inventory_delete");

    return {
      canView: can("inventory_view") || can("warehouse_view"),
      canManageStock: inventoryManage,
      canManageWarehouses: can("warehouse_create") || can("warehouse_edit") || can("warehouse_delete"),
      canManageRequests: inventoryManage || can("procurement_create") || can("procurement_edit"),
      canManageTransfers: can("inventory_transfer"),
      canManageSuppliers: can("suppliers_create") || can("suppliers_edit") || can("suppliers_delete"),
      canManageAudits: can("inventory_edit"),
      canManageSettings: can("settings_edit"),
      canExport: can("inventory_export") || can("reports_export"),
    };
  }, [can]);
}

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  return { toast, showToast, clearToast: () => setToast(null) };
}
