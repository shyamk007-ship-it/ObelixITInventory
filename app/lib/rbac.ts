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

  const { data } = await supabase
    .from("users")
    .select("id, full_name, email, role")
    .eq("email", user.email)
    .single();

  const role = normalizeRole(data?.role ?? user.user_metadata?.role ?? "employee");

  return {
    id: data?.id ?? 0,
    email: user.email,
    full_name: data?.full_name || user.user_metadata?.full_name || user.email,
    role,
  };
}
