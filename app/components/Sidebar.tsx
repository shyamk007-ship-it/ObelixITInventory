"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getUserProfile, isEmployee, roleLabel, Role } from "../lib/rbac";

type WorkspaceGroup = "office" | "fleet";

interface NavItem {
  href: string;
  label: string;
}

const OFFICE_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/admin/assets", label: "Assets" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/assignments", label: "Assignments" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/maintenance", label: "Maintenance" },
  { href: "/admin/network", label: "Network Monitoring" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/activity", label: "Activity Logs" },
  { href: "/admin/users", label: "Users" },
];

const FLEET_ITEMS: NavItem[] = [
  { href: "/fleet/dashboard", label: "Fleet Dashboard" },
  { href: "/fleet/vessels", label: "Vessels" },
  { href: "/admin/assets", label: "Fleet Assets" },
  { href: "/admin/network", label: "Network Monitoring" },
  { href: "/admin/checklists", label: "IT Checklist" },
  { href: "/admin/maintenance", label: "Maintenance" },
  { href: "/admin/tickets", label: "Incidents" },
  { href: "/fleet/documents", label: "Documents" },
  { href: "/fleet/reports", label: "Reports" },
  { href: "/fleet/vessels", label: "Crew IT" },
];

export default function Sidebar() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<WorkspaceGroup>("office");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const loadRole = async () => {
      const profile = await getUserProfile();

      if (!profile) {
        router.push("/login");
        return;
      }

      setRole(profile.role);
      setLoading(false);

      if (pathname?.startsWith("/fleet")) {
        setExpandedGroup("fleet");
      } else {
        setExpandedGroup("office");
      }
    };

    void loadRole();
  }, [pathname, router]);

  if (loading || !role) {
    return (
      <div style={styles.sidebar}>
        <div style={styles.brand}>
          <h2 style={styles.logo}>IT Management</h2>
          <span style={styles.roleBadge}>Loading...</span>
        </div>
        <div style={styles.loadingWrap}>
          <p style={styles.loading}>Loading menu...</p>
        </div>
      </div>
    );
  }

  const showAdminLinks = !isEmployee(role);

  return (
    <div style={styles.sidebar}>
      <div style={styles.brand}>
        <h2 style={styles.logo}>IT Management</h2>
        <span style={styles.roleBadge}>{roleLabel[role]}</span>
      </div>

      <nav className="sidebar-menu-scroll" style={styles.nav}>
        {showAdminLinks ? (
          <>
            <SidebarLink href="/dashboard" label="Dashboard" pathname={pathname} />

            <WorkspaceSection
              title="?? OFFICE OPERATIONS"
              expanded={expandedGroup === "office"}
              onToggle={() => setExpandedGroup("office")}
              items={OFFICE_ITEMS}
              pathname={pathname}
            />

            <WorkspaceSection
              title="?? FLEET OPERATIONS"
              expanded={expandedGroup === "fleet"}
              onToggle={() => setExpandedGroup("fleet")}
              items={FLEET_ITEMS}
              pathname={pathname}
            />
          </>
        ) : (
          <>
            <SidebarLink href="/employee" label="My Assignments" pathname={pathname} />
            <SidebarLink href="/employee" label="My Support" pathname={pathname} />
          </>
        )}
      </nav>

      <style jsx global>{`
        .sidebar-menu-scroll {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }

        .sidebar-menu-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-menu-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-menu-scroll::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 999px;
        }

        .sidebar-menu-scroll::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
}

function WorkspaceSection({
  title,
  expanded,
  onToggle,
  items,
  pathname,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  items: NavItem[];
  pathname: string | null;
}) {
  const maxHeight = expanded ? items.length * 46 + 12 : 0;

  return (
    <div style={styles.sectionWrap}>
      <button type="button" onClick={onToggle} style={styles.sectionToggle}>
        <span style={styles.sectionTitle}>{title}</span>
        <span style={styles.sectionArrow}>{expanded ? "?" : "?"}</span>
      </button>

      <div
        style={{
          ...styles.sectionBody,
          maxHeight,
          opacity: expanded ? 1 : 0.65,
        }}
      >
        {items.map((item) => (
          <SidebarLink key={`${title}-${item.label}`} href={item.href} label={item.label} pathname={pathname} nested />
        ))}
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  label,
  pathname,
  nested = false,
}: {
  href: string;
  label: string;
  pathname: string | null;
  nested?: boolean;
}) {
  const active = pathname === href || (href !== "/" && pathname?.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      style={{
        ...styles.link,
        ...(nested ? styles.linkNested : {}),
        ...(active ? styles.linkActive : {}),
      }}
    >
      {label}
    </Link>
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
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  logo: {
    marginBottom: 16,
    color: "#38bdf8",
    fontSize: 24,
  },
  brand: {
    flexShrink: 0,
    marginBottom: 28,
  },
  roleBadge: {
    display: "inline-flex",
    marginTop: 12,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: 700,
  },
  loadingWrap: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  loading: {
    color: "#cbd5e1",
    fontSize: 14,
  },
  nav: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    overflowY: "auto",
    overflowX: "hidden",
    scrollbarWidth: "thin",
    scrollbarColor: "#475569 transparent",
    paddingRight: 2,
  },
  link: {
    color: "white",
    textDecoration: "none",
    padding: 12,
    borderRadius: 8,
    background: "#1e293b",
    fontSize: 14,
    display: "block",
  },
  linkNested: {
    padding: "10px 12px",
    fontSize: 13,
    background: "#172435",
    marginTop: 8,
  },
  linkActive: {
    background: "#2563eb",
  },
  sectionWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  sectionToggle: {
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#38bdf8",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "2px 2px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    cursor: "pointer",
  },
  sectionTitle: {
    textAlign: "left",
  },
  sectionArrow: {
    color: "#94a3b8",
    fontSize: 12,
  },
  sectionBody: {
    overflow: "hidden",
    transition: "max-height 240ms ease, opacity 220ms ease",
  },
};
