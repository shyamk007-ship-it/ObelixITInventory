import type { CSSProperties } from "react";

interface OfficeWidgetsProps {
  assetOverview: string;
  employeeSummary: string;
  supportTickets: string;
  networkStatus: string;
  recentActivity: string;
  upcomingMaintenance: string;
}

const widgetRows = [
  { key: "assetOverview", label: "Asset Overview" },
  { key: "employeeSummary", label: "Employee Summary" },
  { key: "supportTickets", label: "Support Tickets" },
  { key: "networkStatus", label: "Office Network Status" },
  { key: "recentActivity", label: "Recent Activity" },
  { key: "upcomingMaintenance", label: "Upcoming Maintenance" },
] as const;

export default function OfficeWidgets(props: OfficeWidgetsProps) {
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
