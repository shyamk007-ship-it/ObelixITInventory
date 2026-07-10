"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import OfficeSidebar from "../components/office/OfficeSidebar";
import OfficeHeader from "../components/office/OfficeHeader";
import { createAuditLog, buildAuditDescription } from "../lib/audit";
import { useEnterpriseAccess } from "../components/shared/EnterpriseAccessProvider";
import { canAccessWorkspaceAssignments } from "../lib/rbac";

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, profile, assignments, currentWorkspace } = useEnterpriseAccess();
  const loggedAccess = useRef(false);

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
          title="Office Dashboard"
          subtitle="Manage office assets, employees, support tickets, and administration."
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
