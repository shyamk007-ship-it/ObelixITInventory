import { NextResponse } from "next/server";
import { requireAdminAccessFromRequest } from "../../../../../lib/server/adminAuth";
import { getSupabaseAdmin } from "../../../../../lib/server/supabaseAdmin";
import { isOwnerEmail } from "../../../../../lib/rbac";

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const access = await requireAdminAccessFromRequest(request);
    if (!access.ok) {
      return access.response;
    }

    const { userId } = await context.params;
    const body = (await request.json()) as { action?: string; password?: string };

    const lookup = await supabaseAdmin.auth.admin.getUserById(userId);
    if (lookup.error || !lookup.data.user?.email) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    const email = lookup.data.user.email.trim().toLowerCase();
    if (isOwnerEmail(email)) {
      return NextResponse.json({ success: false, error: "Owner account cannot be modified." }, { status: 403 });
    }

    if (body.action === "change-password") {
      const password = String(body.password || "").trim();
      if (!password || password.length < 8) {
        return NextResponse.json({ success: false, error: "Password must be at least 8 characters." }, { status: 400 });
      }

      const result = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        user_metadata: {
          ...(lookup.data.user.user_metadata || {}),
          force_password_change: false,
          last_password_reset: new Date().toISOString(),
        },
      });

      if (result.error) {
        return NextResponse.json({ success: false, error: result.error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (body.action === "force-logout") {
      const signOutResult = await supabaseAdmin.auth.admin.signOut(userId, "global");
      if (signOutResult.error) {
        return NextResponse.json({ success: false, error: signOutResult.error.message }, { status: 500 });
      }

      await supabaseAdmin.from("user_sessions").delete().eq("user_id", userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
