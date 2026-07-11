"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

const segmentLabels: Record<string, string> = {
  office: "Office",
  fleet: "Fleet",
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
  incidents: "Tickets",
  checklist: "Assignments",
  documents: "Certificates",
  certificates: "Certificates",
};

const toLabel = (segment: string) => {
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

  return (
    <nav style={styles.nav} aria-label="Breadcrumb">
      <Link href="/" style={styles.link}>
        Company Portal
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;

        return (
          <span key={href} style={styles.crumb}>
            <span style={styles.separator}>/</span>
            {isLast ? (
              <span style={styles.current}>{toLabel(segment)}</span>
            ) : (
              <Link href={href} style={styles.link}>
                {toLabel(segment)}
              </Link>
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
  separator: {
    color: "#94a3b8",
  },
  link: {
    color: "#475569",
    textDecoration: "none",
  },
  current: {
    color: "#0f172a",
  },
};