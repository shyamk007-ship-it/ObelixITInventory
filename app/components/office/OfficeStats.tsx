import type { CSSProperties } from "react";

interface OfficeStatsProps {
  totalOfficeAssets: number;
  assignedAssets: number;
  availableAssets: number;
  employees: number;
  openTickets: number;
  resolvedTickets: number;
  criticalIssues: number;
  maintenanceDue: number;
  warrantyExpiring: number;
}

const ITEMS: Array<{ key: keyof OfficeStatsProps; label: string }> = [
  { key: "totalOfficeAssets", label: "Total Office Assets" },
  { key: "assignedAssets", label: "Assigned Assets" },
  { key: "availableAssets", label: "Available Assets" },
  { key: "employees", label: "Employees" },
  { key: "openTickets", label: "Open Tickets" },
  { key: "resolvedTickets", label: "Resolved Tickets" },
  { key: "criticalIssues", label: "Critical Issues" },
  { key: "maintenanceDue", label: "Maintenance Due" },
  { key: "warrantyExpiring", label: "Warranty Expiring" },
];

export default function OfficeStats(props: OfficeStatsProps) {
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
