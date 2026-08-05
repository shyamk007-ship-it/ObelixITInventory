import type { CSSProperties } from "react";

interface InventoryDataTableProps {
  columns: string[];
  rows: Array<Record<string, string | number | null | undefined>>;
  stickyHeader?: boolean;
}

export default function InventoryDataTable({ columns, rows, stickyHeader = true }: InventoryDataTableProps) {
  return (
    <div style={styles.wrap}>
      <table style={styles.table}>
        <thead style={stickyHeader ? styles.headSticky : undefined}>
          <tr>
            {columns.map((column) => (
              <th key={column} style={styles.th}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${index}-${row.id || row.sku || row.name || "row"}`} style={index % 2 ? styles.altRow : undefined}>
              {columns.map((column) => (
                <td key={column} style={styles.td}>{String(row[column] ?? "-")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <p style={styles.empty}>No records found.</p> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    borderRadius: 14,
    border: "1px solid #dbeafe",
    background: "#ffffff",
    boxShadow: "0 18px 30px rgba(15, 23, 42, 0.06)",
    overflow: "auto",
  },
  table: {
    borderCollapse: "collapse",
    width: "100%",
    minWidth: 880,
  },
  headSticky: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    background: "#eff6ff",
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    color: "#1e3a8a",
    fontSize: 12,
    borderBottom: "1px solid #bfdbfe",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 12px",
    color: "#0f172a",
    fontSize: 13,
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  altRow: {
    background: "#f8fbff",
  },
  empty: {
    margin: 0,
    padding: "14px 12px",
    color: "#64748b",
    fontWeight: 600,
  },
};
