import "server-only";

import { getSupabaseAdmin } from "./supabaseAdmin";
import {
  buildDefaultOfficePermissions,
  mapPermissionRowToState,
  OfficePermissionKey,
  OFFICE_PERMISSION_KEYS,
  OfficePermissionState,
} from "../office-permissions";
import { isOwnerEmail } from "../rbac";

interface OfficeAccessResult {
  isAdmin: boolean;
  officeAccess: boolean;
  permissions: OfficePermissionState;
  officeUserId: number | null;
}

const isRelationMissing = (message: string | null | undefined) => {
  const normalized = String(message || "").toLowerCase();
  return normalized.includes("does not exist") && (normalized.includes("office_users") || normalized.includes("office_permissions"));
};

const getMetadataPermissions = (metadata: Record<string, unknown> | null | undefined, isAdmin: boolean) => {
  if (isAdmin) {
    return buildDefaultOfficePermissions(true);
  }

  const rawPermissions = metadata?.office_permissions;
  if (rawPermissions && typeof rawPermissions === "object" && !Array.isArray(rawPermissions)) {
    return sanitizePermissionInput(rawPermissions as Record<string, unknown>, false);
  }

  return buildDefaultOfficePermissions(false);
};

const normalizeEmail = (value: string | null | undefined) => String(value || "").trim().toLowerCase();

const roleCanAdmin = (value: string | null | undefined) => {
  const role = String(value || "").trim().toLowerCase();
  return role === "super_admin" || role === "office_admin" || role === "admin";
};

const toPermissionInsertPayload = (permissions: OfficePermissionState) =>
  OFFICE_PERMISSION_KEYS.reduce<Record<string, boolean>>((acc, key) => {
    acc[key] = Boolean(permissions[key]);
    return acc;
  }, {});

const toAuditDescription = (action: string, actorEmail: string, targetEmail: string, context: string) =>
  `${action} | actor=${actorEmail || "unknown"} | target=${targetEmail || "unknown"} | ${context}`;

export const getRequestIp = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
  if (!forwarded) return null;
  return forwarded.split(",")[0]?.trim() || null;
};

export async function createOfficePermissionAuditLog({
  actorAuthUserId,
  actorEmail,
  targetAuthUserId,
  targetEmail,
  action,
  module,
  context,
  ipAddress,
}: {
  actorAuthUserId?: string | null;
  actorEmail?: string | null;
  targetAuthUserId?: string | null;
  targetEmail?: string | null;
  action: string;
  module: string;
  context: string;
  ipAddress?: string | null;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin.from("office_permission_audit_logs").insert({
    actor_auth_user_id: actorAuthUserId || null,
    actor_email: actorEmail || null,
    target_auth_user_id: targetAuthUserId || null,
    target_email: targetEmail || null,
    action,
    module,
    context,
    ip_address: ipAddress || null,
  });

  await supabaseAdmin.from("audit_logs").insert({
    action,
    description: toAuditDescription(action, actorEmail || "", targetEmail || "", `${module} | ${context}`),
    user_id: actorAuthUserId || null,
  });
}

export async function getOfficeAccessForAuthUser(authUserId: string, email: string): Promise<OfficeAccessResult> {
  const supabaseAdmin = getSupabaseAdmin();
  const normalizedEmail = normalizeEmail(email);

  const authLookup = await supabaseAdmin.auth.admin.getUserById(authUserId);
  const authMetadata = (authLookup.data.user?.user_metadata || {}) as Record<string, unknown>;

  if (isOwnerEmail(normalizedEmail)) {
    return {
      isAdmin: true,
      officeAccess: true,
      permissions: buildDefaultOfficePermissions(true),
      officeUserId: null,
    };
  }

  const officeUserLookup = await supabaseAdmin
    .from("office_users")
    .select("id, auth_user_id, email, is_admin, office_access")
    .or(`auth_user_id.eq.${authUserId},email.ilike.${normalizedEmail}`)
    .maybeSingle();

  if (officeUserLookup.error && !isRelationMissing(officeUserLookup.error.message)) {
    return {
      isAdmin: Boolean(authMetadata.office_is_admin),
      officeAccess: Boolean(authMetadata.office_access ?? true),
      permissions: getMetadataPermissions(authMetadata, Boolean(authMetadata.office_is_admin)),
      officeUserId: null,
    };
  }

  const officeUser = officeUserLookup.data as
    | { id: number; auth_user_id: string; email: string; is_admin: boolean; office_access: boolean }
    | null;

  if (officeUser) {
    const permissionsLookup = await supabaseAdmin
      .from("office_permissions")
      .select("*")
      .eq("office_user_id", officeUser.id)
      .maybeSingle();

    const isAdmin = Boolean(officeUser.is_admin);
    return {
      isAdmin,
      officeAccess: Boolean(officeUser.office_access),
      permissions: mapPermissionRowToState(permissionsLookup.data as Record<string, unknown> | null, isAdmin),
      officeUserId: officeUser.id,
    };
  }

  const publicUserLookup = await supabaseAdmin
    .from("users")
    .select("id, email, role")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  const publicUser = publicUserLookup.data as { id?: number; email?: string; role?: string } | null;
  const publicUserId = publicUser?.id ? String(publicUser.id) : "";

  const assignments = publicUserId
    ? await supabaseAdmin
        .from("user_roles")
        .select("workspace, roles:role_id(role_name)")
        .eq("user_id", publicUserId)
        .eq("is_active", true)
    : { data: [] as Array<{ workspace?: string; roles?: { role_name?: string } | Array<{ role_name?: string }> }> };

  const roleFromAssignments = (assignments.data || []).some((assignment) => {
    const roleLookup = Array.isArray(assignment.roles) ? assignment.roles[0] : assignment.roles;
    return roleCanAdmin(roleLookup?.role_name);
  });

  const hasOfficeWorkspace = (assignments.data || []).some((assignment) => String(assignment.workspace || "") === "office");
  const isAdmin = roleCanAdmin(publicUser?.role) || roleFromAssignments;
  const metadataAdmin = Boolean(authMetadata.office_is_admin);
  const effectiveAdmin = isAdmin || metadataAdmin;
  const metadataAccess = Boolean(authMetadata.office_access ?? true);

  return {
    isAdmin: effectiveAdmin,
    officeAccess: effectiveAdmin || hasOfficeWorkspace || metadataAccess,
    permissions: getMetadataPermissions(authMetadata, effectiveAdmin),
    officeUserId: null,
  };
}

export async function upsertOfficeUserAndPermissions({
  authUserId,
  publicUserId,
  fullName,
  email,
  employeeId,
  department,
  designation,
  status,
  isAdmin,
  officeAccess,
  permissions,
}: {
  authUserId: string;
  publicUserId: number | null;
  fullName: string;
  email: string;
  employeeId: string | null;
  department: string | null;
  designation: string | null;
  status: "active" | "inactive";
  isAdmin: boolean;
  officeAccess: boolean;
  permissions: OfficePermissionState;
}) {
  const supabaseAdmin = getSupabaseAdmin();

  const authLookup = await supabaseAdmin.auth.admin.getUserById(authUserId);
  if (!authLookup.error && authLookup.data.user) {
    const existingMetadata = (authLookup.data.user.user_metadata || {}) as Record<string, unknown>;
    const metadataResult = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      user_metadata: {
        ...existingMetadata,
        office_is_admin: isAdmin,
        office_access: officeAccess,
        office_permissions: permissions,
      },
    });

    if (metadataResult.error) {
      throw new Error(metadataResult.error.message);
    }
  }

  const upsertOfficeUser = await supabaseAdmin
    .from("office_users")
    .upsert(
      {
        auth_user_id: authUserId,
        public_user_id: publicUserId,
        full_name: fullName,
        email: normalizeEmail(email),
        employee_id: employeeId,
        department,
        designation,
        status,
        is_admin: isAdmin,
        office_access: officeAccess,
      },
      { onConflict: "auth_user_id" }
    )
    .select("id")
    .single();

  if (upsertOfficeUser.error && isRelationMissing(upsertOfficeUser.error.message)) {
    return null;
  }

  if (upsertOfficeUser.error || !upsertOfficeUser.data?.id) {
    throw new Error(upsertOfficeUser.error?.message || "Failed to upsert office user.");
  }

  const officeUserId = Number(upsertOfficeUser.data.id);
  const permissionPayload = toPermissionInsertPayload(permissions);

  const permissionUpsert = await supabaseAdmin.from("office_permissions").upsert(
    {
      office_user_id: officeUserId,
      ...permissionPayload,
    },
    { onConflict: "office_user_id" }
  );

  if (permissionUpsert.error && isRelationMissing(permissionUpsert.error.message)) {
    return officeUserId;
  }

  if (permissionUpsert.error) {
    throw new Error(permissionUpsert.error.message);
  }

  return officeUserId;
}

export function sanitizePermissionInput(input: Record<string, unknown> | null | undefined, isAdmin: boolean): OfficePermissionState {
  if (isAdmin) {
    return buildDefaultOfficePermissions(true);
  }

  const base = buildDefaultOfficePermissions(false);
  if (!input) return base;

  OFFICE_PERMISSION_KEYS.forEach((key) => {
    base[key] = input[key] === true;
  });

  return base;
}

export function canByPermission(
  permissionState: OfficePermissionState,
  permissionKey: OfficePermissionKey,
  isAdmin: boolean
) {
  return isAdmin || Boolean(permissionState[permissionKey]);
}
