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

export interface RoleLookup {
  id: string;
  role_name: string;
}

export interface RoleAssignmentInput {
  role_id: string;
  role: ManagedRole;
  roles?: RoleLookup;
  workspace: ManagedWorkspace;
  vessel_id: number | null;
  department: string | null;
  is_active: boolean;
}

export interface UserManagementRecord {
  auth_user_id: string;
  full_name: string;
  employee_id: string | null;
  email: string;
  role: ManagedRole;
  designation: string | null;
  is_active: boolean;
  is_locked: boolean;
  phone_number: string | null;
  profile_photo_url: string | null;
  force_password_change: boolean;
  last_password_reset: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  assignments: RoleAssignmentInput[];
}

export interface CreateUserPayload {
  full_name: string;
  employee_id?: string | null;
  email: string;
  role: ManagedRole;
  temporary_password?: string;
  phone_number?: string | null;
  designation?: string | null;
  profile_photo_url?: string | null;
  is_active: boolean;
  force_password_change: boolean;
  assignments: RoleAssignmentInput[];
}

export interface UpdateUserPayload {
  full_name: string;
  employee_id?: string | null;
  role: ManagedRole;
  phone_number: string | null;
  designation?: string | null;
  profile_photo_url?: string | null;
  is_active: boolean;
  force_password_change: boolean;
  assignments: RoleAssignmentInput[];
}
