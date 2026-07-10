import { supabase } from "./supabase";

const getDeviceInfo = () => {
  if (typeof navigator === "undefined") return "Unknown Device";
  const platform = navigator.platform || "Unknown platform";
  const userAgent = navigator.userAgent || "Unknown user agent";
  return `${platform} — ${userAgent}`;
};

const getTimestamp = () => new Date().toISOString();

export interface AuditOptions {
  action: string;
  description: string;
  createdBy?: string;
  recordType?: string;
  recordId?: string | number;
  extra?: string;
}

export const createAuditLog = async ({
  action,
  description,
}: AuditOptions) => {
  const payload = {
    action,
    description,
    created_at: getTimestamp(),
  };

  const auditTables = ["audit_logs", "activity_logs"];

  for (const table of auditTables) {
    const { error } = await supabase.from(table).insert([payload]);

    if (!error) {
      return;
    }
  }

  console.warn("Audit log failed:", action);
};

export const createNotification = async ({
  title,
  message,
  action,
  createdBy,
  recordType,
  recordId,
}: {
  title: string;
  message: string;
  action: string;
  createdBy?: string;
  recordType?: string;
  recordId?: string | number;
}) => {
  const payload: Record<string, string | boolean> = {
    title,
    message,
    action,
    created_at: getTimestamp(),
    read: false,
  };

  if (createdBy) payload.user_name = createdBy;
  if (recordType) payload.record_type = recordType;
  if (recordId !== undefined) payload.record_id = String(recordId);

  const { error } = await supabase.from("notifications").insert([payload]);

  if (error) {
    console.warn("Notification creation failed:", error.message);
  }
};

export const createNotificationIfNotExists = async ({
  title,
  message,
  action,
  createdBy,
  recordType,
  recordId,
}: {
  title: string;
  message: string;
  action: string;
  createdBy?: string;
  recordType?: string;
  recordId?: string | number;
}) => {
  if (recordType && recordId !== undefined) {
    const { data, error } = await supabase
      .from("notifications")
      .select("id")
      .eq("action", action)
      .eq("record_type", recordType)
      .eq("record_id", String(recordId))
      .limit(1);

    if (!error && data && data.length > 0) {
      return;
    }
  }

  await createNotification({ title, message, action, createdBy, recordType, recordId });
};

export const buildAuditDescription = ({
  event,
  userName,
  recordType,
  recordId,
  itemName,
  context,
}: {
  event: string;
  userName: string;
  recordType?: string;
  recordId?: string | number;
  itemName?: string;
  context?: string;
}) => {
  const parts: string[] = [];
  parts.push(`User: ${userName}`);
  parts.push(`Event: ${event}`);
  if (recordType) parts.push(`Record: ${recordType}`);
  if (recordId !== undefined) parts.push(`ID: ${recordId}`);
  if (itemName) parts.push(`Item: ${itemName}`);
  if (context) parts.push(context);
  if (typeof navigator !== "undefined") {
    parts.push(`Device: ${getDeviceInfo()}`);
  }
  return parts.join(" | ");
};
