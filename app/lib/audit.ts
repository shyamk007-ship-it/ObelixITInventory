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

  const { error } = await supabase.from("activity_logs").insert([payload]);

  if (error) {
    console.warn("Audit log failed:", error.message);
  }
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
  const payload: any = {
    title,
    message,
    action,
    created_at: getTimestamp(),
    read: false,
  };

  if (createdBy) payload.user_name = createdBy;
  if (recordType) payload.record_type = recordType;
  if (recordId !== undefined) payload.record_id = recordId;

  const { error } = await supabase.from("notifications").insert([payload]);

  if (error) {
    // notifications table may be missing, continue silently
  }
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
