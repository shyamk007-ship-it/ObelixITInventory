"use client";

import Link from "next/link";

interface VesselHeaderProps {
  vesselName?: string | null;
  subtitle?: string;
  loading?: boolean;
}

export default function VesselHeader({
  vesselName,
  subtitle,
  loading = false,
}: VesselHeaderProps) {
  if (loading) {
    return (
      <div style={styles.header}>
        <div>
          <div style={styles.skeletonEyebrow} />
          <div style={styles.skeletonTitle} />
          <div style={styles.skeletonSubtitle} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.header}>
      <div>
        <p style={styles.eyebrow}>Vessel Workspace</p>
        <h1 style={styles.title}>{vesselName || "Vessel Overview"}</h1>
        <p style={styles.subtitle}>{subtitle || "Operational status and fleet health at a glance."}</p>
      </div>
      <Link href="/fleet/dashboard" style={styles.linkButton}>
        ← Back to Fleet
      </Link>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  eyebrow: {
    margin: 0,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    fontSize: 12,
    fontWeight: 700,
  },
  title: {
    margin: "6px 0 6px",
    fontSize: 28,
    fontWeight: 800,
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
    maxWidth: 700,
  },
  linkButton: {
    background: "white",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    padding: "10px 14px",
    borderRadius: 999,
    fontWeight: 700,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
  },
  skeletonEyebrow: {
    width: 120,
    height: 10,
    borderRadius: 999,
    background: "#e2e8f0",
    marginBottom: 8,
  },
  skeletonTitle: {
    width: 240,
    height: 24,
    borderRadius: 999,
    background: "#f1f5f9",
    marginBottom: 8,
  },
  skeletonSubtitle: {
    width: 320,
    height: 12,
    borderRadius: 999,
    background: "#f1f5f9",
  },
};
