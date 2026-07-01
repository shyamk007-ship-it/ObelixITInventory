"use client";

import { useParams } from "next/navigation";

export default function SettingsPage() {
  const params = useParams();
  const vesselId = params?.id as string;

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Configuration</p>
          <h1 style={styles.title}>Settings</h1>
          <p style={styles.subtitle}>Vessel workspace configuration and preferences.</p>
        </div>
      </div>

      <div style={styles.emptyState}>
        <p style={styles.emptyIcon}>⚙️</p>
        <p style={styles.emptyText}>Settings will be available here for this vessel.</p>
        <p style={styles.emptySubtext}>
          Configure vessel-specific options and preferences.
        </p>
      </div>
    </div>
  );
}

const styles: any = {
  page: {
    padding: 30,
    minHeight: "100vh",
    background: "#f8fbff",
    color: "#0f172a",
  },
  headerRow: { marginBottom: 30 },
  eyebrow: {
    margin: 0,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    fontSize: 12,
    fontWeight: 700,
  },
  title: { margin: "4px 0 6px", fontSize: 28, fontWeight: 800 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 760 },
  emptyState: {
    background: "white",
    borderRadius: 20,
    padding: 60,
    border: "1px solid #e2e8f0",
    textAlign: "center" as const,
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.04)",
  },
  emptyIcon: {
    margin: 0,
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: "#0f172a",
  },
  emptySubtext: {
    margin: "8px 0 0",
    fontSize: 14,
    color: "#64748b",
  },
};
