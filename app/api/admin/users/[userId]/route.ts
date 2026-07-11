import { NextResponse } from "next/server";
import { requireAdminAccessFromRequest } from "../../../../lib/server/adminAuth";
import { getSupabaseAdmin } from "../../../../lib/server/supabaseAdmin";
import type { RoleAssignmentInput, UpdateUserPayload } from "../../../../lib/user-management";
import { isOwnerEmail } from "../../../../lib/rbac";

const normalizeRoleKey = (value: string | null | undefined) =>
  (value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

const toCanonicalRoleKey = (value: string | null | undefined) => {
  const roleKey = normalizeRoleKey(value);

  if (roleKey === "employee" || roleKey === "viewer") return "crew_member";
  if (roleKey === "admin") return "office_admin";
  if (roleKey === "it_staff" || roleKey === "eto") return "it_officer";

  return roleKey;
};

const isMissingAuthUserIdColumnError = (message: string) =>
  /auth_user_id/i.test(message) && /does not exist/i.test(message);

const DEFAULT_ROLE_NAMES = [
  "super_admin",
  "office_admin",
  "fleet_admin",
  "captain",
  "chief_engineer",
  "it_officer",
  "crew_member",
] as const;

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

const resolveEmail = async (userId: string): Promise<string | null> => {
  const supabaseAdmin = getSupabaseAdmin();
  const lookup = await supabaseAdmin.auth.admin.getUserById(userId);
  if (lookup.error || !lookup.data.user?.email) {
    return null;
  }
  return lookup.data.user.email.trim().toLowerCase();
};

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const access = await requireAdminAccessFromRequest(request);
    if (!access.ok) {
      return access.response;
    }

    const { userId } = await context.params;
    const payload = (await request.json()) as UpdateUserPayload;
    const targetEmail = await resolveEmail(userId);

    if (!targetEmail) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    if (isOwnerEmail(targetEmail)) {
      return NextResponse.json({ success: false, error: "Owner account cannot be modified." }, { status: 403 });
    }

    const updateAuth = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        full_name: payload.full_name,
        role: payload.role,
        phone_number: payload.phone_number,
        force_password_change: payload.force_password_change,
      },
      ban_duration: payload.is_active ? "none" : "876000h",
    });

    if (updateAuth.error) {
      return NextResponse.json({ success: false, error: updateAuth.error.message }, { status: 500 });
    }

    const upsertPublic = await supabaseAdmin.from("users").upsert(
      {
        auth_user_id: userId,
        email: targetEmail,
        full_name: payload.full_name,
        role: payload.role,
        is_active: payload.is_active,
        phone_number: payload.phone_number,
        force_password_change: payload.force_password_change,
      },
      { onConflict: "email" }
    );

    if (upsertPublic.error) {
      const fallbackPayload = {
        email: targetEmail,
        full_name: payload.full_name,
        role: payload.role,
        is_active: payload.is_active,
        phone_number: payload.phone_number,
        force_password_change: payload.force_password_change,
      };

      const fallback = await supabaseAdmin.from("users").upsert(fallbackPayload, { onConflict: "email" });

      if (fallback.error) {
        return NextResponse.json({ success: false, error: fallback.error.message }, { status: 500 });
      }
    }

      let publicUserId: string;

      try {
        publicUserId = await resolvePublicUserId(userId, targetEmail);
      } catch (error) {
        return NextResponse.json(
          { success: false, error: error instanceof Error ? error.message : "Failed to resolve public user record." },
          { status: 500 }
        );
      }

    try {
        await upsertUserRoleAssignments(publicUserId, payload.assignments || []);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : "Failed to update role assignments." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const access = await requireAdminAccessFromRequest(_request);
    if (!access.ok) {
      return access.response;
    }

    const { userId } = await context.params;
    const targetEmail = await resolveEmail(userId);

    if (!targetEmail) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    if (isOwnerEmail(targetEmail)) {
      return NextResponse.json({ success: false, error: "Owner account cannot be deleted." }, { status: 403 });
    }

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("users").delete().ilike("email", targetEmail);

    const result = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (result.error) {
      return NextResponse.json({ success: false, error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
