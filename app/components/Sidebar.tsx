"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <div style={styles.sidebar}>
      <h2 style={styles.logo}>
        IT Management
      </h2>

      <nav style={styles.nav}>
        <Link href="/dashboard" style={styles.link}>
          Dashboard
        </Link>

        <Link href="/admin/assets" style={styles.link}>
          Assets
        </Link>

        <Link href="/admin/employees" style={styles.link}>
          Employees
        </Link>

        <Link href="/admin/assignments" style={styles.link}>
          Assignments
        </Link>

        <Link href="/admin/users" style={styles.link}>
          Users
        </Link>
      </nav>
    </div>
  );
}

const styles: any = {
  sidebar: {
    width: 240,
    height: "100vh",
    background: "#0f172a",
    color: "white",
    padding: 20,
    position: "fixed",
    left: 0,
    top: 0,
  },

  logo: {
    marginBottom: 40,
    color: "#38bdf8",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  link: {
    color: "white",
    textDecoration: "none",
    padding: 12,
    borderRadius: 8,
    background: "#1e293b",
  },
};