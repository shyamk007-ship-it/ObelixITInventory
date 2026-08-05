import type { CSSProperties } from "react";
import type { DepartmentRow } from "../../lib/people";

interface DepartmentTableProps {
  rows: DepartmentRow[];
  managerNames: Record<number, string>;
}

export default function DepartmentTable({ rows, managerNames }: DepartmentTableProps) {
  return (
    <div style={styles.wrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Department</th>
            <th style={styles.th}>Manager</th>
            <th style={styles.th}>Location</th>
            <th style={styles.th}>Budget</th>
            <th style={styles.th}>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={styles.td}>{row.name}</td>
              <td style={styles.td}>{row.manager_employee_id ? managerNames[row.manager_employee_id] || "Unknown" : "Not assigned"}</td>
              <td style={styles.td}>{row.location || "Not set"}</td>
              <td style={styles.td}>${Math.round(Number(row.budget || 0)).toLocaleString()}</td>
              <td style={styles.td}>{row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    overflowX: "auto",
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 780,
  },
  th: {
    textAlign: "left",
    padding: "10px",
    borderBottom: "1px solid #e2e8f0",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#64748b",
    background: "#f8fafc",
  },
  td: {
    padding: "10px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: 13,
    color: "#0f172a",
  },
};
