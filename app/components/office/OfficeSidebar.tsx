"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  BadgeCheck,
  BookOpen,
  Box,
  Boxes,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileBarChart2,
  FileText,
  FolderKanban,
  Gauge,
  HandCoins,
  LayoutDashboard,
  LifeBuoy,
  Package,
  PackageCheck,
  PackageSearch,
  Radio,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Ticket,
  UserCog,
  Users,
  UsersRound,
  Wrench,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type NavLink = {
  href: string;
  label: string;
  icon: any;
  badgeKey?: "assets" | "employees" | "tickets" | "maintenance" | "vendors" | "po";
};

type NavSection = {
  id: string;
  title: string;
  icon: any;
  links: NavLink[];
};

const sections: NavSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    links: [{ href: "/office/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "asset-management",
    title: "Asset Management",
    icon: Package,
    links: [
      { href: "/office/assets", label: "Assets", icon: Package, badgeKey: "assets" },
      { href: "/office/assignments", label: "Assignments", icon: ClipboardCheck },
      { href: "/office/assets/warranty", label: "Warranty", icon: ShieldCheck },
      { href: "/office/maintenance", label: "Maintenance", icon: Wrench, badgeKey: "maintenance" },
      { href: "/office/assets/reports", label: "Asset Reports", icon: FileBarChart2 },
    ],
  },
  {
    id: "people",
    title: "People",
    icon: Users,
    links: [
      { href: "/office/employees", label: "Employees", icon: Users, badgeKey: "employees" },
      { href: "/office/departments", label: "Departments", icon: UsersRound },
      { href: "/office/visitors", label: "Visitors", icon: BadgeCheck },
    ],
  },
  {
    id: "support",
    title: "Support",
    icon: LifeBuoy,
    links: [
      { href: "/office/tickets", label: "Tickets", icon: Ticket, badgeKey: "tickets" },
      { href: "/office/knowledge-base", label: "Knowledge Base", icon: BookOpen },
      { href: "/office/sla", label: "SLA", icon: Gauge },
    ],
  },
  {
    id: "procurement",
    title: "Procurement",
    icon: ShoppingCart,
    links: [
      { href: "/office/purchase-requests", label: "Purchase Requests", icon: HandCoins },
      { href: "/office/purchase-orders", label: "Purchase Orders", icon: Receipt, badgeKey: "po" },
      { href: "/office/vendors", label: "Vendors", icon: PackageSearch, badgeKey: "vendors" },
      { href: "/office/contracts", label: "Contracts", icon: FolderKanban },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    icon: Boxes,
    links: [
      { href: "/office/inventory/stock", label: "Stock", icon: Box },
      { href: "/office/inventory/consumables", label: "Consumables", icon: PackageCheck },
      { href: "/office/inventory/spare-parts", label: "Spare Parts", icon: Sparkles },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    icon: FileText,
    links: [
      { href: "/office/analytics", label: "Analytics", icon: FileBarChart2 },
      { href: "/office/reports/export", label: "Export", icon: FileText },
      { href: "/office/reports/audit-logs", label: "Audit Logs", icon: ShieldCheck },
    ],
  },
  {
    id: "administration",
    title: "Administration",
    icon: UserCog,
    links: [
      { href: "/office/users", label: "Users", icon: UsersRound },
      { href: "/office/roles", label: "Roles", icon: ShieldCheck },
      { href: "/office/settings", label: "Settings", icon: UserCog },
      { href: "/office/company-profile", label: "Company Profile", icon: Building2 },
    ],
  },
];

type BadgeMap = Record<"assets" | "employees" | "tickets" | "maintenance" | "vendors" | "po", number>;

const initialBadges: BadgeMap = {
  assets: 0,
  employees: 0,
  tickets: 0,
  maintenance: 0,
  vendors: 0,
  po: 0,
};

export default function OfficeSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((section) => [section.id, true]))
  );
  const [badges, setBadges] = useState<BadgeMap>(initialBadges);

  useEffect(() => {
    const savedCollapsed = window.localStorage.getItem("office.sidebar.collapsed");
    if (savedCollapsed) {
      const parsed = savedCollapsed === "1";
      setCollapsed(parsed);
      document.documentElement.style.setProperty("--office-sidebar-width", parsed ? "96px" : "308px");
    } else {
      document.documentElement.style.setProperty("--office-sidebar-width", "308px");
    }

    const savedSections = window.localStorage.getItem("office.sidebar.sections");
    if (savedSections) {
      try {
        setOpenSections(JSON.parse(savedSections) as Record<string, boolean>);
      } catch {
        // ignore malformed local storage data
      }
    }

    const loadBadges = async () => {
      const [assetCount, employeeCount, ticketCount, maintenanceCount, vendorCount, poCount] = await Promise.all([
        supabase.from("assets").select("id", { count: "exact", head: true }).is("vessel_id", null),
        supabase.from("employees").select("id", { count: "exact", head: true }),
        supabase.from("tickets").select("id", { count: "exact", head: true }).is("vessel_id", null),
        supabase.from("asset_maintenance").select("id", { count: "exact", head: true }).eq("status", "Pending"),
        supabase.from("asset_vendors").select("id", { count: "exact", head: true }),
        supabase.from("asset_purchase_orders").select("id", { count: "exact", head: true }),
      ]);

      setBadges({
        assets: assetCount.count || 0,
        employees: employeeCount.count || 0,
        tickets: ticketCount.count || 0,
        maintenance: maintenanceCount.count || 0,
        vendors: vendorCount.count || 0,
        po: poCount.count || 0,
      });
    };

    void loadBadges();
  }, []);

  const activeSection = useMemo(() => {
    const current = sections.find((section) => section.links.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`)));
    return current?.id || "dashboard";
  }, [pathname]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem("office.sidebar.collapsed", next ? "1" : "0");
    document.documentElement.style.setProperty("--office-sidebar-width", next ? "96px" : "308px");
  };

  const toggleSection = (id: string) => {
    const next = { ...openSections, [id]: !openSections[id] };
    setOpenSections(next);
    window.localStorage.setItem("office.sidebar.sections", JSON.stringify(next));
  };

  return (
    <aside style={{ ...styles.sidebar, ...(collapsed ? styles.sidebarCollapsed : {}) }}>
      <div style={styles.topRow}>
        {!collapsed && (
          <div style={styles.brandHeader}>
            <Building2 size={20} strokeWidth={2.2} />
            <div>
              <p style={styles.eyebrow}>Office Operations</p>
              <h2 style={styles.logo}>Enterprise Workspace</h2>
            </div>
          </div>
        )}
        <button type="button" style={styles.iconButton} onClick={toggleCollapse} aria-label="Toggle sidebar">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav style={styles.nav} aria-label="Office navigation">
        {sections.map((section) => {
          const opened = collapsed ? false : openSections[section.id] ?? true;
          const sectionActive = section.id === activeSection;

          return (
            <section key={section.id} style={styles.section}>
              <button
                type="button"
                style={{ ...styles.sectionHeader, ...(sectionActive ? styles.sectionHeaderActive : {}) }}
                onClick={() => toggleSection(section.id)}
                aria-expanded={opened}
              >
                <span style={styles.sectionTitleWrap}>
                  <section.icon size={16} strokeWidth={2.1} />
                  {!collapsed && <span style={styles.sectionTitle}>{section.title}</span>}
                </span>
                {!collapsed && <ChevronDown size={14} style={{ transform: opened ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 140ms ease" }} />}
              </button>

              {(opened || collapsed) && (
                <div style={{ ...styles.sectionLinks, ...(collapsed ? styles.sectionLinksCollapsed : {}) }}>
                  {section.links.map((link) => {
                    const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                    const badge = link.badgeKey ? badges[link.badgeKey] : 0;

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        style={{ ...styles.link, ...(active ? styles.linkActive : {}), ...(collapsed ? styles.linkCollapsed : {}) }}
                        title={collapsed ? link.label : undefined}
                      >
                        <link.icon size={16} strokeWidth={2.2} />
                        {!collapsed && <span style={styles.linkText}>{link.label}</span>}
                        {!collapsed && !!link.badgeKey && <span style={styles.badge}>{badge}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </nav>

      <Link href="/" style={styles.portalLink}>
        {collapsed ? "CP" : "Company Portal"}
      </Link>
      <Link href="/office/network" style={styles.portalLink}>
        {collapsed ? "NET" : "Network Status"}
      </Link>
    </aside>
  );
}

const styles: Record<string, CSSProperties> = {
  sidebar: {
    width: "var(--office-sidebar-width, 308px)",
    height: "100vh",
    position: "fixed",
    inset: "0 auto 0 0",
    background: "#0f172a",
    color: "white",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    overflow: "hidden",
    borderRight: "1px solid rgba(148, 163, 184, 0.16)",
    boxShadow: "16px 0 40px rgba(15, 23, 42, 0.22)",
    transition: "width 220ms ease",
    zIndex: 100,
  },
  sidebarCollapsed: {
    padding: 12,
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  brandHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  eyebrow: {
    margin: 0,
    fontSize: 10,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#93c5fd",
    fontWeight: 800,
  },
  logo: {
    margin: "6px 0 0",
    color: "#ffffff",
    fontSize: 16,
    lineHeight: 1.15,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    border: "1px solid rgba(148, 163, 184, 0.3)",
    background: "rgba(15, 23, 42, 0.4)",
    color: "#dbeafe",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  nav: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    paddingRight: 3,
    display: "grid",
    gap: 8,
  },
  section: {
    display: "grid",
    gap: 6,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: 10,
    background: "#1e293b",
    color: "#e2e8f0",
    padding: "9px 10px",
    cursor: "pointer",
  },
  sectionHeaderActive: {
    borderColor: "rgba(59, 130, 246, 0.55)",
    background: "#2563eb",
  },
  sectionTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  },
  sectionLinks: {
    display: "grid",
    gap: 6,
    paddingLeft: 4,
  },
  sectionLinksCollapsed: {
    paddingLeft: 0,
  },
  link: {
    color: "#e2e8f0",
    textDecoration: "none",
    padding: "10px 10px",
    borderRadius: 10,
    background: "#111827",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    fontSize: 13,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "transform 160ms ease, background 160ms ease, border-color 160ms ease",
  },
  linkCollapsed: {
    justifyContent: "center",
  },
  linkActive: {
    background: "#2563eb",
    borderColor: "rgba(59, 130, 246, 0.7)",
    color: "white",
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.2)",
    transform: "translateX(2px)",
  },
  linkText: {
    flex: 1,
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    background: "rgba(255, 255, 255, 0.15)",
    color: "#eff6ff",
    display: "grid",
    placeItems: "center",
    fontSize: 11,
    fontWeight: 800,
    padding: "0 6px",
  },
  portalLink: {
    textDecoration: "none",
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: 800,
    padding: "10px 11px",
    borderRadius: 10,
    border: "1px solid rgba(148, 163, 184, 0.2)",
    background: "rgba(255,255,255,0.04)",
    textAlign: "center",
  },
};
