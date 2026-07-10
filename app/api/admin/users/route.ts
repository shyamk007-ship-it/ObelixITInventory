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

const mapAssignments = (records: Array<Record<string, unknown>>): RoleAssignmentInput[] =>
  records.map((record) => ({
    role: normalizeRole(String(record.role || "employee")) as RoleAssignmentInput["role"],
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

  const rows = assignments.map((assignment) => ({
    user_id: userId,
    role: assignment.role,
    workspace: assignment.workspace,
    vessel_id: assignment.workspace === "vessel" ? assignment.vessel_id : null,
    department: assignment.department,
    is_active: assignment.is_active,
  }));

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

    const createResult = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: payload.full_name,
        role: payload.role,
        phone_number: null,
        force_password_change: payload.force_password_change,
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

    const [authUsersResult, publicUsersResult, roleAssignmentsResult] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin
        .from("users")
        .select("auth_user_id, full_name, email, role, is_active, phone_number, profile_photo_url, force_password_change, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("user_roles")
        .select("user_id, role, workspace, vessel_id, department, is_active")
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
    (roleAssignmentsResult.data || []).forEach((row) => {
      const userId = String(row.user_id || "");
      if (!assignmentsByUserId.has(userId)) {
        assignmentsByUserId.set(userId, []);
      }
      assignmentsByUserId.get(userId)?.push(row as Record<string, unknown>);
    });

    const records: UserManagementRecord[] = (authUsersResult.data?.users || []).map((authUser) => {
      const email = (authUser.email || "").trim().toLowerCase();
      const publicRow = publicByEmail.get(email);
      const role = normalizeRole(String(publicRow?.role || authUser.user_metadata?.role || "employee"));
      const metadata = authUser.user_metadata || {};
      const authAssignments = assignmentsByUserId.get(authUser.id) || [];

      const assignmentSeed: RoleAssignmentInput[] =
        authAssignments.length > 0
          ? mapAssignments(authAssignments)
          : [
              {
                role: role as RoleAssignmentInput["role"],
                workspace: role === "fleet_admin" ? "fleet" : role === "super_admin" ? "company" : "office",
                vessel_id: null,
                department: null,
                is_active: true,
              },
            ];

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

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
