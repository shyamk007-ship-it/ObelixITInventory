"use client";

import { useMemo, useState } from "react";
import { useEnterpriseAccess } from "../components/shared/EnterpriseAccessProvider";

export type PeoplePermission = {
  canView: boolean;
  canManageEmployees: boolean;
  canManageDepartments: boolean;
  canManageVisitors: boolean;
  canManageAttendance: boolean;
  canManageLeave: boolean;
  canManagePerformance: boolean;
  canManageTraining: boolean;
  canManageDocuments: boolean;
  canExport: boolean;
};

const normalizeRole = (value: string) => value.toLowerCase().replace(/\s+/g, "_");

export function usePeoplePermissions(): PeoplePermission {
  const { activeAssignment } = useEnterpriseAccess();

  return useMemo(() => {
    const role = normalizeRole(
      String(activeAssignment?.roles?.role_name || activeAssignment?.role || "viewer")
    );

    const isSuper = role.includes("super_admin") || role === "super_admin";
    const isAdmin = isSuper || role.includes("office_admin") || role === "admin";
    const isHR = role.includes("hr");
    const isManager = role.includes("manager") || role.includes("it_officer") || role.includes("it_staff");
    const isEmployee = role.includes("employee") || role.includes("crew_member");

    return {
      canView: true,
      canManageEmployees: isAdmin || isHR,
      canManageDepartments: isAdmin || isHR,
      canManageVisitors: isAdmin || isHR || isManager,
      canManageAttendance: isAdmin || isHR || isManager,
      canManageLeave: isAdmin || isHR || isManager,
      canManagePerformance: isAdmin || isHR || isManager,
      canManageTraining: isAdmin || isHR,
      canManageDocuments: isAdmin || isHR,
      canExport: isAdmin || isHR || isManager || isEmployee,
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
