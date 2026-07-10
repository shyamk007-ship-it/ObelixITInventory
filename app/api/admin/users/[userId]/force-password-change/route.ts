import { NextResponse } from "next/server";
import { requireAdminAccessFromRequest } from "../../../../../lib/server/adminAuth";
import { getSupabaseAdmin } from "../../../../../lib/server/supabaseAdmin";
import { isOwnerEmail } from "../../../../../lib/rbac";

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
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
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const email = userResult.data.user.email.trim().toLowerCase();
  if (isOwnerEmail(email)) {
    return NextResponse.json({ error: "Owner account settings are immutable here." }, { status: 403 });
  }

  const userMetadata = userResult.data.user.user_metadata || {};

  const updateAuth = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...userMetadata,
      force_password_change: forcePasswordChange,
    },
  });

  if (updateAuth.error) {
    return NextResponse.json({ error: updateAuth.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
