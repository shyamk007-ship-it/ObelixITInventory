"use client";

import { useEffect, useState } from "react";
import { FiBell, FiSearch } from "react-icons/fi";
import { supabase } from "../lib/supabase";

export default function TopBar() {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [userName, setUserName] = useState("Admin");

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data } = await supabase
        .from("users")
        .select("full_name")
        .eq("email", user.email)
        .single();

      setUserName(data?.full_name || user.email || "Admin");
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div style={styles.topbar}>
      <div>
        <h1 style={styles.title}>
          IT Management Dashboard
        </h1>
      </div>

      <div style={styles.right}>
        <div style={styles.searchBox}>
          <FiSearch />
          <input
            placeholder="Search..."
            style={styles.input}
          />
        </div>

        <div style={styles.bell}>
          <FiBell />
        </div>

        <div style={styles.profileContainer}>
          <button
            type="button"
            style={styles.profileButton}
            onClick={() =>
              setProfileMenuOpen(
                !profileMenuOpen
              )
            }
          >
            <div style={styles.avatar}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <span style={styles.profileName}>
              {userName}
            </span>
          </button>

          {profileMenuOpen && (
            <div style={styles.dropdown}>
              <button
                type="button"
                style={styles.dropdownItem}
              >
                Profile
              </button>
              <button
                type="button"
                style={styles.dropdownItem}
              >
                Settings
              </button>
              <button
                type="button"
                style={styles.dropdownItem}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },

  title: {
    fontSize: 40,
    fontWeight: 900,
    color: "#0f172a",
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },

  searchBox: {
    display: "flex",
    alignItems: "center",
    background: "white",
    padding: "10px 14px",
    borderRadius: 10,
    gap: 10,
    minWidth: 220,
  },

  input: {
    border: "none",
    outline: "none",
    minWidth: 120,
  },

  bell: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
  },

  profileContainer: {
    position: "relative",
  },

  profileButton: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "10px 14px",
    cursor: "pointer",
    color: "#0f172a",
    fontWeight: 600,
  },

  profileName: {
    whiteSpace: "nowrap",
    maxWidth: 140,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  dropdown: {
    position: "absolute",
    top: 60,
    right: 0,
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
    overflow: "hidden",
    minWidth: 160,
    zIndex: 20,
  },

  dropdownItem: {
    width: "100%",
    textAlign: "left",
    padding: "12px 16px",
    background: "white",
    border: "none",
    cursor: "pointer",
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 600,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "#2563eb",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: "bold",
  },
};