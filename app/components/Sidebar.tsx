"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowRightLeft,
  Building2,
  FileText,
  LayoutDashboard,
  Package,
  Radio,
  Settings2,
  Ship,
  Ticket,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { getUserProfile, isEmployee, isOwnerEmail, roleLabel, Role } from "../lib/rbac";

type WorkspaceGroup = "office" | "fleet";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface WorkspaceSectionConfig {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

const OFFICE_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/assets", label: "Assets", icon: Package },
  { href: "/admin/employees", label: "Employees", icon: Users },
  { href: "/admin/assignments", label: "Assignments", icon: ArrowRightLeft },
  { href: "/admin/tickets", label: "Tickets", icon: Ticket },
  { href: "/admin/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/admin/network", label: "Network Monitoring", icon: Radio },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/activity", label: "Activity Logs", icon: FileText },
  { href: "/admin/users", label: "Users", icon: Users },
];

const FLEET_ITEMS: NavItem[] = [
  { href: "/fleet/dashboard", label: "Fleet Dashboard", icon: LayoutDashboard },
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

const WORKSPACE_SECTIONS: Record<WorkspaceGroup, WorkspaceSectionConfig> = {
  office: { title: "Office Operations", icon: Building2, items: OFFICE_ITEMS },
  fleet: { title: "Fleet Operations", icon: Ship, items: FLEET_ITEMS },
};

export default function Sidebar() {
  const [role, setRole] = useState<Role | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const activeGroup: WorkspaceGroup = pathname?.startsWith("/fleet") ? "fleet" : "office";
  const activeWorkspace = WORKSPACE_SECTIONS[activeGroup];

  useEffect(() => {
    const loadRole = async () => {
      const profile = await getUserProfile();

      if (!profile) {
        router.push("/login");
        return;
      }

      setRole(profile.role);
      setUserEmail(profile.email);
      setLoading(false);
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

  const showAdminLinks = !isEmployee(role) || isOwnerEmail(userEmail);

  return (
    <div style={styles.sidebar}>
      <div style={styles.brand}>
        <h2 style={styles.logo}>IT Management</h2>
        <span style={styles.roleBadge}>{roleLabel[role]}</span>
        <div style={styles.workspaceCard}>
          <span style={styles.workspaceLabel}>Current Workspace</span>
          <span style={styles.workspaceBadge}>
            <activeWorkspace.icon size={16} strokeWidth={2.2} />
            {activeWorkspace.title}
          </span>
        </div>
      </div>

      <nav className="sidebar-menu-scroll" style={styles.nav}>
        {showAdminLinks ? (
          <>
            <WorkspaceSection title={activeWorkspace.title} icon={activeWorkspace.icon} items={activeWorkspace.items} pathname={pathname} />
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
  icon: Icon,
  items,
  pathname,
}: {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
  pathname: string | null;
}) {
  return (
    <div style={styles.sectionWrap}>
      <div style={styles.sectionHeader}>
        <Icon size={18} strokeWidth={2.2} />
        <span style={styles.sectionTitle}>{title}</span>
      </div>

      <div style={styles.sectionBody}>
        {items.map((item) => (
          <SidebarLink key={`${title}-${item.label}`} href={item.href} label={item.label} icon={item.icon} pathname={pathname} nested />
        ))}
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  pathname,
  nested = false,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
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
      {Icon && <Icon size={16} strokeWidth={2.2} />}
      {label}
    </Link>
  );
}

const styles: Record<string, CSSProperties> = {
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
    marginBottom: 18,
    display: "grid",
    gap: 12,
  },
  roleBadge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: 700,
  },
  workspaceCard: {
    display: "grid",
    gap: 8,
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  workspaceLabel: {
    fontSize: 11,
    color: "#93c5fd",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontWeight: 800,
  },
  workspaceBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    width: "fit-content",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(37, 99, 235, 0.22)",
    color: "#eff6ff",
    fontSize: 13,
    fontWeight: 800,
    border: "1px solid rgba(96, 165, 250, 0.24)",
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
    padding: "12px 14px",
    borderRadius: 14,
    background: "rgba(15, 23, 42, 0.36)",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 700,
    border: "1px solid rgba(148, 163, 184, 0.14)",
    transition: "transform 160ms ease, background 160ms ease, border-color 160ms ease",
  },
  linkNested: {
    padding: "11px 12px",
    fontSize: 13,
    background: "rgba(15, 23, 42, 0.24)",
    marginTop: 8,
  },
  linkActive: {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    borderColor: "rgba(96, 165, 250, 0.4)",
    boxShadow: "0 14px 26px rgba(37, 99, 235, 0.24)",
  },
  sectionWrap: {
    display: "grid",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#93c5fd",
  },
  sectionTitle: {
    textAlign: "left",
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  sectionBody: {
    display: "grid",
  },
};
