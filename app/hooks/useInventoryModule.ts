"use client";

import { useMemo, useState } from "react";
import { useEnterpriseAccess } from "../components/shared/EnterpriseAccessProvider";

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

const normalizeRole = (value: string) => value.toLowerCase().replace(/\s+/g, "_");

export function useInventoryPermissions(): InventoryPermission {
  const { activeAssignment } = useEnterpriseAccess();

  return useMemo(() => {
    const role = normalizeRole(String(activeAssignment?.roles?.role_name || activeAssignment?.role || "viewer"));

    const isSuper = role.includes("super_admin") || role === "super_admin";
    const isAdmin = isSuper || role.includes("office_admin") || role === "admin";
    const isInventory = role.includes("inventory");
    const isManager = role.includes("manager") || role.includes("it_officer") || role.includes("it_staff");
    const isEmployee = role.includes("employee") || role.includes("crew_member");

    return {
      canView: true,
      canManageStock: isAdmin || isInventory || isManager,
      canManageWarehouses: isAdmin || isInventory,
      canManageRequests: isAdmin || isInventory || isManager || isEmployee,
      canManageTransfers: isAdmin || isInventory || isManager,
      canManageSuppliers: isAdmin || isInventory,
      canManageAudits: isAdmin || isInventory || isManager,
      canManageSettings: isAdmin,
      canExport: isAdmin || isInventory || isManager,
    };
  }, [activeAssignment?.role, activeAssignment?.roles?.role_name]);
}

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  return { toast, showToast, clearToast: () => setToast(null) };
}
