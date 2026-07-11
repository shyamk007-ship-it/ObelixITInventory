import type { UserManagementRecord } from "./user-management";

export type WorkspaceView = "all" | "office" | "fleet";

export const getWorkspaceScopeFromPathname = (pathname?: string | null): WorkspaceView => {
  if (!pathname) return "all";
  if (pathname.startsWith("/office")) return "office";
  if (pathname.startsWith("/fleet")) return "fleet";
  return "all";
};

export const hasVesselLink = (value: unknown) => value !== null && value !== undefined && value !== "";

export const matchesWorkspaceByVesselId = (value: unknown, workspace: WorkspaceView) => {
  if (workspace === "all") return true;
  return workspace === "office" ? !hasVesselLink(value) : hasVesselLink(value);
};

export const filterByWorkspaceVesselId = <T extends { vessel_id?: unknown }>(rows: T[], workspace: WorkspaceView) =>
  rows.filter((row) => matchesWorkspaceByVesselId(row.vessel_id, workspace));

export const matchesUserWorkspace = (user: UserManagementRecord, workspace: WorkspaceView) => {
  if (workspace === "all") return true;
  if (user.role === "super_admin") return true;

  const assignment = user.assignments[0] || null;
  const assignmentWorkspace = assignment?.workspace || "company";

  if (workspace === "office") {
    return assignmentWorkspace === "office" || assignmentWorkspace === "company";
  }

  return assignmentWorkspace === "fleet" || assignmentWorkspace === "company" || assignmentWorkspace === "vessel";
};

export const getWorkspaceDefaultAssignment = (workspace: WorkspaceView) => {
  if (workspace === "fleet") return "fleet" as const;
  if (workspace === "office") return "office" as const;
  return "office" as const;
};