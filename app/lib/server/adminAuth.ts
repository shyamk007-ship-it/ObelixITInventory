import "server-only";

import { NextResponse } from "next/server";
import { isOwnerEmail } from "../rbac";
import { getSupabaseAdmin } from "./supabaseAdmin";

const MANAGE_USER_ROLES = new Set(["super_admin", "admin", "office_admin"]);

const normalizeRole = (value: string | null | undefined) =>
  (value || "").trim().toLowerCase();

export async function requireAdminAccessFromRequest(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const authorizationHeader = request.headers.get("authorization") || "";
  const token = authorizationHeader.startsWith("Bearer ") ? authorizationHeader.slice(7).trim() : "";

  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Authorization token is required." }, { status: 401 }),
    };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user?.email) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (isOwnerEmail(user.email)) {
    return { ok: true as const, user };
  }

  const { data: assignments } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const canManageFromAssignments = (assignments || []).some((assignment) => {
    const role =
      typeof assignment.role === "string"
        ? assignment.role
        : assignment.role === null || assignment.role === undefined
          ? null
          : String(assignment.role);
    return MANAGE_USER_ROLES.has(normalizeRole(role));
  });

  if (canManageFromAssignments) {
    return { ok: true as const, user };
  }

  const { data: userRecord } = await supabaseAdmin
    .from("users")
    .select("role")
    .ilike("email", user.email)
    .maybeSingle();

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
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}
