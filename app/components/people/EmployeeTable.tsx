import Link from "next/link";
import type { CSSProperties } from "react";
import type { EmployeeLite } from "../../lib/people";

interface EmployeeTableProps {
  rows: EmployeeLite[];
  selectedIds: number[];
  onSelect: (id: number) => void;
  onSelectAll: (checked: boolean) => void;
}

export default function EmployeeTable({ rows, selectedIds, onSelect, onSelectAll }: EmployeeTableProps) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  return (
    <div style={styles.wrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>
              <input type="checkbox" checked={allSelected} onChange={(event) => onSelectAll(event.target.checked)} />
            </th>
            <th style={styles.th}>Employee</th>
            <th style={styles.th}>Department</th>
            <th style={styles.th}>Designation</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={styles.td}>
                <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => onSelect(row.id)} />
              </td>
              <td style={styles.td}>
                <div style={styles.employeeCell}>
                  <strong style={styles.name}>{row.full_name || "Unknown"}</strong>
                  <span style={styles.sub}>{row.email || "No email"}</span>
                </div>
              </td>
              <td style={styles.td}>{row.department || "Unassigned"}</td>
              <td style={styles.td}>{row.designation || "Not set"}</td>
              <td style={styles.td}>{row.status || "Active"}</td>
              <td style={styles.td}>
                <Link href={`/office/people/employees/${row.id}`} style={styles.link}>View</Link>
              </td>
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
    background: "white",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 860,
  },
  th: {
    textAlign: "left",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#64748b",
    padding: "10px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  td: {
    padding: "10px",
    borderBottom: "1px solid #f1f5f9",
    color: "#0f172a",
    fontSize: 13,
    verticalAlign: "top",
  },
  employeeCell: {
    display: "grid",
    gap: 2,
  },
  name: {
    fontSize: 13,
    color: "#0f172a",
  },
  sub: {
    fontSize: 12,
    color: "#64748b",
  },
  link: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 700,
  },
};
