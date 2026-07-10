"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { buildAuditDescription, createAuditLog } from "../../lib/audit";
import {
  ACTIVE_ASSIGNMENT_STORAGE_KEY,
  canAccessVesselAssignments,
  canAccessWorkspaceAssignments,
  getAccessibleVessels,
  getAccessibleWorkspaces,
  getAssignmentLandingRoute,
  getCurrentAssignmentForPath,
  getRoleAssignmentsWithFallback,
  getUserProfile,
  UserProfile,
  UserRoleAssignment,
  WorkspaceScope,
} from "../../lib/rbac";

interface EnterpriseAccessContextValue {
  loading: boolean;
  profile: UserProfile | null;
  assignments: UserRoleAssignment[];
  activeAssignment: UserRoleAssignment | null;
  currentWorkspace: WorkspaceScope;
  accessibleWorkspaces: ReturnType<typeof getAccessibleWorkspaces>;
  accessibleVessels: ReturnType<typeof getAccessibleVessels>;
  canAccessWorkspace: (workspace: WorkspaceScope) => boolean;
  canAccessVessel: (vesselId: number | string) => boolean;
  refresh: () => Promise<void>;
  switchAssignment: (assignmentId: number) => Promise<void>;
}

export const EnterpriseAccessContext = createContext<EnterpriseAccessContextValue | null>(null);

export function EnterpriseAccessProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const refreshTimerRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [assignments, setAssignments] = useState<UserRoleAssignment[]>([]);
  const [activeAssignment, setActiveAssignment] = useState<UserRoleAssignment | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceScope>("company");
  const [accessibleWorkspaces, setAccessibleWorkspaces] = useState<ReturnType<typeof getAccessibleWorkspaces>>({
    office: false,
    fleet: false,
  });
  const [accessibleVessels, setAccessibleVessels] = useState<ReturnType<typeof getAccessibleVessels>>([]);

  const refresh = useCallback(async () => {
    setLoading(true);

    const currentProfile = await getUserProfile();
    if (!currentProfile) {
      setProfile(null);
      setAssignments([]);
      setActiveAssignment(null);
      setCurrentWorkspace("company");
      setAccessibleWorkspaces({ office: false, fleet: false });
      setAccessibleVessels([]);
      setLoading(false);
      return;
    }

    const currentAssignments = await getRoleAssignmentsWithFallback(currentProfile);
    const storedAssignmentId = typeof window === "undefined" ? null : Number(window.localStorage.getItem(ACTIVE_ASSIGNMENT_STORAGE_KEY));
    const activeFromPath = getCurrentAssignmentForPath(currentAssignments, pathname, Number.isNaN(storedAssignmentId) ? null : storedAssignmentId);
    const derivedWorkspace: WorkspaceScope =
      pathname?.startsWith("/office") ? "office" : pathname?.startsWith("/fleet/vessels/") ? "vessel" : pathname?.startsWith("/fleet") ? "fleet" : "company";

    if (activeFromPath && typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_ASSIGNMENT_STORAGE_KEY, String(activeFromPath.id));
    }

    setProfile(currentProfile);
    setAssignments(currentAssignments);
    setActiveAssignment(activeFromPath);
    setCurrentWorkspace(derivedWorkspace);
    setAccessibleWorkspaces(getAccessibleWorkspaces(currentAssignments));
    setAccessibleVessels(getAccessibleVessels(currentAssignments));
    setLoading(false);
  }, [pathname]);

  useEffect(() => {
    refreshTimerRef.current = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, [refresh]);

  useEffect(() => {
    const onStorage = () => {
      void refresh();
    };

    const onRoleChange = () => {
      void refresh();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("itinventory:access-changed", onRoleChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("itinventory:access-changed", onRoleChange);
    };
  }, [refresh]);

  const switchAssignment = useCallback(
    async (assignmentId: number) => {
      const targetAssignment = assignments.find((assignment) => assignment.id === assignmentId) ?? null;
      if (!targetAssignment) {
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_ASSIGNMENT_STORAGE_KEY, String(targetAssignment.id));
      }

      await createAuditLog({
        action: "Role Switch",
        description: buildAuditDescription({
          event: "Role Switch",
          userName: profile?.full_name || "Unknown User",
          recordType: "user_role",
          recordId: targetAssignment.id,
          itemName: targetAssignment.role,
          context: `Workspace: ${targetAssignment.workspace}`,
        }),
      });

      await createAuditLog({
        action: "Workspace Change",
        description: buildAuditDescription({
          event: "Workspace Change",
          userName: profile?.full_name || "Unknown User",
          recordType: "workspace",
          recordId: targetAssignment.id,
          itemName: targetAssignment.workspace,
          context: getAssignmentLandingRoute(targetAssignment),
        }),
      });

      window.dispatchEvent(new Event("itinventory:access-changed"));
      router.push(getAssignmentLandingRoute(targetAssignment));
    },
    [assignments, profile?.full_name, router]
  );

  const canAccessWorkspace = useCallback(
    (workspace: WorkspaceScope) => canAccessWorkspaceAssignments(assignments, workspace),
    [assignments]
  );

  const canAccessVessel = useCallback(
    (vesselId: number | string) => canAccessVesselAssignments(assignments, vesselId),
    [assignments]
  );

  const value = useMemo<EnterpriseAccessContextValue>(
    () => ({
      loading,
      profile,
      assignments,
      activeAssignment,
      currentWorkspace,
      accessibleWorkspaces,
      accessibleVessels,
      canAccessWorkspace,
      canAccessVessel,
      refresh,
      switchAssignment,
    }),
    [
      loading,
      profile,
      assignments,
      activeAssignment,
      currentWorkspace,
      accessibleWorkspaces,
      accessibleVessels,
      canAccessWorkspace,
      canAccessVessel,
      refresh,
      switchAssignment,
    ]
  );

  return <EnterpriseAccessContext.Provider value={value}>{children}</EnterpriseAccessContext.Provider>;
}

export function useEnterpriseAccess() {
  const context = useContext(EnterpriseAccessContext);
  if (!context) {
    throw new Error("useEnterpriseAccess must be used within EnterpriseAccessProvider");
  }

  return context;
}
