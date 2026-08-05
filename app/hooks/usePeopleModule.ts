"use client";

import { useMemo, useState } from "react";
import { useOfficePermissions } from "./useOfficePermissions";

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

export function usePeoplePermissions(): PeoplePermission {
  const { can } = useOfficePermissions();

  return useMemo(() => {
    const employeeManage = can("employees_create") || can("employees_edit") || can("employees_delete");
    const departmentsManage = can("departments_create") || can("departments_edit") || can("departments_delete");
    const visitorsManage = can("visitors_create") || can("visitors_edit") || can("visitors_delete");

    return {
      canView: can("employees_view") || can("departments_view") || can("visitors_view"),
      canManageEmployees: employeeManage,
      canManageDepartments: departmentsManage,
      canManageVisitors: visitorsManage,
      canManageAttendance: employeeManage,
      canManageLeave: employeeManage,
      canManagePerformance: employeeManage,
      canManageTraining: employeeManage,
      canManageDocuments: employeeManage,
      canExport: can("employees_export") || can("reports_export"),
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
