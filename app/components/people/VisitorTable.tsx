import type { CSSProperties } from "react";
import type { VisitorRow } from "../../lib/people";

interface VisitorTableProps {
  rows: VisitorRow[];
  onCheckIn: (id: number) => void;
  onCheckOut: (id: number) => void;
}

export default function VisitorTable({ rows, onCheckIn, onCheckOut }: VisitorTableProps) {
  return (
    <div style={styles.wrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Visitor</th>
            <th style={styles.th}>Host</th>
            <th style={styles.th}>Department</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Visit Time</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = row.status || "Pending";
            return (
              <tr key={row.id}>
                <td style={styles.td}>
                  <strong>{row.visitor_name}</strong>
                  <p style={styles.sub}>{row.company || "-"}</p>
                </td>
                <td style={styles.td}>{row.employees?.full_name || "Unassigned"}</td>
                <td style={styles.td}>{row.host_department || "-"}</td>
                <td style={styles.td}>{status}</td>
                <td style={styles.td}>{row.visit_time ? new Date(row.visit_time).toLocaleString() : "-"}</td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button type="button" style={styles.button} onClick={() => onCheckIn(row.id)} disabled={status.toLowerCase() === "checked in" || status.toLowerCase() === "blocked"}>
                      Check In
                    </button>
                    <button type="button" style={styles.button} onClick={() => onCheckOut(row.id)} disabled={status.toLowerCase() !== "checked in"}>
                      Check Out
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
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
    minWidth: 920,
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
    verticalAlign: "top",
  },
  sub: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: 12,
  },
  actions: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  button: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1e40af",
    borderRadius: 8,
    padding: "5px 7px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  },
};
