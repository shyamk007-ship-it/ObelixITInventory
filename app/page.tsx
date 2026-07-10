"use client";

import type { CSSProperties } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEnterpriseAccess } from "./components/shared/EnterpriseAccessProvider";
import PortalHeader from "./components/shared/PortalHeader";
import WorkspaceCard from "./components/WorkspaceCard";
import { getAssignmentLandingRoute, getWorkspaceLabel } from "./lib/rbac";

export default function Home() {
  const router = useRouter();
  const { loading, profile, assignments, activeAssignment, accessibleWorkspaces, accessibleVessels } = useEnterpriseAccess();

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/login");
    }
  }, [loading, profile, router]);

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <p style={styles.loadingText}>Preparing company portal...</p>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const canSeeOffice = accessibleWorkspaces.office;
  const canSeeFleet = accessibleWorkspaces.fleet;

  return (
    <div style={styles.page}>
      <PortalHeader
        eyebrow="Company Portal"
        title="IT Management Workspace Portal"
        subtitle="Select a workspace to continue with office administration or fleet operations."
      />

      <div style={styles.metaBar}>
        <div>
          <p style={styles.metaLabel}>Signed In As</p>
          <strong style={styles.metaValue}>{profile.full_name}</strong>
        </div>
        <div>
          <p style={styles.metaLabel}>Current Access</p>
          <strong style={styles.metaValue}>{activeAssignment ? getWorkspaceLabel(activeAssignment.workspace) : "Company Portal"}</strong>
        </div>
      </div>

      <div style={styles.grid}>
        {canSeeOffice && (
          <WorkspaceCard
            icon="🏢"
            title="OFFICE OPERATIONS"
            description="Manage office assets, employees, tickets and administration."
            href="/office/dashboard"
            ctaLabel="Open Office Workspace"
          />
        )}

        {canSeeFleet && (
          <WorkspaceCard
            icon="🚢"
            title="FLEET OPERATIONS"
            description="Manage vessels, fleet assets, network and onboard IT."
            href="/fleet/dashboard"
            ctaLabel="Open Fleet Workspace"
          />
        )}
      </div>

      {!canSeeOffice && !canSeeFleet && accessibleVessels.length > 0 && (
        <div style={styles.vesselSection}>
          <h2 style={styles.sectionTitle}>Assigned Vessels</h2>
          <div style={styles.vesselGrid}>
            {accessibleVessels.map((vessel) => (
              <WorkspaceCard
                key={vessel.id}
                icon="🚢"
                title={vessel.label || `Vessel ${vessel.id}`}
                description="Open your assigned vessel workspace."
                href={getAssignmentLandingRoute(assignments.find((assignment) => String(assignment.vessel_id) === String(vessel.id)) ?? null)}
                ctaLabel="Open Vessel Workspace"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "56px 28px",
    background: "linear-gradient(145deg, #e2e8f0 0%, #eff6ff 45%, #f8fafc 100%)",
    fontFamily: "Arial, sans-serif",
  },
  metaBar: {
    maxWidth: 1080,
    margin: "0 auto 22px",
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    flexWrap: "wrap",
    background: "rgba(255,255,255,0.7)",
    border: "1px solid #dbeafe",
    borderRadius: 18,
    padding: 18,
    backdropFilter: "blur(8px)",
  },
  metaLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontWeight: 700,
  },
  metaValue: {
    display: "block",
    marginTop: 6,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 800,
  },
  grid: {
    maxWidth: 1080,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 20,
  },
  vesselSection: {
    maxWidth: 1080,
    margin: "28px auto 0",
  },
  sectionTitle: {
    margin: "0 0 16px",
    color: "#0f172a",
    fontSize: 22,
    fontWeight: 800,
  },
  vesselGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 20,
  },
  loadingWrap: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f8fafc",
  },
  loadingText: {
    color: "#0f172a",
    fontSize: 16,
  },
};
