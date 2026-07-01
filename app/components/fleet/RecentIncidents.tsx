"use client";

interface IncidentItem {
  id: number;
  title?: string | null;
  status?: string | null;
  created_at?: string | null;
}

interface RecentIncidentsProps {
  incidents: IncidentItem[];
  loading?: boolean;
}

export default function RecentIncidents({
  incidents,
  loading = false,
}: RecentIncidentsProps) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>Recent Incidents</h3>
        <span style={styles.badge}>{incidents.length}</span>
      </div>
      {loading ? (
        <div style={styles.skeletonRows}>
          <div style={styles.skeletonRow} />
          <div style={styles.skeletonRow} />
        </div>
      ) : incidents.length > 0 ? (
        <div style={styles.list}>
          {incidents.slice(0, 4).map((incident) => (
            <div key={incident.id} style={styles.item}>
              <div>
                <p style={styles.itemTitle}>{incident.title || "Untitled incident"}</p>
                <p style={styles.itemMeta}>
                  {incident.created_at ? new Date(incident.created_at).toLocaleDateString() : "No date"}
                </p>
              </div>
              <span style={getStatusStyle(incident.status || "Open")}>{incident.status || "Open"}</span>
            </div>
          ))}
        </div>
      ) : (
        <p style={styles.emptyText}>No records found.</p>
      )}
    </div>
  );
}

function getStatusStyle(status: string) {
  if (status === "Resolved") return { background: "#dcfce7", color: "#166534" };
  if (status === "In Progress") return { background: "#dbeafe", color: "#1e40af" };
  if (status === "Open") return { background: "#fef3c7", color: "#b45309" };
  return { background: "#f1f5f9", color: "#475569" };
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "white",
    borderRadius: 20,
    padding: 20,
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
  },
  badge: {
    background: "#f1f5f9",
    color: "#0f172a",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: 10,
  },
  itemTitle: {
    margin: 0,
    fontWeight: 600,
    color: "#0f172a",
  },
  itemMeta: {
    margin: "3px 0 0",
    fontSize: 12,
    color: "#64748b",
  },
  emptyText: {
    margin: 0,
    fontSize: 13,
    color: "#64748b",
  },
  skeletonRows: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  skeletonRow: {
    width: "100%",
    height: 40,
    borderRadius: 12,
    background: "#f1f5f9",
  },
};
