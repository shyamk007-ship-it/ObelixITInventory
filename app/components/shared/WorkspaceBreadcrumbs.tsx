"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";

const workspaceLabels: Record<string, { label: string; href: string }> = {
  office: { label: "Office Operations", href: "/office/dashboard" },
  fleet: { label: "Fleet Operations", href: "/fleet/dashboard" },
};

const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  assets: "Assets",
  employees: "Employees",
  assignments: "Assignments",
  tickets: "Tickets",
  reports: "Reports",
  users: "Users",
  settings: "Settings",
  maintenance: "Maintenance",
  network: "Network Monitoring",
  activity: "Recent Activity",
  vessels: "Vessels",
  crew: "Crew",
  incidents: "Incidents",
  documents: "Documents",
  certificates: "Certificates",
  checklist: "Checklist",
};

const detailLabels: Record<string, string> = {
  employees: "Employee Profile",
  assets: "Asset Details",
  vessels: "Vessel Profile",
  crew: "Crew Member",
  tickets: "Ticket Details",
  incidents: "Incident Details",
  documents: "Document Library",
  assignments: "Assignment Details",
};

const toLabel = (segment: string, previousSegment?: string) => {
  if (/^\d+$/.test(segment) && previousSegment && detailLabels[previousSegment]) {
    return detailLabels[previousSegment];
  }

  if (segmentLabels[segment]) return segmentLabels[segment];
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export default function WorkspaceBreadcrumbs() {
  const pathname = usePathname();
  const segments = (pathname || "/").split("/").filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const workspaceKey = segments[0] === "office" || segments[0] === "fleet" ? segments[0] : null;
  const workspace = workspaceKey ? workspaceLabels[workspaceKey] : null;
  const contentSegments = workspaceKey ? segments.slice(1) : segments;

  return (
    <nav style={styles.nav} aria-label="Breadcrumb">
      <Link href="/" style={styles.link}>
        Company Portal
      </Link>
      {workspace && (
        <span style={styles.crumb}>
          <ChevronRight size={14} strokeWidth={2.2} />
          <Link href={workspace.href} style={styles.link}>
            {workspace.label}
          </Link>
        </span>
      )}
      {contentSegments.map((segment, index) => {
        const pathSegments = workspaceKey ? [workspaceKey, ...contentSegments.slice(0, index + 1)] : contentSegments.slice(0, index + 1);
        const href = `/${pathSegments.join("/")}`;
        const isLast = index === contentSegments.length - 1;
        const previousSegment = index > 0 ? contentSegments[index - 1] : workspaceKey || undefined;

        return (
          <span key={href} style={styles.crumb}>
            {isLast ? (
              <>
                <ChevronRight size={14} strokeWidth={2.2} style={{ color: "#94a3b8" }} />
                <span style={styles.current}>{toLabel(segment, previousSegment)}</span>
              </>
            ) : (
              <>
                <ChevronRight size={14} strokeWidth={2.2} style={{ color: "#94a3b8" }} />
              <Link href={href} style={styles.link}>
                {toLabel(segment, previousSegment)}
              </Link>
              </>
            )}
          </span>
        );
      })}
    </nav>
  );
}

const styles: Record<string, CSSProperties> = {
  nav: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
  },
  crumb: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  link: {
    color: "#475569",
    textDecoration: "none",
  },
  current: {
    color: "#0f172a",
  },
};