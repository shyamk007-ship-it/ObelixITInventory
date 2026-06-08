"use client";

import {
  FiBell,
  FiSearch,
} from "react-icons/fi";

export default function TopBar() {
  return (
    <div style={styles.topbar}>
      <div>
        <h1 style={styles.title}>
          IT Asset Dashboard
        </h1>

        <p style={styles.subtitle}>
          Jira-style Asset Management
        </p>
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

        <div style={styles.avatar}>
          A
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
    fontSize: 32,
    fontWeight: "bold",
    color: "#0f172a",
  },

  subtitle: {
    color: "#64748b",
    marginTop: 6,
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: 20,
  },

  searchBox: {
    display: "flex",
    alignItems: "center",
    background: "white",
    padding: "10px 14px",
    borderRadius: 10,
    gap: 10,
  },

  input: {
    border: "none",
    outline: "none",
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