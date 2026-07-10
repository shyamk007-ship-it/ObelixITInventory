import type { CSSProperties } from "react";

export default function FleetSettingsPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Fleet Settings</h1>
      <p style={styles.subtitle}>Configure Fleet workspace preferences and maritime operations defaults.</p>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 20,
  },
  title: {
    margin: 0,
    fontSize: 24,
    color: "#0f172a",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
  },
};
