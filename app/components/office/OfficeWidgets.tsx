import type { CSSProperties } from "react";
import { Clock3, FileText, Package, Radio, Ticket, Users, Wrench } from "lucide-react";

interface OfficeWidgetsProps {
  assetOverview: string;
  employeeSummary: string;
  supportTickets: string;
  networkStatus: string;
  recentActivity: string;
  upcomingMaintenance: string;
}

const widgetRows = [
  { key: "assetOverview", label: "Asset Overview", icon: Package },
  { key: "employeeSummary", label: "Employee Summary", icon: Users },
  { key: "supportTickets", label: "Support Tickets", icon: Ticket },
  { key: "networkStatus", label: "Office Network Status", icon: Radio },
  { key: "recentActivity", label: "Recent Activity", icon: Clock3 },
  { key: "upcomingMaintenance", label: "Upcoming Maintenance", icon: Wrench },
] as const;

export default function OfficeWidgets(props: OfficeWidgetsProps) {
  return (
    <section style={styles.grid}>
      {widgetRows.map((widget) => (
        <article key={widget.key} style={styles.card}>
          <div style={styles.iconWrap}>
            <widget.icon size={18} strokeWidth={2.2} />
          </div>
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
    border: "1px solid #dbeafe",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.06)",
    display: "grid",
    gap: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "#eff6ff",
    color: "#1d4ed8",
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
    margin: 0,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 700,
  },
};
