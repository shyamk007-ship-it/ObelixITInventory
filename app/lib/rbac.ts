import { supabase } from "./supabase";

export type Role =
  | "super_admin"
  | "office_admin"
  | "fleet_admin"
  | "captain"
  | "chief_engineer"
  | "it_officer"
  | "crew_member"
  | "admin"
  | "it_staff"
  | "eto"
  | "employee"
  | "unknown";

export type WorkspaceScope = "company" | "office" | "fleet" | "vessel";

export interface UserRoleAssignment {
  id: number;
  user_id: string;
  role: Role;
  workspace: WorkspaceScope;
  vessel_id: number | null;
  department: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: Role;
}

export const OWNER_SUPER_ADMIN_EMAIL = "shyam@shipmanager.in";

export const isOwnerEmail = (email?: string | null) =>
  (email || "").trim().toLowerCase() === OWNER_SUPER_ADMIN_EMAIL;

const normalizeRole = (rawRole?: string | null): Role => {
  const role = rawRole?.toLowerCase();

  if (!role) return "unknown";
  if (role === "super_admin" || role === "super admin") return "super_admin";
  if (role === "office_admin" || role === "office admin") return "office_admin";
  if (role === "fleet_admin" || role === "fleet admin") return "fleet_admin";
  if (role === "captain") return "captain";
  if (role === "chief_engineer" || role === "chief engineer") return "chief_engineer";
  if (role === "it_officer" || role === "it officer" || role === "it-officer") return "it_officer";
  if (role === "crew_member" || role === "crew member") return "crew_member";
  if (role === "eto" || role === "electro technical officer") return "it_officer";
  if (role === "admin") return "office_admin";
  if (role === "it_staff" || role === "it staff" || role === "it-staff") return "it_officer";
  if (role === "employee" || role === "viewer") return "crew_member";

  return "unknown";
};

export const roleLabel: Record<Role, string> = {
  super_admin: "Super Administrator",
  office_admin: "Office Administrator",
  fleet_admin: "Fleet Administrator",
  captain: "Captain",
  chief_engineer: "Chief Engineer",
  it_officer: "IT Officer",
  crew_member: "Crew Member",
  admin: "Office Administrator",
  it_staff: "IT Officer",
  eto: "IT Officer",
  employee: "Crew Member",
  unknown: "Unknown",
};

export const isOfficeRole = (role: Role) =>
  role === "super_admin" || role === "office_admin" || role === "admin" || role === "it_staff";
export const isFleetRole = (role: Role) =>
  role === "super_admin" || role === "fleet_admin" || role === "captain" || role === "chief_engineer" || role === "it_officer" || role === "crew_member" || role === "eto";
export const isVesselAssignedRole = (role: Role) =>
  role === "captain" || role === "chief_engineer" || role === "it_officer" || role === "crew_member" || role === "eto" || role === "employee";

export const canViewAdminDashboard = (role: Role) => isOfficeRole(role);
export const canAccessAdmin = (role: Role) => isOfficeRole(role);
export const canManageUsers = (role: Role) => role === "super_admin" || role === "admin";
export const canManageAssets = (role: Role) => isOfficeRole(role);
export const canViewEmployees = (role: Role) => isOfficeRole(role);
export const canAssignAssets = (role: Role) => isOfficeRole(role);
export const isEmployee = (role: Role) => role === "employee" || role === "crew_member";

export const ACTIVE_ASSIGNMENT_STORAGE_KEY = "itinventory.active_role_assignment_id";

const workspaceLabel: Record<WorkspaceScope, string> = {
  company: "Company Portal",
  office: "Office Workspace",
  fleet: "Fleet Workspace",
  vessel: "Assigned Vessel Workspace",
};

export const getWorkspaceForRole = (role: Role): WorkspaceScope => {
  if (role === "super_admin") return "company";
  if (isOfficeRole(role)) return "office";
  if (role === "fleet_admin") return "fleet";
  if (isVesselAssignedRole(role)) return "vessel";
  return "company";
};

export const getWorkspaceLabel = (workspace: WorkspaceScope) => workspaceLabel[workspace];

export const getRoleWorkspaceHint = (role: Role) => {
  const workspace = getWorkspaceForRole(role);
  if (workspace === "company") return "Company Portal";
  return workspaceLabel[workspace];
};

const toNumberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const getLegacyWorkspaceForProfile = (role: Role): WorkspaceScope => {
  if (role === "super_admin") return "company";
  if (role === "office_admin" || role === "admin" || role === "it_staff") return "office";
  if (role === "fleet_admin") return "fleet";
  if (isVesselAssignedRole(role)) return "vessel";
  return "company";
};

const buildVirtualAssignment = (profile: UserProfile): UserRoleAssignment | null => {
  const workspace = getLegacyWorkspaceForProfile(profile.role);
  if (workspace === "company" && profile.role !== "super_admin") return null;

  return {
    id: Number(profile.id || 0),
    user_id: String(profile.id || 0),
    role: normalizeRole(profile.role),
    workspace,
    vessel_id: null,
    department: null,
    is_active: true,
  };
};

const getAuthUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
};

export async function getUserRoleAssignments(): Promise<UserRoleAssignment[]> {
  const user = await getAuthUser();
  if (!user) return [];

  if (isOwnerEmail(user.email)) {
    return [
      {
        id: 1,
        user_id: user.id,
        role: "super_admin",
        workspace: "company",
        vessel_id: null,
        department: "System Owner",
        is_active: true,
      },
    ];
  }

  const userId = user.id;

  const { data, error } = await supabase
    .from("user_roles")
    .select("id, user_id, role, workspace, vessel_id, department, is_active, created_at, updated_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((record) => ({
    id: Number(record.id),
    user_id: String(record.user_id),
    role: normalizeRole(String(record.role)),
    workspace: String(record.workspace || "company").toLowerCase() as WorkspaceScope,
    vessel_id: toNumberOrNull(record.vessel_id),
    department: record.department ? String(record.department) : null,
    is_active: Boolean(record.is_active),
    created_at: record.created_at ?? null,
    updated_at: record.updated_at ?? null,
  }));
}

export async function getRoleAssignmentsWithFallback(profile: UserProfile): Promise<UserRoleAssignment[]> {
  const assignments = await getUserRoleAssignments();
  if (assignments.length > 0) {
    return assignments;
  }

  const virtualAssignment = buildVirtualAssignment(profile);
  return virtualAssignment ? [virtualAssignment] : [];
}

export const getAssignmentWorkspaceLabel = (assignment: UserRoleAssignment | null) =>
  assignment ? getWorkspaceLabel(assignment.workspace) : "Company Portal";

export const getAssignmentLandingRoute = (assignment: UserRoleAssignment | null) => {
  if (!assignment) return "/";

  if (assignment.workspace === "office") return "/office/dashboard";
  if (assignment.workspace === "fleet") return "/fleet/dashboard";
  if (assignment.workspace === "vessel" && assignment.vessel_id) {
    return `/fleet/vessels/${assignment.vessel_id}`;
  }

  return "/";
};

export const getAccessibleWorkspaces = (assignments: UserRoleAssignment[]) => {
  const hasOffice = assignments.some((assignment) => assignment.workspace === "office" || assignment.role === "super_admin");
  const hasFleet = assignments.some((assignment) => assignment.workspace === "fleet" || assignment.role === "super_admin");
  return {
    office: hasOffice,
    fleet: hasFleet,
  };
};

export const getAccessibleVessels = (assignments: UserRoleAssignment[]) =>
  assignments
    .filter((assignment) => assignment.workspace === "vessel" && assignment.vessel_id !== null)
    .map((assignment) => ({
      id: Number(assignment.vessel_id),
      label: `${roleLabel[assignment.role] || assignment.role} ${assignment.department ? `- ${assignment.department}` : ""}`.trim(),
    }));

export const canAccessWorkspaceAssignments = (assignments: UserRoleAssignment[], workspace: WorkspaceScope) => {
  if (assignments.some((assignment) => assignment.role === "super_admin")) {
    return true;
  }

  if (workspace === "office") {
    return assignments.some((assignment) => assignment.workspace === "office");
  }

  if (workspace === "fleet") {
    return assignments.some((assignment) => assignment.workspace === "fleet");
  }

  if (workspace === "vessel") {
    return assignments.some((assignment) => assignment.workspace === "vessel");
  }

  return true;
};

export const canAccessVesselAssignments = (assignments: UserRoleAssignment[], vesselId: number | string) => {
  const targetId = String(vesselId);
  return assignments.some((assignment) => {
    if (assignment.role === "super_admin") return true;
    return assignment.workspace === "vessel" && assignment.vessel_id !== null && String(assignment.vessel_id) === targetId;
  });
};

export const getCurrentAssignmentForPath = (assignments: UserRoleAssignment[], pathname: string | null, activeAssignmentId: number | null) => {
  if (assignments.length === 0) return null;

  const byId = activeAssignmentId !== null ? assignments.find((assignment) => assignment.id === activeAssignmentId) ?? null : null;
  if (byId && canAccessPath([byId], pathname)) return byId;

  if (pathname?.startsWith("/office")) {
    return assignments.find((assignment) => assignment.workspace === "office") ?? null;
  }

  if (pathname?.startsWith("/fleet/vessels/")) {
    const vesselId = pathname.split("/")[3];
    return assignments.find((assignment) => assignment.workspace === "vessel" && String(assignment.vessel_id) === vesselId) ?? null;
  }

  if (pathname?.startsWith("/fleet")) {
    return assignments.find((assignment) => assignment.workspace === "fleet") ?? null;
  }

  return assignments[0] ?? null;
};

export const canAccessPath = (assignments: UserRoleAssignment[], pathname: string | null) => {
  if (!pathname) return true;
  if (pathname === "/" || pathname === "/login" || pathname === "/unauthorized" || pathname === "/workspace") return true;

  if (pathname.startsWith("/office")) {
    return canAccessWorkspaceAssignments(assignments, "office");
  }

  if (pathname.startsWith("/fleet/vessels/")) {
    const vesselId = pathname.split("/")[3];
    return canAccessVesselAssignments(assignments, vesselId);
  }

  if (pathname.startsWith("/fleet")) {
    return canAccessWorkspaceAssignments(assignments, "fleet");
  }

  return true;
};

export async function getEnterpriseLandingRoute(profile: UserProfile): Promise<string> {
  const assignments = await getRoleAssignmentsWithFallback(profile);
  const vesselAssignment = assignments.find((assignment) => assignment.workspace === "vessel" && assignment.vessel_id !== null);
  const hasOfficeOrFleet = assignments.some((assignment) => assignment.workspace === "office" || assignment.workspace === "fleet");

  if (!hasOfficeOrFleet && vesselAssignment) {
    return getAssignmentLandingRoute(vesselAssignment);
  }

  if (!hasOfficeOrFleet && isVesselAssignedRole(profile.role)) {
    const vesselId = await getAssignedVesselId(profile);
    if (vesselId) {
      return `/fleet/vessels/${vesselId}`;
    }
  }

  return "/";
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return null;
  }

  const normalizedEmail = user.email.trim().toLowerCase();

  const tryQuery = async (table: string) => {
    const { data, error } = await supabase
      .from(table)
      .select("id, full_name, email, role")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    return { data, error };
  };

  const userTable = await tryQuery("users");
  if (!userTable.error && userTable.data) {
    const resolvedEmail = userTable.data.email || user.email;
    return {
      id: userTable.data.id ?? 0,
      email: resolvedEmail,
      full_name: userTable.data.full_name || user.user_metadata?.full_name || user.email,
      role: isOwnerEmail(resolvedEmail)
        ? "super_admin"
        : normalizeRole(userTable.data.role ?? user.user_metadata?.role ?? "employee"),
    };
  }

  const usersProfilesTable = await tryQuery("users_profiles");
  if (!usersProfilesTable.error && usersProfilesTable.data) {
    const resolvedEmail = usersProfilesTable.data.email || user.email;
    return {
      id: usersProfilesTable.data.id ?? 0,
      email: resolvedEmail,
      full_name: usersProfilesTable.data.full_name || user.user_metadata?.full_name || user.email,
      role: isOwnerEmail(resolvedEmail)
        ? "super_admin"
        : normalizeRole(usersProfilesTable.data.role ?? user.user_metadata?.role ?? "employee"),
    };
  }

  const employeesTable = await tryQuery("employees");
  if (!employeesTable.error && employeesTable.data) {
    const resolvedEmail = employeesTable.data.email || user.email;
    return {
      id: employeesTable.data.id ?? 0,
      email: resolvedEmail,
      full_name: employeesTable.data.full_name || user.user_metadata?.full_name || user.email,
      role: isOwnerEmail(resolvedEmail)
        ? "super_admin"
        : normalizeRole(employeesTable.data.role ?? user.user_metadata?.role ?? "employee"),
    };
  }

  const fallbackEmail = user.email;
  return {
    id: 0,
    email: fallbackEmail,
    full_name: user.user_metadata?.full_name || user.email,
    role: isOwnerEmail(fallbackEmail) ? "super_admin" : normalizeRole(user.user_metadata?.role ?? "employee"),
  };
}

const getAssignedVesselId = async (profile: UserProfile): Promise<number | null> => {
  const normalizedEmail = profile.email.trim().toLowerCase();

  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  const employeeRecord = employee as
    | {
        vessel_id?: number | string | null;
        assigned_vessel_id?: number | string | null;
        current_vessel_id?: number | string | null;
      }
    | null;
  const employeeVesselId =
    employeeRecord &&
    (employeeRecord.vessel_id ?? employeeRecord.assigned_vessel_id ?? employeeRecord.current_vessel_id ?? null);

  if (employeeVesselId) {
    return Number(employeeVesselId);
  }

  if (profile.role === "captain") {
    const { data: captainVessel } = await supabase
      .from("vessels")
      .select("id")
      .ilike("captain", profile.full_name)
      .limit(1)
      .maybeSingle();

    if (captainVessel?.id) {
      return Number(captainVessel.id);
    }
  }

  return null;
};

export async function getPostLoginRoute(profile: UserProfile): Promise<string> {
  return getEnterpriseLandingRoute(profile);
}
