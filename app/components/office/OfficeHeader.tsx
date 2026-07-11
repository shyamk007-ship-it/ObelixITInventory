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
        <SearchBar placeholder="Search office assets, employees, tickets..." />
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
    gap: 16,
    marginBottom: 22,
    flexWrap: "wrap",
    alignItems: "center",
  },
  left: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  eyebrow: {
    margin: 0,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    fontSize: 12,
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: 30,
    color: "#0f172a",
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
  },
  right: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
};
