import { supabase } from "./supabase";

export type Role = "admin" | "it_staff" | "employee" | "unknown";

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: Role;
}

const normalizeRole = (rawRole?: string | null): Role => {
  const role = rawRole?.toLowerCase();

  if (!role) return "unknown";
  if (role === "super_admin" || role === "admin") return "admin";
  if (role === "it_staff" || role === "it staff" || role === "it-staff") return "it_staff";
  if (role === "employee" || role === "viewer") return "employee";

  return "unknown";
};

export const roleLabel: Record<Role, string> = {
  admin: "Admin",
  it_staff: "IT Staff",
  employee: "Employee",
  unknown: "Unknown",
};

export const canViewAdminDashboard = (role: Role) => role === "admin" || role === "it_staff";
export const canAccessAdmin = (role: Role) => role === "admin" || role === "it_staff";
export const canManageUsers = (role: Role) => role === "admin";
export const canManageAssets = (role: Role) => role === "admin" || role === "it_staff";
export const canViewEmployees = (role: Role) => role === "admin" || role === "it_staff";
export const canAssignAssets = (role: Role) => role === "admin" || role === "it_staff";
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
