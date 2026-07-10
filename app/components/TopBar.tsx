"use client";

import type { CSSProperties } from "react";
import ProfileMenu from "./ProfileMenu";
import NotificationBell from "./NotificationBell";

export default function TopBar() {
  return (
    <div style={styles.topbar}>
      <div style={styles.leftGroup}>
        <input
          type="text"
          placeholder="Search assets, employees, activity..."
          style={styles.search}
        />
      </div>

      <div style={styles.rightGroup}>
        <NotificationBell />
        <ProfileMenu />
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    gap: 16,
  },

  leftGroup: {
    flex: 1,
  },

  rightGroup: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  search: {
    width: "100%",
    maxWidth: 420,
    padding: 14,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 16,
    background: "white",
  },
};