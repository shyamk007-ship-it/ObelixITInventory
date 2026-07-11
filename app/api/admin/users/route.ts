import { NextResponse } from "next/server";
import { requireAdminAccessFromRequest } from "../../../lib/server/adminAuth";
import { getSupabaseAdmin } from "../../../lib/server/supabaseAdmin";
import type {
  CreateUserPayload,
  RoleAssignmentInput,
  UserManagementRecord,
} from "../../../lib/user-management";
import { isOwnerEmail } from "../../../lib/rbac";

const normalizeRole = (value: string | null | undefined) =>
  (value || "employee").trim().toLowerCase();

const normalizeRoleKey = (value: string | null | undefined) =>
  (value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

const extractRoleName = (value: unknown): string | null => {
  if (!value) return null;

  if (Array.isArray(value)) {
    const first = value[0] as { role_name?: string | null } | undefined;
    return first?.role_name ? String(first.role_name) : null;
  }

  if (typeof value === "object" && value !== null && "role_name" in value) {
    const roleName = (value as { role_name?: string | null }).role_name;
    return roleName ? String(roleName) : null;
  }

  return null;
};

const getRoleIdMap = async () => {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.from("roles").select("id, role_name");

  if (error) {
    throw new Error(error.message);
  }

  const roleMap = new Map<string, number>();
  (data || []).forEach((record) => {
    const key = normalizeRoleKey(String(record.role_name || ""));
    const id = Number(record.id);
    if (key && Number.isFinite(id)) {
      roleMap.set(key, id);
    }
  });

  return roleMap;
};

const mapAssignments = (records: Array<Record<string, unknown>>): RoleAssignmentInput[] =>
  records.map((record) => ({
    role_id:
      record.role_id === null || record.role_id === undefined || record.role_id === ""
        ? null
        : Number(record.role_id),
    role: normalizeRole(extractRoleName(record.roles) || "employee") as RoleAssignmentInput["role"],
    workspace: String(record.workspace || "company").toLowerCase() as RoleAssignmentInput["workspace"],
    vessel_id:
      record.vessel_id === null || record.vessel_id === undefined || record.vessel_id === ""
        ? null
        : Number(record.vessel_id),
    department: record.department ? String(record.department) : null,
    is_active: Boolean(record.is_active),
  }));

const upsertUserRoleAssignments = async (userId: string, assignments: RoleAssignmentInput[]) => {
  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

  if (assignments.length === 0) {
    return;
  }

  const roleIdMap = await getRoleIdMap();

  const rows = assignments.map((assignment) => {
    const roleKey = normalizeRoleKey(assignment.role);
    const roleId = roleIdMap.get(roleKey);

    if (!roleId) {
      throw new Error(`Unknown role '${assignment.role}'. Ensure roles table is seeded.`);
    }

    return {
    user_id: userId,
    role_id: roleId,
    workspace: assignment.workspace,
    vessel_id: assignment.workspace === "vessel" ? assignment.vessel_id : null,
    department: assignment.department,
    is_active: assignment.is_active,
  };
  });

  const { error } = await supabaseAdmin.from("user_roles").insert(rows);
  if (error) {
    throw new Error(error.message);
  }
};

const ensurePublicUser = async (
  userId: string,
  email: string,
  fullName: string,
  role: string,
  isActive: boolean,
  phoneNumber: string | null,
  profilePhotoUrl: string | null,
  forcePasswordChange: boolean
) => {
  const supabaseAdmin = getSupabaseAdmin();
  const payload = {
    auth_user_id: userId,
    email,
    full_name: fullName,
    role,
    is_active: isActive,
    phone_number: phoneNumber,
    profile_photo_url: profilePhotoUrl,
    force_password_change: forcePasswordChange,
  };

  const { error } = await supabaseAdmin.from("users").upsert(payload, { onConflict: "email" });
  if (!error) {
    return;
  }

  const fallback = {
    email,
    full_name: fullName,
    role,
  };

  const fallbackUpsert = await supabaseAdmin.from("users").upsert(fallback, { onConflict: "email" });
  if (fallbackUpsert.error) {
    throw new Error(fallbackUpsert.error.message);
  }
};

const resolveEmail = async (userId: string): Promise<string | null> => {
  const supabaseAdmin = getSupabaseAdmin();
  const lookup = await supabaseAdmin.auth.admin.getUserById(userId);
  if (lookup.error || !lookup.data.user?.email) {
    return null;
  }
  return lookup.data.user.email.trim().toLowerCase();
};

const updateUserCore = async (userId: string, payload: CreateUserPayload) => {
  const supabaseAdmin = getSupabaseAdmin();
  const targetEmail = await resolveEmail(userId);

  if (!targetEmail) {
    return { success: false as const, status: 404, error: "User not found." };
  }

  if (isOwnerEmail(targetEmail)) {
    return { success: false as const, status: 403, error: "Owner account cannot be modified." };
  }

  const updateAuth = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      full_name: payload.full_name,
      role: payload.role,
      phone_number: null,
      force_password_change: payload.force_password_change,
    },
    ban_duration: payload.is_active ? "none" : "876000h",
  });

  if (updateAuth.error) {
    return { success: false as const, status: 500, error: updateAuth.error.message };
  }

  const upsertPublic = await supabaseAdmin.from("users").upsert(
    {
      auth_user_id: userId,
      email: targetEmail,
      full_name: payload.full_name,
      role: payload.role,
      is_active: payload.is_active,
      phone_number: null,
      force_password_change: payload.force_password_change,
    },
    { onConflict: "email" }
  );

  if (upsertPublic.error) {
    return { success: false as const, status: 500, error: upsertPublic.error.message };
  }

  try {
    await upsertUserRoleAssignments(userId, payload.assignments || []);
  } catch (error) {
    return {
      success: false as const,
      status: 500,
      error: error instanceof Error ? error.message : "Failed to update role assignments.",
    };
  }

  return { success: true as const, status: 200 };
};

const deleteUserCore = async (userId: string) => {
  const supabaseAdmin = getSupabaseAdmin();
  const targetEmail = await resolveEmail(userId);

  if (!targetEmail) {
    return { success: false as const, status: 404, error: "User not found." };
  }

  if (isOwnerEmail(targetEmail)) {
    return { success: false as const, status: 403, error: "Owner account cannot be deleted." };
  }

  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  await supabaseAdmin.from("user_sessions").delete().eq("user_id", userId);
  await supabaseAdmin.from("workspace_mappings").delete().eq("user_id", userId);
  await supabaseAdmin.from("users").delete().ilike("email", targetEmail);

  const result = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (result.error) {
    return { success: false as const, status: 500, error: result.error.message };
  }

  return { success: true as const, status: 200 };
};

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const access = await requireAdminAccessFromRequest(request);
    if (!access.ok) {
      return access.response;
    }

    const payload = (await request.json()) as CreateUserPayload;
    const email = (payload.email || "").trim().toLowerCase();

    if (!email || !payload.full_name || !payload.role) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    if (isOwnerEmail(email)) {
      return NextResponse.json({ success: false, error: "Owner account is managed automatically." }, { status: 400 });
    }

    const temporaryPassword = payload.temporary_password || `${Math.random().toString(36).slice(2)}Aa!9`;

    const primaryAssignment = (payload.assignments || [])[0] || null;
    const createResult = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: payload.full_name,
        role: payload.role,
        phone_number: null,
        force_password_change: payload.force_password_change,
        workspace: primaryAssignment?.workspace || "office",
        department: primaryAssignment?.department || null,
        vessel_id: primaryAssignment?.vessel_id || null,
        status: payload.is_active ? "active" : "disabled",
      },
      ban_duration: payload.is_active ? "none" : "876000h",
    });

    if (createResult.error || !createResult.data.user) {
      return NextResponse.json(
        { success: false, error: createResult.error?.message || "Failed to create user." },
        { status: 500 }
      );
    }

    try {
      await ensurePublicUser(
        createResult.data.user.id,
        email,
        payload.full_name,
        payload.role,
        payload.is_active,
        null,
        null,
        payload.force_password_change
      );

      await upsertUserRoleAssignments(createResult.data.user.id, payload.assignments || []);
    } catch (error) {
      await supabaseAdmin.auth.admin.deleteUser(createResult.data.user.id);
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : "Failed to finalize user creation." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, user_id: createResult.data.user.id });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const access = await requireAdminAccessFromRequest(request);
    if (!access.ok) {
      return access.response;
    }

    const requestUrl = new URL(request.url);
    const requestedUserId = requestUrl.searchParams.get("userId");

    const [authUsersResult, publicUsersResult, roleAssignmentsResult] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin
        .from("users")
        .select("auth_user_id, full_name, email, role, is_active, phone_number, profile_photo_url, force_password_change, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("user_roles")
        .select("user_id, role_id, workspace, vessel_id, department, is_active, roles:role_id(role_name)")
        .order("created_at", { ascending: true }),
    ]);

    if (authUsersResult.error) {
      return NextResponse.json({ success: false, error: authUsersResult.error.message }, { status: 500 });
    }

    const publicByEmail = new Map<string, Record<string, unknown>>();
    (publicUsersResult.data || []).forEach((row) => {
      const email = String(row.email || "").trim().toLowerCase();
      if (email) {
        publicByEmail.set(email, row as Record<string, unknown>);
      }
    });

    const assignmentsByUserId = new Map<string, Array<Record<string, unknown>>>();
    const assignmentRows = (roleAssignmentsResult.data || []) as Array<Record<string, unknown>>;
    assignmentRows.forEach((row) => {
      const userId = String(row.user_id || "");
      if (!assignmentsByUserId.has(userId)) {
        assignmentsByUserId.set(userId, []);
      }
      assignmentsByUserId.get(userId)?.push(row);
    });

    const records: UserManagementRecord[] = (authUsersResult.data?.users || []).map((authUser) => {
      const email = (authUser.email || "").trim().toLowerCase();
      const publicRow = publicByEmail.get(email);
      const metadata = authUser.user_metadata || {};
      const authAssignments = assignmentsByUserId.get(authUser.id) || [];
      const fallbackRole = normalizeRole(String(publicRow?.role || authUser.user_metadata?.role || "employee"));

      const assignmentSeed: RoleAssignmentInput[] =
        authAssignments.length > 0
          ? mapAssignments(authAssignments)
          : [
              {
                role_id: null,
                role: fallbackRole as RoleAssignmentInput["role"],
                workspace:
                  fallbackRole === "fleet_admin"
                    ? "fleet"
                    : fallbackRole === "super_admin"
                      ? "company"
                      : "office",
                vessel_id: null,
                department: null,
                is_active: true,
              },
            ];

      const primaryAssignment = assignmentSeed[0] || null;
      const role = normalizeRole(primaryAssignment?.role || fallbackRole);

      const isActive = isOwnerEmail(email)
        ? true
        : typeof authUser.banned_until === "string"
          ? false
          : Boolean(publicRow?.is_active ?? true);

      return {
        auth_user_id: authUser.id,
        full_name: String(publicRow?.full_name || metadata.full_name || authUser.email || "Unknown User"),
        email,
        role: role as UserManagementRecord["role"],
        is_active: isActive,
        phone_number: String(publicRow?.phone_number || metadata.phone_number || "") || null,
        profile_photo_url: String(publicRow?.profile_photo_url || metadata.avatar_url || "") || null,
        force_password_change: Boolean(publicRow?.force_password_change ?? metadata.force_password_change ?? false),
        created_at: String(publicRow?.created_at || authUser.created_at || "") || null,
        last_sign_in_at: authUser.last_sign_in_at || null,
        assignments: assignmentSeed,
      };
    });

    if (requestedUserId) {
      const record = records.find((user) => user.auth_user_id === requestedUserId) || null;
      if (!record) {
        return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: record,
        tabs: {
          overview: record,
          security: {
            force_password_change: record.force_password_change,
            last_password_reset: null,
          },
          permissions: record.assignments,
          workspace: record.assignments,
          activity: [],
          devices: [],
          sessions: [],
          audit_log: [],
        },
      });
    }

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const access = await requireAdminAccessFromRequest(request);
    if (!access.ok) {
      return access.response;
    }

    const body = (await request.json()) as CreateUserPayload & { user_id?: string };
    const userId = String(body.user_id || "").trim();
    if (!userId) {
      return NextResponse.json({ success: false, error: "user_id is required." }, { status: 400 });
    }

    const result = await updateUserCore(userId, body);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, user_id: userId });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await requireAdminAccessFromRequest(request);
    if (!access.ok) {
      return access.response;
    }

    const body = (await request.json()) as { user_id?: string };
    const userId = String(body.user_id || "").trim();
    if (!userId) {
      return NextResponse.json({ success: false, error: "user_id is required." }, { status: 400 });
    }

    const result = await deleteUserCore(userId);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
