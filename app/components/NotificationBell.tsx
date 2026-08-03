"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { createNotificationIfNotExists } from "../lib/audit";

type NotificationRow = {
  id: number;
  title?: string | null;
  message?: string | null;
  action?: string | null;
  read?: boolean | null;
  created_at?: string | null;
};

type NotificationGroup =
  | "Assignments"
  | "Maintenance"
  | "Warranty"
  | "Tickets"
  | "Purchases"
  | "Approvals"
  | "System Alerts";

const inferGroup = (item: NotificationRow): NotificationGroup => {
  const text = `${item.title || ""} ${item.action || ""} ${item.message || ""}`.toLowerCase();
  if (text.includes("assign")) return "Assignments";
  if (text.includes("maintenance")) return "Maintenance";
  if (text.includes("warranty")) return "Warranty";
  if (text.includes("ticket")) return "Tickets";
  if (text.includes("purchase") || text.includes("vendor") || text.includes("invoice")) return "Purchases";
  if (text.includes("approve") || text.includes("approval")) return "Approvals";
  return "System Alerts";
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await scanDueNotifications();
      await loadNotifications();
    };

    void initialize();

    const refreshInterval = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    const channel = supabase
      .channel("notifications_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        void loadNotifications();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, () => {
        void loadNotifications();
      })
      .subscribe();

    return () => {
      window.clearInterval(refreshInterval);
      void supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, action, read, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    setLoading(false);
    if (!error) {
      setNotifications((data as NotificationRow[]) || []);
    }
  };

  const scanDueNotifications = async () => {
    const now = new Date();
    const dueThreshold = new Date(now);
    dueThreshold.setDate(now.getDate() + 30);

    const { data: maintenanceData } = await supabase
      .from("asset_maintenance")
      .select("id, maintenance_date, assets(asset_name)")
      .eq("status", "Pending");

    if (maintenanceData) {
      for (const record of maintenanceData as Array<any>) {
        if (!record.maintenance_date) continue;
        const maintenanceDate = new Date(record.maintenance_date);
        if (maintenanceDate >= now && maintenanceDate <= dueThreshold) {
          const assetName = Array.isArray(record.assets) ? record.assets?.[0]?.asset_name || "Asset" : record.assets?.asset_name || "Asset";
          await createNotificationIfNotExists({
            title: "Maintenance due",
            message: `${assetName} is due for maintenance on ${maintenanceDate.toLocaleDateString()}.`,
            action: "Maintenance Due",
            recordType: "asset_maintenance",
            recordId: record.id,
          });
        }
      }
    }

    const { data: warrantyData } = await supabase
      .from("assets")
      .select("id, asset_name, warranty_expiry")
      .is("vessel_id", null);

    if (warrantyData) {
      for (const asset of warrantyData as Array<any>) {
        if (!asset.warranty_expiry) continue;
        const expiryDate = new Date(asset.warranty_expiry);
        if (expiryDate >= now && expiryDate <= dueThreshold) {
          await createNotificationIfNotExists({
            title: "Warranty expiring soon",
            message: `${asset.asset_name} warranty expires on ${expiryDate.toLocaleDateString()}.`,
            action: "Warranty Expiring",
            recordType: "asset",
            recordId: asset.id,
          });
        }
      }
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    await loadNotifications();
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const grouped = useMemo(() => {
    const map = new Map<NotificationGroup, NotificationRow[]>();
    notifications.forEach((item) => {
      const group = inferGroup(item);
      const list = map.get(group) || [];
      list.push(item);
      map.set(group, list);
    });
    return map;
  }, [notifications]);

  return (
    <>
      <button
        type="button"
        style={styles.bellButton}
        onClick={() => setOpen(true)}
        aria-label="Open notifications"
      >
        <Bell size={20} strokeWidth={2.2} />
        {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
      </button>

      {open && (
        <div style={styles.drawerBackdrop}>
          <aside style={styles.drawer} role="dialog" aria-label="Notification center">
            <div style={styles.drawerHeader}>
              <div>
                <h3 style={styles.drawerTitle}>Notification Center</h3>
                <p style={styles.subtitle}>Assignments, maintenance, warranty, tickets, purchases, approvals, and system alerts.</p>
              </div>
              <div style={styles.headerActions}>
                <button type="button" style={styles.iconButton} onClick={() => void markAllAsRead()} aria-label="Mark all read">
                  <CheckCheck size={16} />
                </button>
                <button type="button" style={styles.iconButton} onClick={() => setOpen(false)} aria-label="Close notifications">
                  <X size={16} />
                </button>
              </div>
            </div>

            {loading ? (
              <div style={styles.emptyState}>Refreshing notifications...</div>
            ) : notifications.length === 0 ? (
              <div style={styles.emptyState}>No notifications yet.</div>
            ) : (
              <div style={styles.groupWrap}>
                {Array.from(grouped.entries()).map(([group, items]) => (
                  <section key={group} style={styles.groupSection}>
                    <div style={styles.groupHeader}>
                      <strong style={styles.groupTitle}>{group}</strong>
                      <span style={styles.groupBadge}>{items.filter((item) => !item.read).length} unread</span>
                    </div>
                    <div style={styles.items}>
                      {items.map((item) => (
                        <article
                          key={item.id}
                          style={{
                            ...styles.notificationItem,
                            background: item.read ? "#f8fafc" : "#eff6ff",
                          }}
                        >
                          <div style={styles.notificationMeta}>
                            <span style={styles.notificationBadge}>{item.action || "Alert"}</span>
                            <small style={styles.notificationTime}>{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</small>
                          </div>
                          <strong style={styles.notificationTitle}>{item.title || "Notification"}</strong>
                          <p style={styles.notificationDescription}>{item.message || "No details"}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  bellButton: {
    position: "relative",
    width: 46,
    height: 46,
    borderRadius: 999,
    border: "1px solid #dbeafe",
    background: "white",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    color: "#0f172a",
    boxShadow: "0 10px 20px rgba(15, 23, 42, 0.06)",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    background: "#ef4444",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontSize: 11,
    fontWeight: 800,
    padding: "0 6px",
  },
  drawerBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.35)",
    zIndex: 1100,
    display: "flex",
    justifyContent: "flex-end",
  },
  drawer: {
    width: "min(520px, 96vw)",
    height: "100vh",
    background: "white",
    borderLeft: "1px solid #dbeafe",
    boxShadow: "-12px 0 40px rgba(15, 23, 42, 0.14)",
    display: "grid",
    gridTemplateRows: "auto 1fr",
    overflow: "hidden",
  },
  drawerHeader: {
    padding: 18,
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  drawerTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 20,
    fontWeight: 900,
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
  },
  headerActions: {
    display: "flex",
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: "1px solid #dbeafe",
    background: "#f8fafc",
    color: "#0f172a",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },
  emptyState: {
    padding: 22,
    color: "#64748b",
    textAlign: "center",
  },
  groupWrap: {
    padding: 14,
    overflowY: "auto",
    display: "grid",
    gap: 14,
  },
  groupSection: {
    display: "grid",
    gap: 8,
  },
  groupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  groupTitle: {
    color: "#0f172a",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  groupBadge: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 800,
  },
  items: {
    display: "grid",
    gap: 10,
  },
  notificationItem: {
    padding: 14,
    borderRadius: 14,
    border: "1px solid #e2e8f0",
  },
  notificationMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  notificationBadge: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1e3a8a",
    fontSize: 11,
    fontWeight: 800,
  },
  notificationTitle: {
    display: "block",
    color: "#0f172a",
    fontSize: 14,
  },
  notificationDescription: {
    margin: "6px 0 0",
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.5,
  },
  notificationTime: {
    color: "#64748b",
    fontSize: 11,
  },
};
