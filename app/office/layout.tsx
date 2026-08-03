"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import OfficeSidebar from "../components/office/OfficeSidebar";
import OfficeHeader from "../components/office/OfficeHeader";
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
};

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, profile, assignments, currentWorkspace } = useEnterpriseAccess();
  const loggedAccess = useRef(false);

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
        />
        {children}
      </main>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    marginLeft: 292,
    padding: 28,
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(191, 219, 254, 0.42), transparent 34%), linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%)",
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
