"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { getUserProfile, roleLabel, Role } from "../lib/rbac";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [role, setRole] = useState<Role>("unknown");

  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const profile = await getUserProfile();

      if (!profile) {
        router.push("/login");
        return;
      }

      setUserName(profile.full_name);
      setRole(profile.role);
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div style={styles.wrapper}>
      <button
        type="button"
        style={styles.profileButton}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <div style={styles.avatar}>
          {userName.charAt(0).toUpperCase()}
        </div>

        <div style={styles.userInfo}>
          <span style={styles.userLabel}>Signed in as</span>
          <span style={styles.userName}>{userName}</span>
        </div>
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.profileHeader}>
            <span style={styles.profileName}>{userName}</span>
            <span style={styles.roleBadge}>{roleLabel[role] || "Unknown"}</span>
          </div>
          <button style={styles.dropdownItem} type="button">
            Profile
          </button>
          <button style={styles.dropdownItem} type="button">
            Settings
          </button>
          <button
            style={{
              ...styles.dropdownItem,
              color: "#ef4444",
            }}
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

const styles: any = {
  wrapper: {
    position: "relative",
  },

  profileButton: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "10px 14px",
    cursor: "pointer",
    minWidth: 180,
    justifyContent: "center",
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#2563eb",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: 18,
  },

  userInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    minWidth: 0,
  },

  userLabel: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.2,
  },

  userName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 120,
  },

  dropdown: {
    position: "absolute",
    top: 70,
    right: 0,
    background: "white",
    borderRadius: 16,
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
    overflow: "hidden",
    minWidth: 220,
    zIndex: 999,
    border: "1px solid #e2e8f0",
  },

  profileHeader: {
    padding: "16px 16px 8px",
    borderBottom: "1px solid #e2e8f0",
  },

  profileName: {
    display: "block",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 6,
  },

  roleBadge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 700,
  },

  dropdownItem: {
    width: "100%",
    textAlign: "left",
    padding: "12px 16px",
    border: "none",
    background: "white",
    cursor: "pointer",
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 600,
    transition: "background 0.15s ease, color 0.15s ease",
  },
};
