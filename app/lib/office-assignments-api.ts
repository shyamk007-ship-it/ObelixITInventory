"use client";

import { supabase } from "./supabase";

type AssignRequest = {
  assetId: number;
  employeeId: number;
  notes?: string | null;
  expectedReturnDate?: string | null;
  assignedBy?: string | null;
};

type ReturnRequest = {
  assignmentId?: number | null;
  assetId: number;
  employeeId: number;
  outcome?: "Returned" | "Lost" | "Damaged";
  notes?: string | null;
};

async function postAssignmentAction<T>(body: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("You are not authenticated.");
  }

  const response = await fetch("/api/office/assignments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as { success?: boolean; error?: string; data?: T };
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Assignment operation failed.");
  }

  return payload.data as T;
}

export async function assignOfficeAsset(request: AssignRequest) {
  return postAssignmentAction<{ assignmentId: number; assetId: number; employeeId: number }>({
    action: "assign",
    ...request,
  });
}

export async function returnOfficeAsset(request: ReturnRequest) {
  return postAssignmentAction<{ returnRecordId: number; assignmentId: number | null; assetId: number; employeeId: number; status: string }>({
    action: "return",
    ...request,
  });
}
