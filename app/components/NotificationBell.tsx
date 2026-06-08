"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const NOTIFICATION_STORAGE_KEY = "itmanagement_notifications_last_seen";
const notificationActions = [
  "Assigned Asset",
  "Returned Asset",
  "Created Employee",
  "Created Asset",
  "Deleted Asset",
  "Login",
  "Logout",
  "Created User",
];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [lastSeen, setLastSeen] = useState<string>("");

  useEffect(() => {
    const stored = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    setLastSeen(stored || "");
    loadNotifications();

    const channel = supabase
      .channel("notification_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        (payload) => {
          if (notificationActions.includes(payload.new.action)) {
            loadNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadNotifications = async () => {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, action, description, created_at")
      .in("action", notificationActions)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error) {
      setNotifications(data || []);
    }
  };

  const markAllAsRead = () => {
    const now = new Date().toISOString();
    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, now);
    setLastSeen(now);
  };

  const unreadCount = notifications.filter((notification) => {
    if (!lastSeen) return true;
    return new Date(notification.created_at) > new Date(lastSeen);
  }).length;

  return (
    <div style={styles.wrapper}>
      <button
        type="button"
        style={styles.bellButton}
        onClick={() => {
          setOpen(!open);
          if (!open) markAllAsRead();
        }}
        aria-label="Open notifications"
      >
        <span style={styles.bellIcon}>🔔</span>
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <strong>Notifications</strong>
            <span style={styles.markRead} onClick={markAllAsRead}>
              Mark all read
            </span>
          </div>
          {notifications.length === 0 ? (
            <div style={styles.emptyState}>No recent notifications.</div>
          ) : (
            notifications.map((item) => (
              <div key={item.id} style={styles.notificationItem}>
                <div>
                  <strong style={styles.notificationTitle}>{item.action}</strong>
                  <p style={styles.notificationDescription}>{item.description}</p>
                </div>
                <small style={styles.notificationTime}>
                  {new Date(item.created_at).toLocaleString()}
                </small>
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
    fontSize: 18,
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
    width: 360,
    maxHeight: 420,
    overflowY: "auto",
    background: "white",
    borderRadius: 20,
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)",
    border: "1px solid #e2e8f0",
    padding: 18,
    zIndex: 999,
    animation: "fadeIn 180ms ease",
  },
  dropdownHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  markRead: {
    fontSize: 12,
    color: "#2563eb",
    cursor: "pointer",
  },
  notificationItem: {
    padding: 14,
    borderRadius: 16,
    background: "#f8fafc",
    marginBottom: 12,
  },
  notificationTitle: {
    display: "block",
    marginBottom: 6,
    fontWeight: 700,
    color: "#0f172a",
  },
  notificationDescription: {
    margin: 0,
    color: "#475569",
    fontSize: 13,
  },
  notificationTime: {
    display: "block",
    marginTop: 10,
    color: "#94a3b8",
    fontSize: 12,
  },
  emptyState: {
    padding: 20,
    textAlign: "center",
    color: "#64748b",
  },
};
