import { NextResponse } from "next/server";
import { requireAdminAccessFromRequest } from "../../../../../lib/server/adminAuth";
import { getSupabaseAdmin } from "../../../../../lib/server/supabaseAdmin";
import { isOwnerEmail } from "../../../../../lib/rbac";

export async function POST(_request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const access = await requireAdminAccessFromRequest(_request);
    if (!access.ok) {
      return access.response;
    }

    const { userId } = await context.params;
    const userResult = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userResult.error || !userResult.data.user?.email) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    const email = userResult.data.user.email.trim().toLowerCase();

    if (isOwnerEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Owner password reset cannot be triggered from user management." },
        { status: 403 }
      );
    }

    const resetResult = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (resetResult.error) {
      return NextResponse.json({ success: false, error: resetResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      email,
      recovery_link: resetResult.data.properties?.action_link || null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
