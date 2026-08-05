"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  buildDefaultOfficePermissions,
  getModulePermissionKeys,
  hasOfficePermission,
  isOfficeModuleEnabled,
  OfficeModuleId,
  OfficePermissionKey,
  OfficePermissionState,
} from "../lib/office-permissions";

type PermissionsPayload = {
  success?: boolean;
  data?: {
    is_admin?: boolean;
    office_access?: boolean;
    permissions?: OfficePermissionState;
  };
};

export interface OfficePermissionHookResult {
  loading: boolean;
  isAdmin: boolean;
  officeAccess: boolean;
  permissions: OfficePermissionState;
  can: (permission: OfficePermissionKey) => boolean;
  canModule: (moduleId: OfficeModuleId) => boolean;
  moduleAllSelected: (moduleId: OfficeModuleId) => boolean;
  refresh: () => Promise<void>;
}

export function useOfficePermissions(): OfficePermissionHookResult {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [officeAccess, setOfficeAccess] = useState(false);
  const [permissions, setPermissions] = useState<OfficePermissionState>(() => buildDefaultOfficePermissions(false));

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) {
        setIsAdmin(false);
        setOfficeAccess(false);
        setPermissions(buildDefaultOfficePermissions(false));
        return;
      }

      const response = await fetch("/api/office/permissions/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json()) as PermissionsPayload;
      if (!response.ok || !payload.success || !payload.data) {
        setIsAdmin(false);
        setOfficeAccess(false);
        setPermissions(buildDefaultOfficePermissions(false));
        return;
      }

      const admin = Boolean(payload.data.is_admin);
      const access = Boolean(payload.data.office_access) || admin;

      setIsAdmin(admin);
      setOfficeAccess(access);
      setPermissions(admin ? buildDefaultOfficePermissions(true) : payload.data.permissions || buildDefaultOfficePermissions(false));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const onPermissionChange = () => {
      void refresh();
    };

    window.addEventListener("itinventory:office-permissions-changed", onPermissionChange);

    return () => {
      window.removeEventListener("itinventory:office-permissions-changed", onPermissionChange);
    };
  }, [refresh]);

  const can = useCallback(
    (permission: OfficePermissionKey) => hasOfficePermission(permissions, permission, isAdmin),
    [isAdmin, permissions]
  );

  const canModule = useCallback(
    (moduleId: OfficeModuleId) => isOfficeModuleEnabled(permissions, moduleId, isAdmin),
    [isAdmin, permissions]
  );

  const moduleAllSelected = useCallback(
    (moduleId: OfficeModuleId) => {
      if (isAdmin) return true;
      const keys = getModulePermissionKeys(moduleId);
      return keys.length > 0 && keys.every((key) => Boolean(permissions[key]));
    },
    [isAdmin, permissions]
  );

  return useMemo(
    () => ({
      loading,
      isAdmin,
      officeAccess,
      permissions,
      can,
      canModule,
      moduleAllSelected,
      refresh,
    }),
    [loading, isAdmin, officeAccess, permissions, can, canModule, moduleAllSelected, refresh]
  );
}
