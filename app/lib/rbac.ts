import { supabase } from "./supabase";

export type Role =
  | "super_admin"
  | "office_admin"
  | "fleet_admin"
  | "eto"
  | "captain"
  | "admin"
  | "it_staff"
  | "employee"
  | "unknown";

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: Role;
}

const normalizeRole = (rawRole?: string | null): Role => {
  const role = rawRole?.toLowerCase();

  if (!role) return "unknown";
  if (role === "super_admin" || role === "super admin") return "super_admin";
  if (role === "office_admin" || role === "office admin") return "office_admin";
  if (role === "fleet_admin" || role === "fleet admin") return "fleet_admin";
  if (role === "eto" || role === "electro technical officer") return "eto";
  if (role === "captain") return "captain";
  if (role === "admin") return "admin";
  if (role === "it_staff" || role === "it staff" || role === "it-staff") return "it_staff";
  if (role === "employee" || role === "viewer") return "employee";

  return "unknown";
};

export const roleLabel: Record<Role, string> = {
  super_admin: "Super Admin",
  office_admin: "Office Admin",
  fleet_admin: "Fleet Admin",
  eto: "ETO",
  captain: "Captain",
  admin: "Admin",
  it_staff: "IT Staff",
  employee: "Employee",
  unknown: "Unknown",
};

export const isOfficeRole = (role: Role) =>
  role === "super_admin" || role === "office_admin" || role === "admin" || role === "it_staff";
export const isFleetRole = (role: Role) =>
  role === "super_admin" || role === "fleet_admin" || role === "eto" || role === "captain";
export const isVesselAssignedRole = (role: Role) => role === "eto" || role === "captain";

export const canViewAdminDashboard = (role: Role) => isOfficeRole(role);
export const canAccessAdmin = (role: Role) => isOfficeRole(role);
export const canManageUsers = (role: Role) => role === "super_admin" || role === "admin";
export const canManageAssets = (role: Role) => isOfficeRole(role);
export const canViewEmployees = (role: Role) => isOfficeRole(role);
export const canAssignAssets = (role: Role) => isOfficeRole(role);
export const isEmployee = (role: Role) => role === "employee";

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
    return {
      id: userTable.data.id ?? 0,
      email: userTable.data.email || user.email,
      full_name: userTable.data.full_name || user.user_metadata?.full_name || user.email,
      role: normalizeRole(userTable.data.role ?? user.user_metadata?.role ?? "employee"),
    };
  }

  const usersProfilesTable = await tryQuery("users_profiles");
  if (!usersProfilesTable.error && usersProfilesTable.data) {
    return {
      id: usersProfilesTable.data.id ?? 0,
      email: usersProfilesTable.data.email || user.email,
      full_name: usersProfilesTable.data.full_name || user.user_metadata?.full_name || user.email,
      role: normalizeRole(usersProfilesTable.data.role ?? user.user_metadata?.role ?? "employee"),
    };
  }

  const employeesTable = await tryQuery("employees");
  if (!employeesTable.error && employeesTable.data) {
    return {
      id: employeesTable.data.id ?? 0,
      email: employeesTable.data.email || user.email,
      full_name: employeesTable.data.full_name || user.user_metadata?.full_name || user.email,
      role: normalizeRole(employeesTable.data.role ?? user.user_metadata?.role ?? "employee"),
    };
  }

  return {
    id: 0,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email,
    role: normalizeRole(user.user_metadata?.role ?? "employee"),
  };
}

const getAssignedVesselId = async (profile: UserProfile): Promise<number | null> => {
  const normalizedEmail = profile.email.trim().toLowerCase();

  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  const employeeRecord = employee as Record<string, any> | null;
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
  void profile;
  return "/";
}
