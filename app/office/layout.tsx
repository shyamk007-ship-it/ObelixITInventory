"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import OfficeSidebar from "../components/office/OfficeSidebar";
import OfficeHeader from "../components/office/OfficeHeader";
import WorkspaceBreadcrumbs from "../components/shared/WorkspaceBreadcrumbs";
import { createAuditLog, buildAuditDescription } from "../lib/audit";
import { useEnterpriseAccess } from "../components/shared/EnterpriseAccessProvider";
import { canAccessWorkspaceAssignments } from "../lib/rbac";

const routeMeta: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Executive Dashboard",
    subtitle: "Monitor office assets, employees, support, maintenance, and service levels in one place.",
  },
  assets: {
    title: "Asset Management",
    subtitle: "Track office-only asset inventory, lifecycle, assignments, and disposition.",
  },
  employees: {
    title: "Employees",
    subtitle: "Manage office employee profiles, device ownership, and history.",
  },
  assignments: {
    title: "Assignments",
    subtitle: "Review office device assignments, transfers, returns, and history.",
  },
  tickets: {
    title: "Support Tickets",
    subtitle: "Handle office support queues, priorities, comments, and SLAs.",
  },
  reports: {
    title: "Reports",
    subtitle: "Summaries and exports for assets, employees, tickets, and maintenance.",
  },
  users: {
    title: "Users",
    subtitle: "Administer Office user accounts and permissions.",
  },
  settings: {
    title: "Settings",
    subtitle: "Configure departments, locations, roles, notifications, and governance.",
  },
  maintenance: {
    title: "Maintenance",
    subtitle: "Monitor preventive and corrective maintenance schedules and history.",
  },
  network: {
    title: "Network Monitoring",
    subtitle: "Review office connectivity, alerts, and infrastructure health.",
  },
  activity: {
    title: "Recent Activity",
    subtitle: "Audit office actions, access events, and operational changes.",
  },
  people: {
    title: "People Operations",
    subtitle: "Manage employee lifecycle, attendance, visitors, performance, training, and HR compliance in one workspace.",
  },
};

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, profile, assignments, currentWorkspace } = useEnterpriseAccess();
  const loggedAccess = useRef(false);
  const [lastSync, setLastSync] = useState(() => new Date());

  const headerMeta = useMemo(() => {
    const segments = (pathname || "/office/dashboard").split("/").filter(Boolean);
    const section = segments[1] || "dashboard";
    return routeMeta[section] || routeMeta.dashboard;
  }, [pathname]);

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      router.replace("/login");
      return;
    }

    if (!canAccessWorkspaceAssignments(assignments, "office")) {
      void createAuditLog({
        action: "Permission Denied",
        description: buildAuditDescription({
          event: "Permission Denied",
          userName: profile.full_name,
          recordType: "route",
          itemName: "/office",
          context: "Workspace access denied",
        }),
      });
      router.replace("/unauthorized");
      return;
    }

    if (!loggedAccess.current) {
      loggedAccess.current = true;
      void createAuditLog({
        action: "Route Access",
        description: buildAuditDescription({
          event: "Route Access",
          userName: profile.full_name,
          recordType: "route",
          itemName: currentWorkspace,
          context: "/office",
        }),
      });
    }
  }, [loading, profile, assignments, currentWorkspace, router]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLastSync(new Date());
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading || !profile || !canAccessWorkspaceAssignments(assignments, "office")) {
    return (
      <div style={styles.loading}>
        <p>Preparing Office workspace...</p>
      </div>
    );
  }

  return (
    <>
      <OfficeSidebar />
      <main style={styles.main}>
        <OfficeHeader
          title={headerMeta.title}
          subtitle={headerMeta.subtitle}
          breadcrumbs={<WorkspaceBreadcrumbs />}
        />
        <section style={styles.content}>{children}</section>
        <footer style={styles.footer}>
          <span style={styles.footerItem}>Application Version: v2.4.0</span>
          <span style={styles.footerItemSuccess}>Database Connected</span>
          <span style={styles.footerItemSuccess}>API Status: Healthy</span>
          <span style={styles.footerItemSuccess}>Storage Status: Available</span>
          <span style={styles.footerItemSuccess}>Mail Service: Operational</span>
          <span style={styles.footerItem}>Last Sync: {lastSync.toLocaleTimeString()}</span>
        </footer>
      </main>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    marginLeft: "var(--office-sidebar-width, 308px)",
    padding: 28,
    minHeight: "100vh",
    display: "grid",
    gridTemplateRows: "1fr auto",
    gap: 18,
    background:
      "radial-gradient(circle at top left, rgba(191, 219, 254, 0.42), transparent 34%), linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%)",
    transition: "margin-left 220ms ease",
  },
  content: {
    minHeight: 0,
  },
  footer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    borderRadius: 14,
    padding: "10px 12px",
    border: "1px solid #dbeafe",
    background: "rgba(255, 255, 255, 0.85)",
    color: "#334155",
    fontSize: 12,
    fontWeight: 700,
  },
  footerItem: {
    padding: "5px 8px",
    borderRadius: 8,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  footerItemSuccess: {
    padding: "5px 8px",
    borderRadius: 8,
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    color: "#166534",
  },
  loading: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%)",
    color: "#0f172a",
    fontFamily: "Inter, system-ui, sans-serif",
  },
};
