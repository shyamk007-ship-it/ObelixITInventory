import type { CSSProperties } from "react";

interface FleetStatsProps {
  totalVessels: number;
  onlineVessels: number;
  offlineVessels: number;
  fleetAssets: number;
  openIncidents: number;
  maintenanceDue: number;
  internetStatus: string;
  networkHealth: string;
  checklistCompletion: string;
}

const ITEMS: Array<{ key: keyof FleetStatsProps; label: string }> = [
  { key: "totalVessels", label: "Total Vessels" },
  { key: "onlineVessels", label: "Online Vessels" },
  { key: "offlineVessels", label: "Offline Vessels" },
  { key: "fleetAssets", label: "Fleet Assets" },
  { key: "openIncidents", label: "Open Incidents" },
  { key: "maintenanceDue", label: "Maintenance Due" },
  { key: "internetStatus", label: "Internet Status" },
  { key: "networkHealth", label: "Network Health" },
  { key: "checklistCompletion", label: "Checklist Completion" },
];

export default function FleetStats(props: FleetStatsProps) {
  return (
    <section style={styles.grid}>
      {ITEMS.map((item) => (
        <div key={item.key} style={styles.card}>
          <p style={styles.label}>{item.label}</p>
          <strong style={styles.value}>{props[item.key]}</strong>
        </div>
      ))}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  card: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: "14px 16px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  label: {
    margin: 0,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  value: {
    display: "block",
    marginTop: 6,
    color: "#0f172a",
    fontSize: 24,
    fontWeight: 800,
  },
};
