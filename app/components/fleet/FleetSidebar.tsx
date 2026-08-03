"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightLeft, FileText, LayoutDashboard, Package, Settings2, Ship, Ticket, Users, Wrench } from "lucide-react";
import { useEnterpriseAccess } from "../shared/EnterpriseAccessProvider";
import { roleLabel } from "../../lib/rbac";

const links = [
  { href: "/fleet/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fleet/vessels", label: "Vessels", icon: Ship },
  { href: "/fleet/assets", label: "Fleet Assets", icon: Package },
  { href: "/fleet/crew", label: "Crew", icon: Users },
  { href: "/fleet/assignments", label: "Assignments", icon: ArrowRightLeft },
  { href: "/fleet/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/fleet/incidents", label: "Incidents", icon: Ticket },
  { href: "/fleet/documents", label: "Documents", icon: FileText },
  { href: "/fleet/reports", label: "Reports", icon: FileText },
  { href: "/fleet/settings", label: "Settings", icon: Settings2 },
];

export default function FleetSidebar() {
  const pathname = usePathname();
  const { activeAssignment } = useEnterpriseAccess();
  const isSuperAdmin = activeAssignment?.role === "super_admin";

  const visibleLinks = links.filter((link) => link.href !== "/fleet/settings" || isSuperAdmin);

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        <div style={styles.brandHeader}>
          <Ship size={22} strokeWidth={2.2} />
          <div>
            <p style={styles.eyebrow}>Fleet Operations</p>
            <h2 style={styles.logo}>IT Management</h2>
          </div>
        </div>
        <span style={styles.badge}>{activeAssignment ? roleLabel[activeAssignment.role] : "Fleet Workspace"}</span>
      </div>

      <nav style={styles.nav}>
        {visibleLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              style={{
                ...styles.link,
                ...(active ? styles.linkActive : {}),
              }}
            >
              <link.icon size={16} strokeWidth={2.2} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <Link href="/" style={styles.portalLink}>
        Back to Company Portal
      </Link>
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
    display: "grid",
    gap: 12,
  },
  brandHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },
  eyebrow: {
    margin: 0,
    fontSize: 11,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#93c5fd",
    fontWeight: 800,
  },
  logo: {
    margin: "6px 0 0",
    color: "#ffffff",
    fontSize: 22,
  },
  badge: {
    display: "inline-flex",
    width: "fit-content",
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
  portalLink: {
    flexShrink: 0,
    marginTop: 12,
    color: "#cbd5e1",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 700,
  },
  link: {
    color: "white",
    textDecoration: "none",
    padding: "12px 14px",
    borderRadius: 14,
    background: "rgba(15, 23, 42, 0.34)",
    fontSize: 14,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid rgba(148, 163, 184, 0.14)",
    transition: "transform 160ms ease, background 160ms ease, border-color 160ms ease",
  },
  linkActive: {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    boxShadow: "0 14px 26px rgba(37, 99, 235, 0.24)",
  },
};
