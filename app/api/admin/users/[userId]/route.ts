import { NextResponse } from "next/server";
import { requireAdminAccessFromRequest } from "../../../../lib/server/adminAuth";
import { getSupabaseAdmin } from "../../../../lib/server/supabaseAdmin";
import type { RoleAssignmentInput, UpdateUserPayload } from "../../../../lib/user-management";
import { isOwnerEmail } from "../../../../lib/rbac";

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

const resolveEmail = async (userId: string): Promise<string | null> => {
  const supabaseAdmin = getSupabaseAdmin();
  const lookup = await supabaseAdmin.auth.admin.getUserById(userId);
  if (lookup.error || !lookup.data.user?.email) {
    return null;
  }
  return lookup.data.user.email.trim().toLowerCase();
};

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const supabaseAdmin = getSupabaseAdmin();
  const access = await requireAdminAccessFromRequest(request);
  if (!access.ok) {
    return access.response;
  }

  const { userId } = await context.params;
  const payload = (await request.json()) as UpdateUserPayload;
  const targetEmail = await resolveEmail(userId);

  if (!targetEmail) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (isOwnerEmail(targetEmail)) {
    return NextResponse.json({ error: "Owner account cannot be modified." }, { status: 403 });
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
    return NextResponse.json({ error: updateAuth.error.message }, { status: 500 });
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
    const fallback = await supabaseAdmin
      .from("users")
      .upsert({ email: targetEmail, full_name: payload.full_name, role: payload.role }, { onConflict: "email" });

    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
  }

  try {
    await upsertUserRoleAssignments(userId, payload.assignments || []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update role assignments." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const supabaseAdmin = getSupabaseAdmin();
  const access = await requireAdminAccessFromRequest(_request);
  if (!access.ok) {
    return access.response;
  }

  const { userId } = await context.params;
  const targetEmail = await resolveEmail(userId);

  if (!targetEmail) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (isOwnerEmail(targetEmail)) {
    return NextResponse.json({ error: "Owner account cannot be deleted." }, { status: 403 });
  }

  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  await supabaseAdmin.from("users").delete().ilike("email", targetEmail);

  const result = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
