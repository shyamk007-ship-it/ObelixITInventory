"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/fleet/dashboard", label: "Fleet Dashboard" },
  { href: "/fleet/vessels", label: "Vessels" },
  { href: "/fleet/assets", label: "Fleet Assets" },
  { href: "/fleet/network", label: "Network Monitoring" },
  { href: "/fleet/checklist", label: "IT Checklist" },
  { href: "/fleet/maintenance", label: "Maintenance" },
  { href: "/fleet/incidents", label: "Incidents" },
  { href: "/fleet/crew", label: "Crew IT" },
  { href: "/fleet/documents", label: "Documents" },
  { href: "/fleet/reports", label: "Reports" },
  { href: "/fleet/settings", label: "Settings" },
  { href: "/", label: "← Back to Company Portal" },
];

export default function FleetSidebar() {
  const pathname = usePathname();

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        <h2 style={styles.logo}>IT Management</h2>
        <span style={styles.badge}>Fleet Operations</span>
      </div>

      <nav style={styles.nav}>
        {links.map((link) => (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            style={{
              ...styles.link,
              ...(pathname === link.href || pathname.startsWith(`${link.href}/`) ? styles.linkActive : {}),
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

const styles: Record<string, CSSProperties> = {
  sidebar: {
    width: 240,
    height: "100vh",
    position: "fixed",
    top: 0,
    left: 0,
    background: "#0f172a",
    color: "white",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRight: "1px solid rgba(148, 163, 184, 0.2)",
  },
  brand: {
    flexShrink: 0,
    marginBottom: 20,
  },
  logo: {
    margin: 0,
    color: "#38bdf8",
    fontSize: 24,
  },
  badge: {
    display: "inline-flex",
    marginTop: 12,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: 700,
  },
  nav: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    scrollbarWidth: "thin",
    scrollbarColor: "#475569 transparent",
  },
  link: {
    color: "white",
    textDecoration: "none",
    padding: 12,
    borderRadius: 8,
    background: "#1e293b",
    fontSize: 14,
    fontWeight: 600,
  },
  linkActive: {
    background: "#2563eb",
  },
};
