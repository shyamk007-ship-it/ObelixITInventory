export type ManagedRole =
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
  | "employee";

export type ManagedWorkspace = "company" | "office" | "fleet" | "vessel";

export interface RoleAssignmentInput {
  role_id?: number | null;
  role: ManagedRole;
  workspace: ManagedWorkspace;
  vessel_id: number | null;
  department: string | null;
  is_active: boolean;
}

export interface UserManagementRecord {
  auth_user_id: string;
  full_name: string;
  email: string;
  role: ManagedRole;
  is_active: boolean;
  phone_number: string | null;
  profile_photo_url: string | null;
  force_password_change: boolean;
  created_at: string | null;
  last_sign_in_at: string | null;
  assignments: RoleAssignmentInput[];
}

export interface CreateUserPayload {
  full_name: string;
  email: string;
  role: ManagedRole;
  temporary_password?: string;
  is_active: boolean;
  force_password_change: boolean;
  assignments: RoleAssignmentInput[];
}

export interface UpdateUserPayload {
  full_name: string;
  role: ManagedRole;
  phone_number: string | null;
  is_active: boolean;
  force_password_change: boolean;
  assignments: RoleAssignmentInput[];
}
