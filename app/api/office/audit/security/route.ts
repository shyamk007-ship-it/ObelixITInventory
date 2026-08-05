import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/server/supabaseAdmin";
import { createOfficePermissionAuditLog, getRequestIp } from "../../../../lib/server/office-permissions";

type SecurityAction = "login" | "logout" | "failed_login" | "password_reset";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: SecurityAction; context?: string; email?: string };
    const action = body.action;

    if (!action || !["login", "logout", "failed_login", "password_reset"].includes(action)) {
      return NextResponse.json({ success: false, error: "Unsupported action." }, { status: 400 });
    }

    if (action === "failed_login" || action === "password_reset") {
      await createOfficePermissionAuditLog({
        actorAuthUserId: null,
        actorEmail: body.email || null,
        targetAuthUserId: null,
        targetEmail: body.email || null,
        action: action === "failed_login" ? "FAILED_LOGIN" : "PASSWORD_RESET",
        module: "authentication",
        context:
          body.context || (action === "failed_login" ? "Failed login attempt" : "Password reset requested"),
        ipAddress: getRequestIp(request),
      });
      return NextResponse.json({ success: true });
    }

    const authorizationHeader = request.headers.get("authorization") || "";
    const token = authorizationHeader.startsWith("Bearer ") ? authorizationHeader.slice(7).trim() : "";
    if (!token) {
      return NextResponse.json({ success: false, error: "Authorization token is required." }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user?.id || !user.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await createOfficePermissionAuditLog({
      actorAuthUserId: user.id,
      actorEmail: user.email,
      targetAuthUserId: user.id,
      targetEmail: user.email,
      action: action.toUpperCase(),
      module: "authentication",
      context: body.context || "User authentication event",
      ipAddress: getRequestIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
