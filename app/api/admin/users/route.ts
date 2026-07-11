import { NextResponse } from "next/server";
import { requireAdminAccessFromRequest } from "../../../lib/server/adminAuth";
import { getSupabaseAdmin } from "../../../lib/server/supabaseAdmin";
import type {
  CreateUserPayload,
  RoleAssignmentInput,
  UserManagementRecord,
} from "../../../lib/user-management";
import { isOwnerEmail } from "../../../lib/rbac";
import { matchesUserWorkspace, type WorkspaceView } from "../../../lib/workspace";

interface AdminAuditActor {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string | null } | null;
}

const getActorName = (actor?: AdminAuditActor | null) =>
  String(actor?.user_metadata?.full_name || actor?.email || "Administrator").trim();

const createIamAuditLog = async (
  actor: AdminAuditActor | null | undefined,
  action: string,
  targetEmail: string,
  details: string
) => {
  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin.from("audit_logs").insert({
    action,
    description: `${action} • ${targetEmail} • ${details} • by ${getActorName(actor)}`,
    user_id: actor?.id || null,
  });
};

const normalizeRole = (value: string | null | undefined) =>
  (value || "employee").trim().toLowerCase();

const normalizeRoleKey = (value: string | null | undefined) =>
  (value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

const toCanonicalRoleKey = (value: string | null | undefined) => {
  const roleKey = normalizeRoleKey(value);

  if (roleKey === "employee" || roleKey === "viewer") return "crew_member";
  if (roleKey === "admin") return "office_admin";
  if (roleKey === "it_staff" || roleKey === "eto") return "it_officer";

  return roleKey;
};

const DEFAULT_ROLE_NAMES = [
  "super_admin",
  "office_admin",
  "fleet_admin",
  "captain",
  "chief_engineer",
  "it_officer",
  "crew_member",
] as const;

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

const extractRoleLookup = (value: unknown) => {
  if (!value) return undefined;

  const record = Array.isArray(value) ? value[0] : value;
  if (typeof record !== "object" || record === null) {
    return undefined;
  }

  const roleRecord = record as { id?: unknown; role_name?: unknown };
  const id = String(roleRecord.id || "").trim();
  const role_name = String(roleRecord.role_name || "").trim();

  if (!id || !role_name) {
    return undefined;
  }

  return { id, role_name };
};

const toTextOrNull = (value: unknown) => {
  const text = String(value || "").trim();
  return text ? text : null;
};

const isMissingAuthUserIdColumnError = (message: string) =>
  /auth_user_id/i.test(message) && /does not exist/i.test(message);

const getRoleIdMap = async () => {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: existingRoles, error } = await supabaseAdmin.from("roles").select("id, role_name");

  if (error) {
    throw new Error(error.message);
  }

  const existingRoleKeys = new Set(
    (existingRoles || []).map((record) => normalizeRoleKey(String(record.role_name || ""))).filter(Boolean)
  );
  const missingRoleNames = DEFAULT_ROLE_NAMES.filter((roleName) => !existingRoleKeys.has(roleName));

  if (missingRoleNames.length > 0) {
    const insertResult = await supabaseAdmin
      .from("roles")
      .insert(missingRoleNames.map((role_name) => ({ role_name })));

    if (insertResult.error) {
      throw new Error(insertResult.error.message);
    }
  }

  const { data, error: reloadError } = await supabaseAdmin.from("roles").select("id, role_name");

  if (reloadError) {
    throw new Error(reloadError.message);
  }

  const roleMap = new Map<string, string>();
  (data || []).forEach((record) => {
    const key = normalizeRoleKey(String(record.role_name || ""));
    const id = String(record.id || "").trim();
    if (key && id) {
      roleMap.set(key, id);
    }
  });

  return roleMap;
};

const mapAssignments = (records: Array<Record<string, unknown>>): RoleAssignmentInput[] =>
  records.map((record) => {
    const roles = extractRoleLookup(record.roles);

    return {
      role_id: String(record.role_id || ""),
      role: normalizeRole(extractRoleName(record.roles) || "employee") as RoleAssignmentInput["role"],
      roles,
      workspace: String(record.workspace || "company").toLowerCase() as RoleAssignmentInput["workspace"],
      vessel_id:
        record.vessel_id === null || record.vessel_id === undefined || record.vessel_id === ""
          ? null
          : Number(record.vessel_id),
      department: record.department ? String(record.department) : null,
      is_active: Boolean(record.is_active),
    };
  });

const resolvePublicUserId = async (_authUserId: string, email: string) => {
  const supabaseAdmin = getSupabaseAdmin();

  const emailMatch = await supabaseAdmin
    .from("users")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (emailMatch.error) {
    throw new Error(emailMatch.error.message);
  }

  if (emailMatch.data?.id === null || emailMatch.data?.id === undefined) {
    throw new Error("Public user record not found.");
  }

  return String(emailMatch.data.id);
};

const upsertUserRoleAssignments = async (publicUserId: string, assignments: RoleAssignmentInput[]) => {
  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin.from("user_roles").delete().eq("user_id", publicUserId);

  if (assignments.length === 0) {
    return;
  }

  const roleIdMap = await getRoleIdMap();

  const rows = assignments.map((assignment) => {
    const roleKey = toCanonicalRoleKey(assignment.role);
    const roleId = roleIdMap.get(roleKey);

    if (!roleId) {
      throw new Error(`Unknown role '${assignment.role}'. Ensure roles table is seeded.`);
    }

    return {
    user_id: publicUserId,
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
    return resolvePublicUserId(userId, email);
  }

  if (isMissingAuthUserIdColumnError(error.message)) {
    const noAuthUserIdPayload = {
      email,
      full_name: fullName,
      role,
      is_active: isActive,
      phone_number: phoneNumber,
      profile_photo_url: profilePhotoUrl,
      force_password_change: forcePasswordChange,
    };
    const retry = await supabaseAdmin.from("users").upsert(noAuthUserIdPayload, { onConflict: "email" });
    if (retry.error) {
      throw new Error(retry.error.message);
    }

    return resolvePublicUserId(userId, email);
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

  return resolvePublicUserId(userId, email);
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
      employee_id: payload.employee_id || null,
      role: payload.role,
      phone_number: payload.phone_number || null,
      designation: payload.designation || null,
      avatar_url: payload.profile_photo_url || null,
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
      phone_number: payload.phone_number || null,
      profile_photo_url: payload.profile_photo_url || null,
      force_password_change: payload.force_password_change,
    },
    { onConflict: "email" }
  );

  if (upsertPublic.error) {
    if (!isMissingAuthUserIdColumnError(upsertPublic.error.message)) {
      return { success: false as const, status: 500, error: upsertPublic.error.message };
    }

    const fallbackUpsert = await supabaseAdmin.from("users").upsert(
      {
        email: targetEmail,
        full_name: payload.full_name,
        role: payload.role,
        is_active: payload.is_active,
        phone_number: payload.phone_number || null,
        profile_photo_url: payload.profile_photo_url || null,
        force_password_change: payload.force_password_change,
      },
      { onConflict: "email" }
    );

    if (fallbackUpsert.error) {
      return { success: false as const, status: 500, error: fallbackUpsert.error.message };
    }
  }

  let publicUserId: string;

  try {
    publicUserId = await resolvePublicUserId(userId, targetEmail);
  } catch (error) {
    return {
      success: false as const,
      status: 500,
      error: error instanceof Error ? error.message : "Failed to resolve public user record.",
    };
  }

  try {
    await upsertUserRoleAssignments(publicUserId, payload.assignments || []);
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
        employee_id: payload.employee_id || null,
        role: payload.role,
        phone_number: payload.phone_number || null,
        designation: payload.designation || null,
        avatar_url: payload.profile_photo_url || null,
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
      const publicUserId = await ensurePublicUser(
        createResult.data.user.id,
        email,
        payload.full_name,
        payload.role,
        payload.is_active,
        payload.phone_number || null,
        payload.profile_photo_url || null,
        payload.force_password_change
      );

      await upsertUserRoleAssignments(publicUserId, payload.assignments || []);
      await createIamAuditLog(access.user as AdminAuditActor, "Created User", email, `role=${payload.role}`);
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
    const requestedWorkspace = requestUrl.searchParams.get("workspace");
    const workspaceScope: WorkspaceView =
      requestedWorkspace === "office" || requestedWorkspace === "fleet" ? requestedWorkspace : "all";

    const [authUsersResult, publicUsersResult, roleAssignmentsResult] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin
        .from("users")
        .select("id, full_name, email, role, is_active, phone_number, profile_photo_url, force_password_change, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("user_roles")
        .select("user_id, role_id, workspace, vessel_id, department, is_active, roles:role_id(id, role_name)")
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
      const publicUserId = publicRow?.id === null || publicRow?.id === undefined ? "" : String(publicRow.id);
      const publicAuthUserId = String(publicRow?.auth_user_id || "").trim();
      const authAssignments = [
        ...(publicUserId ? assignmentsByUserId.get(publicUserId) || [] : []),
        ...(publicAuthUserId ? assignmentsByUserId.get(publicAuthUserId) || [] : []),
        ...(assignmentsByUserId.get(authUser.id) || []),
      ];
      const fallbackRole = normalizeRole(String(publicRow?.role || authUser.user_metadata?.role || "employee"));
      const metadataEmployeeId = toTextOrNull(metadata.employee_id);
      const metadataDesignation = toTextOrNull(metadata.designation);
      const lastPasswordReset = toTextOrNull(metadata.last_password_reset);
      const isLocked = Boolean(metadata.is_locked) || (typeof authUser.banned_until === "string" && Boolean(publicRow?.is_active ?? true));

      const assignmentSeed: RoleAssignmentInput[] =
        authAssignments.length > 0
          ? mapAssignments(authAssignments)
          : [
              {
                role_id: "",
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
        : isLocked
          ? true
          : typeof authUser.banned_until === "string"
          ? false
          : Boolean(publicRow?.is_active ?? true);

      return {
        auth_user_id: authUser.id,
        full_name: String(publicRow?.full_name || metadata.full_name || authUser.email || "Unknown User"),
        employee_id: metadataEmployeeId,
        email,
        role: role as UserManagementRecord["role"],
        designation: metadataDesignation,
        is_active: isActive,
        is_locked: isLocked,
        phone_number: String(publicRow?.phone_number || metadata.phone_number || "") || null,
        profile_photo_url: String(publicRow?.profile_photo_url || metadata.avatar_url || "") || null,
        force_password_change: Boolean(publicRow?.force_password_change ?? metadata.force_password_change ?? false),
        last_password_reset: lastPasswordReset,
        created_at: String(publicRow?.created_at || authUser.created_at || "") || null,
        last_sign_in_at: authUser.last_sign_in_at || null,
        assignments: assignmentSeed,
      };
    });

    const scopedRecords = records.filter((user) => matchesUserWorkspace(user, workspaceScope));

    if (requestedUserId) {
      const record = scopedRecords.find((user) => user.auth_user_id === requestedUserId) || null;
      if (!record) {
        return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
      }

      const employeeResult = await supabaseAdmin
        .from("employees")
        .select("id, full_name, email, department, position")
        .ilike("email", record.email)
        .maybeSingle();

      const employeeId = employeeResult.data?.id ?? null;
      const assignedAssetsResult = employeeId
        ? await supabaseAdmin
            .from("assignment_records")
            .select("id, assigned_date, status, assets(asset_name, asset_tag, category)")
            .eq("employee_id", employeeId)
            .order("assigned_date", { ascending: false })
            .limit(10)
        : { data: [] as unknown[] };

      const ticketsByEmployee = employeeId
        ? await supabaseAdmin
            .from("tickets")
            .select("id, title, status, priority, category, created_at")
            .eq("employee_id", employeeId)
            .order("created_at", { ascending: false })
            .limit(10)
        : { data: [] as unknown[] };

      const publicUserRow = publicByEmail.get(record.email);
      const publicUserId = publicUserRow?.id ? Number(publicUserRow.id) : null;
      const ticketsByAssignee = publicUserId
        ? await supabaseAdmin
            .from("tickets")
            .select("id, title, status, priority, category, created_at")
            .eq("assigned_to", publicUserId)
            .order("created_at", { ascending: false })
            .limit(10)
        : { data: [] as unknown[] };

      const auditQuery = supabaseAdmin
        .from("audit_logs")
        .select("id, created_at, action, description")
        .or(`description.ilike.%${record.email}%,description.ilike.%${record.full_name}%`)
        .order("created_at", { ascending: false })
        .limit(25);

      const auditResult = await auditQuery;
      const loginHistory = (auditResult.data || []).filter((item) => String(item.action || "").toLowerCase().includes("login"));

      const sessionResult = await supabaseAdmin
        .from("user_sessions")
        .select("id, created_at, expires_at, ip_address, user_agent")
        .or(`user_id.eq.${requestedUserId}${publicUserId ? `,user_id.eq.${publicUserId}` : ""}`)
        .order("created_at", { ascending: false })
        .limit(10);

      return NextResponse.json({
        success: true,
        data: record,
        tabs: {
          overview: record,
          security: {
            force_password_change: record.force_password_change,
            last_password_reset: record.last_password_reset,
            is_locked: record.is_locked,
          },
          permissions: record.assignments,
          workspace: record.assignments,
          activity: auditResult.data || [],
          devices: assignedAssetsResult.data || [],
          sessions: sessionResult.data || [],
          audit_log: auditResult.data || [],
          assigned_assets: assignedAssetsResult.data || [],
          assigned_tickets: [...(ticketsByEmployee.data || []), ...(ticketsByAssignee.data || [])],
          login_history: loginHistory,
          personal_information: {
            employee_id: record.employee_id,
            phone_number: record.phone_number,
            department: employeeResult.data?.department || record.assignments[0]?.department || null,
            designation: record.designation || employeeResult.data?.position || null,
            workspace: record.assignments[0]?.workspace || null,
            vessel_id: record.assignments[0]?.vessel_id || null,
            profile_photo_url: record.profile_photo_url,
          },
        },
      });
    }

    return NextResponse.json({ success: true, data: scopedRecords });
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

    const targetEmail = await resolveEmail(userId);
    if (targetEmail) {
      await createIamAuditLog(access.user as AdminAuditActor, "Updated User", targetEmail, `role=${body.role}`);
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

    await createIamAuditLog(access.user as AdminAuditActor, "Deleted User", userId, "Account removed");

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
