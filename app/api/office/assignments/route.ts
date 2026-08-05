import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/server/supabaseAdmin";
import { canByPermission, getOfficeAccessForAuthUser } from "../../../lib/server/office-permissions";

type AssignBody = {
  action: "assign";
  assetId: number;
  employeeId: number;
  notes?: string | null;
  expectedReturnDate?: string | null;
  assignedBy?: string | null;
};

type ReturnBody = {
  action: "return";
  assignmentId?: number | null;
  assetId: number;
  employeeId: number;
  outcome?: "Returned" | "Lost" | "Damaged";
  notes?: string | null;
};

type AssignmentPayload = AssignBody | ReturnBody;

const isFunctionMissing = (message: string | null | undefined) => {
  const value = String(message || "").toLowerCase();
  return value.includes("function") && (value.includes("does not exist") || value.includes("not found"));
};

const isValidBigIntId = (value: unknown) => {
  if (typeof value !== "number") return false;
  return Number.isInteger(value) && value > 0;
};

async function getAuthenticatedUser(request: Request) {
  const authorizationHeader = request.headers.get("authorization") || "";
  const token = authorizationHeader.startsWith("Bearer ") ? authorizationHeader.slice(7).trim() : "";

  if (!token) {
    return { error: NextResponse.json({ success: false, error: "Authorization token is required." }, { status: 401 }), user: null };
  }

  const supabaseAdmin = getSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user?.id || !user.email) {
    return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }), user: null };
  }

  return { error: null, user };
}

async function runAssignWithRollback(body: AssignBody, actorName: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const assignedDate = new Date().toISOString();

  console.log("[API Assign] assetId:", body.assetId);
  console.log("[API Assign] employeeId:", body.employeeId);

  const insertResult = await supabaseAdmin
    .from("assignment_records")
    .insert([
      {
        asset_id: body.assetId,
        employee_id: body.employeeId,
        status: "Assigned",
        assigned_date: assignedDate,
        expected_return_date: body.expectedReturnDate || null,
        notes: body.notes || null,
        assigned_by: body.assignedBy || actorName || "Office User",
      },
    ])
    .select("id")
    .single();

  console.log("[API Assign] assignment insert result:", insertResult);

  if (insertResult.error || !insertResult.data?.id) {
    return { success: false as const, status: 500, error: insertResult.error?.message || "Failed to insert assignment record." };
  }

  const assignmentId = Number(insertResult.data.id);

  const updateResult = await supabaseAdmin
    .from("assets")
    .update({
      assigned_to: body.employeeId,
      currently_assigned_to: body.employeeId,
      status: "Assigned",
      last_assignment_date: assignedDate,
    })
    .eq("id", body.assetId);

  console.log("[API Assign] asset update result:", updateResult);

  if (updateResult.error) {
    await supabaseAdmin.from("assignment_records").delete().eq("id", assignmentId);
    return { success: false as const, status: 500, error: updateResult.error.message || "Failed to update asset assignment." };
  }

  return {
    success: true as const,
    data: {
      assignmentId,
      assetId: body.assetId,
      employeeId: body.employeeId,
      assignedDate,
    },
  };
}

async function runReturnWithRollback(body: ReturnBody) {
  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const outcome = body.outcome || "Returned";
  const assetStatus = outcome === "Returned" ? "Available" : outcome;

  console.log("[API Return] assetId:", body.assetId);
  console.log("[API Return] employeeId:", body.employeeId);

  const updateResult = await supabaseAdmin
    .from("assets")
    .update({ assigned_to: null, currently_assigned_to: null, status: assetStatus })
    .eq("id", body.assetId);

  console.log("[API Return] asset update result:", updateResult);

  if (updateResult.error) {
    return { success: false as const, status: 500, error: updateResult.error.message || "Failed to update asset return." };
  }

  const insertResult = await supabaseAdmin
    .from("assignment_records")
    .insert([
      {
        asset_id: body.assetId,
        employee_id: body.employeeId,
        status: outcome,
        assigned_date: now,
        actual_return_date: now,
        notes: body.notes || `Return workflow event${body.assignmentId ? ` from assignment #${body.assignmentId}` : ""}`,
      },
    ])
    .select("id")
    .single();

  console.log("[API Return] assignment insert result:", insertResult);

  if (insertResult.error || !insertResult.data?.id) {
    await supabaseAdmin
      .from("assets")
      .update({ assigned_to: body.employeeId, currently_assigned_to: body.employeeId, status: "Assigned" })
      .eq("id", body.assetId);

    return {
      success: false as const,
      status: 500,
      error: insertResult.error?.message || "Failed to insert return history.",
    };
  }

  if (body.assignmentId) {
    await supabaseAdmin
      .from("assignment_records")
      .update({ status: outcome, actual_return_date: now })
      .eq("id", body.assignmentId);
  }

  return {
    success: true as const,
    data: {
      returnRecordId: Number(insertResult.data.id),
      assignmentId: body.assignmentId || null,
      assetId: body.assetId,
      employeeId: body.employeeId,
      status: outcome,
      returnedAt: now,
    },
  };
}

export async function POST(request: Request) {
  try {
    const { error, user } = await getAuthenticatedUser(request);
    if (error || !user) {
      return error;
    }

    const access = await getOfficeAccessForAuthUser(user.id, user.email || "");
    const payload = (await request.json()) as AssignmentPayload;

    if (payload.action === "assign") {
      if (!canByPermission(access.permissions, "assets_assign", access.isAdmin)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }

      if (!isValidBigIntId(payload.assetId) || !isValidBigIntId(payload.employeeId)) {
        return NextResponse.json({ success: false, error: "Invalid bigint IDs for asset or employee." }, { status: 400 });
      }

      const supabaseAdmin = getSupabaseAdmin();
      const rpcResult = await (supabaseAdmin as any).rpc("office_assign_asset", {
        p_asset_id: payload.assetId,
        p_employee_id: payload.employeeId,
        p_notes: payload.notes || null,
        p_expected_return_date: payload.expectedReturnDate || null,
        p_assigned_by: payload.assignedBy || user.user_metadata?.full_name || user.email,
      });

      if (!rpcResult.error && rpcResult.data) {
        const rpcData = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
        return NextResponse.json({
          success: true,
          data: {
            assignmentId: Number((rpcData as { assignment_id?: number } | null)?.assignment_id || 0),
            assetId: payload.assetId,
            employeeId: payload.employeeId,
          },
        });
      }

      if (rpcResult.error && !isFunctionMissing(rpcResult.error.message)) {
        return NextResponse.json({ success: false, error: rpcResult.error.message }, { status: 500 });
      }

      const fallback = await runAssignWithRollback(payload, String(user.user_metadata?.full_name || user.email || "Office User"));
      if (!fallback.success) {
        return NextResponse.json({ success: false, error: fallback.error }, { status: fallback.status });
      }
      return NextResponse.json({ success: true, data: fallback.data });
    }

    if (payload.action === "return") {
      if (!canByPermission(access.permissions, "assets_return", access.isAdmin)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }

      if (!isValidBigIntId(payload.assetId) || !isValidBigIntId(payload.employeeId)) {
        return NextResponse.json({ success: false, error: "Invalid bigint IDs for asset or employee." }, { status: 400 });
      }

      const supabaseAdmin = getSupabaseAdmin();
      const rpcResult = await (supabaseAdmin as any).rpc("office_return_asset", {
        p_assignment_id: payload.assignmentId || null,
        p_asset_id: payload.assetId,
        p_employee_id: payload.employeeId,
        p_outcome: payload.outcome || "Returned",
        p_notes: payload.notes || null,
      });

      if (!rpcResult.error && rpcResult.data) {
        return NextResponse.json({ success: true, data: rpcResult.data });
      }

      if (rpcResult.error && !isFunctionMissing(rpcResult.error.message)) {
        return NextResponse.json({ success: false, error: rpcResult.error.message }, { status: 500 });
      }

      const fallback = await runReturnWithRollback(payload);
      if (!fallback.success) {
        return NextResponse.json({ success: false, error: fallback.error }, { status: fallback.status });
      }

      return NextResponse.json({ success: true, data: fallback.data });
    }

    return NextResponse.json({ success: false, error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
