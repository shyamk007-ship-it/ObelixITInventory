import type { CSSProperties } from "react";

interface DepartmentCardProps {
  department: string;
  manager: string;
  employees: number;
  assets: number;
  openTickets: number;
  budget: number;
  location: string;
}

export default function DepartmentCard({ department, manager, employees, assets, openTickets, budget, location }: DepartmentCardProps) {
  return (
    <article style={styles.card}>
      <h3 style={styles.name}>{department}</h3>
      <p style={styles.meta}>Manager: {manager || "Not assigned"}</p>
      <div style={styles.grid}>
        <span style={styles.chip}>Employees: {employees}</span>
        <span style={styles.chip}>Assets: {assets}</span>
        <span style={styles.chip}>Open Tickets: {openTickets}</span>
        <span style={styles.chip}>Budget: ${Math.round(budget || 0).toLocaleString()}</span>
      </div>
      <p style={styles.meta}>Location: {location || "Not set"}</p>
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: 14,
    display: "grid",
    gap: 8,
  },
  name: {
    margin: 0,
    fontSize: 17,
    color: "#0f172a",
    fontWeight: 800,
  },
  meta: {
    margin: 0,
    color: "#64748b",
    fontSize: 13,
  },
  grid: {
    display: "grid",
    gap: 6,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  chip: {
    borderRadius: 10,
    border: "1px solid #dbeafe",
    background: "#f8fbff",
    fontSize: 12,
    fontWeight: 700,
    color: "#1e3a8a",
    padding: "6px 8px",
  },
};
