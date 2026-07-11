import { NextResponse } from "next/server";
import { requireAdminAccessFromRequest } from "../../../../../lib/server/adminAuth";
import { getSupabaseAdmin } from "../../../../../lib/server/supabaseAdmin";
import { isOwnerEmail } from "../../../../../lib/rbac";

interface AdminAuditActor {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string | null } | null;
}

const getActorName = (actor?: AdminAuditActor | null) =>
  String(actor?.user_metadata?.full_name || actor?.email || "Administrator").trim();

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const access = await requireAdminAccessFromRequest(request);
    if (!access.ok) {
      return access.response;
    }

    const body = (await request.json()) as { force_password_change?: boolean };
    const forcePasswordChange = Boolean(body.force_password_change);
    const { userId } = await context.params;

    const userResult = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userResult.error || !userResult.data.user?.email) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    const email = userResult.data.user.email.trim().toLowerCase();
    if (isOwnerEmail(email)) {
      return NextResponse.json({ success: false, error: "Owner account settings are immutable here." }, { status: 403 });
    }

    const userMetadata = userResult.data.user.user_metadata || {};

    const updateAuth = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...userMetadata,
        force_password_change: forcePasswordChange,
      },
    });

    if (updateAuth.error) {
      return NextResponse.json({ success: false, error: updateAuth.error.message }, { status: 500 });
    }

    await supabaseAdmin.from("audit_logs").insert({
      action: "Force Password Change",
      description: `Force Password Change • ${email} • enabled=${forcePasswordChange} • by ${getActorName(access.user as AdminAuditActor)}`,
      user_id: (access.user as AdminAuditActor)?.id || null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
