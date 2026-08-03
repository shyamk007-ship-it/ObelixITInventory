"use client";

import type { CSSProperties, ReactNode } from "react";
import NotificationBell from "../shared/NotificationBell";
import UserProfile from "../shared/UserProfile";
import SearchBar from "../shared/SearchBar";

interface OfficeHeaderProps {
  title: string;
  subtitle: string;
  breadcrumbs?: ReactNode;
}

export default function OfficeHeader({ title, subtitle, breadcrumbs }: OfficeHeaderProps) {
  return (
    <header style={styles.wrap}>
      <div style={styles.left}>
        {breadcrumbs}
        <p style={styles.eyebrow}>Office Workspace</p>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.subtitle}>{subtitle}</p>
      </div>

      <div style={styles.right}>
        <SearchBar placeholder="Search assets, employees, tickets, reports..." />
        <NotificationBell />
        <UserProfile />
      </div>
    </header>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 24,
    flexWrap: "wrap",
    alignItems: "center",
    padding: 20,
    borderRadius: 24,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(239,246,255,0.96) 100%)",
    border: "1px solid rgba(191, 219, 254, 0.9)",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
  },
  left: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },
  eyebrow: {
    margin: 0,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    fontSize: 11,
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: 32,
    color: "#0f172a",
    fontWeight: 900,
    letterSpacing: "-0.03em",
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
    maxWidth: 720,
    lineHeight: 1.6,
  },
  right: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    marginLeft: "auto",
  },
};
