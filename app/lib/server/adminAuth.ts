import "server-only";

import { NextResponse } from "next/server";
import { isOwnerEmail } from "../rbac";
import { getSupabaseAdmin } from "./supabaseAdmin";

const MANAGE_USER_ROLES = new Set(["super_admin", "admin", "office_admin"]);

const normalizeRole = (value: string | null | undefined) =>
  (value || "").trim().toLowerCase();

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

export async function requireAdminAccessFromRequest(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const authorizationHeader = request.headers.get("authorization") || "";
  const token = authorizationHeader.startsWith("Bearer ") ? authorizationHeader.slice(7).trim() : "";

  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: "Authorization token is required." }, { status: 401 }),
    };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user?.email) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (isOwnerEmail(user.email)) {
    return { ok: true as const, user };
  }

  const publicUser = await supabaseAdmin
    .from("users")
    .select("id, email, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (publicUser.error) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: publicUser.error.message }, { status: 500 }),
    };
  }

  const { data: assignments } = await supabaseAdmin
    .from("user_roles")
    .select("role_id, roles:role_id(id, role_name)")
    .eq("user_id", String(publicUser.data?.id || ""))
    .eq("is_active", true);

  const canManageFromAssignments = (assignments || []).some((assignment) => {
    const role = extractRoleName((assignment as { roles?: unknown }).roles);
    return MANAGE_USER_ROLES.has(normalizeRole(role));
  });

  if (canManageFromAssignments) {
    return { ok: true as const, user };
  }

  const userRecord = publicUser.data
    ? { email: publicUser.data.email, role: publicUser.data.role }
    : (
        await supabaseAdmin
          .from("users")
          .select("email, role")
          .ilike("email", user.email)
          .maybeSingle()
      ).data;

  const fallbackRole =
    typeof userRecord?.role === "string"
      ? userRecord.role
      : userRecord?.role === null || userRecord?.role === undefined
        ? null
        : String(userRecord.role);

  if (MANAGE_USER_ROLES.has(normalizeRole(fallbackRole))) {
    return { ok: true as const, user };
  }

  return {
    ok: false as const,
    response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
  };
}
