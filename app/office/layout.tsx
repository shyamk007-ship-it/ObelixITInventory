"use client";

import { useEffect, useMemo, useRef } from "react";
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
    title: "Office Dashboard",
    subtitle: "Manage office assets, employees, support tickets, and administration.",
  },
  assets: {
    title: "Office Assets",
    subtitle: "Track office-only asset inventory, lifecycle, and allocation.",
  },
  employees: {
    title: "Employees",
    subtitle: "Manage office employee records and device ownership.",
  },
  assignments: {
    title: "Assignments",
    subtitle: "Review office device assignments and returns.",
  },
  tickets: {
    title: "Office Tickets",
    subtitle: "Handle office support queues, priorities, and assignees.",
  },
  reports: {
    title: "Office Reports",
    subtitle: "Summaries for office assets, tickets, maintenance, and usage.",
  },
  users: {
    title: "Office Users",
    subtitle: "Administer office and shared user accounts.",
  },
  settings: {
    title: "Office Settings",
    subtitle: "Configure office workspace preferences and policies.",
  },
  maintenance: {
    title: "Maintenance",
    subtitle: "Monitor office maintenance schedules and service history.",
  },
  network: {
    title: "Network Monitoring",
    subtitle: "Review office connectivity, alerts, and infrastructure health.",
  },
  activity: {
    title: "Recent Activity",
    subtitle: "Audit office actions and operational events.",
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
          breadcrumbs={<WorkspaceBreadcrumbs />}
        />
        {children}
      </main>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    marginLeft: 260,
    padding: 30,
    minHeight: "100vh",
    background: "#f1f5f9",
  },
  loading: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f8fafc",
    color: "#0f172a",
    fontFamily: "Arial, sans-serif",
  },
};
