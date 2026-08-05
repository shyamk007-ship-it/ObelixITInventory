import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/server/supabaseAdmin";
import { getOfficeAccessForAuthUser } from "../../../../lib/server/office-permissions";

export async function GET(request: Request) {
  try {
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

    const access = await getOfficeAccessForAuthUser(user.id, user.email);

    return NextResponse.json({
      success: true,
      data: {
        is_admin: access.isAdmin,
        office_access: access.officeAccess,
        permissions: access.permissions,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
