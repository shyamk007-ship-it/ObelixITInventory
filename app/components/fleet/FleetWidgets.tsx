import type { CSSProperties } from "react";

interface FleetWidgetsProps {
  fleetStatus: string;
  recentVesselActivity: string;
  upcomingMaintenance: string;
  latestIncidents: string;
  fleetNetworkHealth: string;
  checklistProgress: string;
  fleetDocuments: string;
}

const widgetRows = [
  { key: "fleetStatus", label: "Fleet Status" },
  { key: "recentVesselActivity", label: "Recent Vessel Activity" },
  { key: "upcomingMaintenance", label: "Upcoming Maintenance" },
  { key: "latestIncidents", label: "Latest Incidents" },
  { key: "fleetNetworkHealth", label: "Fleet Network Health" },
  { key: "checklistProgress", label: "Checklist Progress" },
  { key: "fleetDocuments", label: "Fleet Documents" },
] as const;

export default function FleetWidgets(props: FleetWidgetsProps) {
  return (
    <section style={styles.grid}>
      {widgetRows.map((widget) => (
        <article key={widget.key} style={styles.card}>
          <h3 style={styles.title}>{widget.label}</h3>
          <p style={styles.value}>{props[widget.key]}</p>
        </article>
      ))}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  card: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
  },
  title: {
    margin: 0,
    color: "#334155",
    fontSize: 14,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  value: {
    margin: "8px 0 0",
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 700,
  },
};
