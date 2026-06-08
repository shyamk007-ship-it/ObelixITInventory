"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { createNotificationIfNotExists } from "../lib/audit";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await scanDueNotifications();
      await loadNotifications();
    };

    initialize();

    const refreshInterval = window.setInterval(() => {
      loadNotifications();
    }, 30000);

    const channel = supabase
      .channel("notifications_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          loadNotifications();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      window.clearInterval(refreshInterval);
      channel.unsubscribe();
    };
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, action, read, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    setLoading(false);
    if (!error) {
      setNotifications(data || []);
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
      for (const record of maintenanceData) {
        if (!record.maintenance_date) continue;
        const maintenanceDate = new Date(record.maintenance_date);
        if (maintenanceDate >= now && maintenanceDate <= dueThreshold) {
          const assetName =
            record.assets?.[0]?.asset_name ||
            "Asset";

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
      .select("id, asset_name, warranty_expiry");

    if (warrantyData) {
      for (const asset of warrantyData) {
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
    if (unreadIds.length === 0) {
      return;
    }

    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    await loadNotifications();
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <div style={styles.wrapper}>
      <button
        type="button"
        style={styles.bellButton}
        onClick={async () => {
          setOpen(!open);
          if (!open) {
            await markAllAsRead();
          }
        }}
        aria-label="Open notifications"
      >
        <span style={styles.bellIcon}>🔔</span>
        {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <div>
              <strong>Notifications</strong>
              <p style={styles.subtitle}>Recent updates and action alerts</p>
            </div>
            <button type="button" style={styles.markRead} onClick={markAllAsRead}>
              Mark all read
            </button>
          </div>

          {loading ? (
            <div style={styles.emptyState}>Refreshing notifications...</div>
          ) : notifications.length === 0 ? (
            <div style={styles.emptyState}>No notifications yet.</div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                style={{
                  ...styles.notificationItem,
                  background: item.read ? "#f8fafc" : "#eff6ff",
                }}
              >
                <div style={styles.notificationMeta}>
                  <span style={styles.notificationBadge}>{item.action}</span>
                  <small style={styles.notificationTime}>
                    {new Date(item.created_at).toLocaleString()}
                  </small>
                </div>
                <strong style={styles.notificationTitle}>{item.title}</strong>
                <p style={styles.notificationDescription}>{item.message}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles: any = {
  wrapper: {
    position: "relative",
  },
  bellButton: {
    position: "relative",
    width: 48,
    height: 48,
    borderRadius: 999,
    border: "1px solid #e2e8f0",
    background: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  bellIcon: {
    fontSize: 20,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    background: "#ef4444",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    padding: "0 6px",
  },
  dropdown: {
    position: "absolute",
    right: 0,
    top: 60,
    width: 380,
    maxHeight: 470,
    overflowY: "auto",
    background: "white",
    borderRadius: 20,
    boxShadow: "0 25px 80px rgba(15, 23, 42, 0.14)",
    border: "1px solid #e2e8f0",
    padding: 18,
    zIndex: 999,
  },
  dropdownHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 16,
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: 13,
  },
  markRead: {
    fontSize: 12,
    color: "#2563eb",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 700,
  },
  notificationItem: {
    padding: 18,
    borderRadius: 18,
    marginBottom: 14,
    border: "1px solid #e2e8f0",
  },
  notificationMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 14,
  },
  notificationBadge: {
    padding: "4px 10px",
    borderRadius: 999,
    background: "#e0f2fe",
    color: "#0369a1",
    fontSize: 12,
    fontWeight: 700,
  },
  notificationTitle: {
    display: "block",
    margin: "0 0 6px",
    fontWeight: 700,
    color: "#0f172a",
  },
  notificationDescription: {
    margin: 0,
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.6,
  },
  notificationTime: {
    color: "#64748b",
    fontSize: 12,
  },
  emptyState: {
    padding: 20,
    textAlign: "center",
    color: "#64748b",
  },
};
