"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import FleetSidebar from "../components/fleet/FleetSidebar";
import FleetHeader from "../components/fleet/FleetHeader";
import WorkspaceBreadcrumbs from "../components/shared/WorkspaceBreadcrumbs";
import { buildAuditDescription, createAuditLog } from "../lib/audit";
import { useEnterpriseAccess } from "../components/shared/EnterpriseAccessProvider";
import { canAccessWorkspaceAssignments } from "../lib/rbac";

const routeMeta: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Fleet Dashboard",
    subtitle: "Monitor vessels, fleet assets, maintenance, certificates, and support activity.",
  },
  vessels: {
    title: "Vessels",
    subtitle: "Open vessel workspaces and review fleet-level vessel health.",
  },
  assets: {
    title: "Fleet Assets",
    subtitle: "Review vessel-linked assets across the fleet workspace.",
  },
  crew: {
    title: "Crew",
    subtitle: "Track fleet crew records and vessel assignments.",
  },
  assignments: {
    title: "Assignments",
    subtitle: "Manage fleet asset assignment workflows and return status.",
  },
  tickets: {
    title: "Fleet Tickets",
    subtitle: "Track vessel incidents, open fleet tickets, and response workload.",
  },
  maintenance: {
    title: "Maintenance",
    subtitle: "Review pending maintenance work across the fleet.",
  },
  certificates: {
    title: "Certificates",
    subtitle: "Reference fleet certificates and vessel-linked records.",
  },
  reports: {
    title: "Fleet Reports",
    subtitle: "Operational reporting for vessels, assets, maintenance, and incidents.",
  },
  users: {
    title: "Fleet Users",
    subtitle: "Administer fleet and shared user accounts.",
  },
  settings: {
    title: "Fleet Settings",
    subtitle: "Configure fleet workspace preferences and defaults.",
  },
  incidents: {
    title: "Fleet Tickets",
    subtitle: "Track vessel incidents, open fleet tickets, and response workload.",
  },
  documents: {
    title: "Certificates",
    subtitle: "Reference fleet certificates and vessel-linked records.",
  },
};

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, profile, assignments, currentWorkspace } = useEnterpriseAccess();
  const loggedAccess = useRef(false);

  const isVesselWorkspace = useMemo(() => {
    if (!pathname) return false;
    return /^\/fleet\/vessels\/[^/]+(\/|$)/.test(pathname);
  }, [pathname]);

  const headerMeta = useMemo(() => {
    const segments = (pathname || "/fleet/dashboard").split("/").filter(Boolean);
    const section = segments[1] || "dashboard";
    return routeMeta[section] || routeMeta.dashboard;
  }, [pathname]);

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      router.replace("/login");
      return;
    }

    if (!canAccessWorkspaceAssignments(assignments, "fleet")) {
      void createAuditLog({
        action: "Permission Denied",
        description: buildAuditDescription({
          event: "Permission Denied",
          userName: profile.full_name,
          recordType: "route",
          itemName: "/fleet",
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
          context: pathname || "/fleet",
        }),
      });
    }
  }, [loading, profile, assignments, currentWorkspace, pathname, router]);

  if (loading || !profile || !canAccessWorkspaceAssignments(assignments, "fleet")) {
    return (
      <div style={styles.loading}>
        <p>Preparing Fleet workspace...</p>
      </div>
    );
  }

  if (isVesselWorkspace) {
    return <>{children}</>;
  }

  return (
    <>
      <FleetSidebar />
      <main style={styles.main}>
        <FleetHeader
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
