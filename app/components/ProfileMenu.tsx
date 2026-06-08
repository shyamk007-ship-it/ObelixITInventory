"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("Admin");

  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const displayName =
        user.user_metadata?.full_name ||
        user.email ||
        "Admin";

      setUserName(displayName);
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
    minWidth: 180,
    zIndex: 999,
    border: "1px solid #e2e8f0",
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
