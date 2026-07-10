import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/server/supabaseAdmin";

interface LoginHistoryItem {
  id: string;
  created_at: string;
  action: string;
  description: string;
}

export async function GET(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const authorizationHeader = request.headers.get("authorization") || "";
  const token = authorizationHeader.startsWith("Bearer ") ? authorizationHeader.slice(7).trim() : "";

  if (!token) {
    return NextResponse.json({ error: "Authorization token is required." }, { status: 401 });
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = user.email.trim().toLowerCase();
  const fullName = String(user.user_metadata?.full_name || "").trim();

  const tryTable = async (table: "audit_logs" | "activity_logs") => {
    const query = supabaseAdmin
      .from(table)
      .select("id, created_at, action, description")
      .ilike("action", "%login%")
      .order("created_at", { ascending: false })
      .limit(25);

    if (fullName) {
      query.or(`description.ilike.%${fullName}%,description.ilike.%${userEmail}%`);
    } else {
      query.ilike("description", `%${userEmail}%`);
    }

    return query;
  };

  const auditResult = await tryTable("audit_logs");
  const activityResult = auditResult.error ? await tryTable("activity_logs") : null;
  const data = (auditResult.data || activityResult?.data || []) as LoginHistoryItem[];

  return NextResponse.json({ data });
}
