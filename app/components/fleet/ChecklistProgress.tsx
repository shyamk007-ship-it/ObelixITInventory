"use client";

interface ChecklistItem {
  id: number;
  checklist_type?: string | null;
  status?: string | null;
}

interface ChecklistProgressProps {
  checklists: ChecklistItem[];
  loading?: boolean;
}

export default function ChecklistProgress({
  checklists,
  loading = false,
}: ChecklistProgressProps) {
  const completed = checklists.filter((item) => item.status === "Completed").length;
  const progress = checklists.length ? Math.round((completed / checklists.length) * 100) : 0;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>Checklist Progress</h3>
        <span style={styles.badge}>{progress}%</span>
      </div>
      {loading ? (
        <div style={styles.skeletonBar} />
      ) : (
        <>
          <div style={styles.barTrack}>
            <div style={{ ...styles.barFill, width: `${progress}%` }} />
          </div>
          <p style={styles.muted}>{completed} of {checklists.length} completed</p>
          {checklists.slice(0, 4).map((item) => (
            <div key={item.id} style={styles.item}>
              <span style={styles.itemLabel}>{item.checklist_type || "Checklist"}</span>
              <span style={getStatusStyle(item.status || "Pending")}>{item.status || "Pending"}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function getStatusStyle(status: string) {
  if (status === "Completed") return { background: "#dcfce7", color: "#166534" };
  if (status === "In Progress") return { background: "#dbeafe", color: "#1e40af" };
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
    marginBottom: 12,
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
  barTrack: {
    height: 10,
    borderRadius: 999,
    background: "#e2e8f0",
    overflow: "hidden",
    marginBottom: 8,
  },
  barFill: {
    height: "100%",
    background: "linear-gradient(90deg, #2563eb, #3b82f6)",
    borderRadius: 999,
  },
  muted: {
    margin: "0 0 8px",
    fontSize: 12,
    color: "#64748b",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    borderBottom: "1px solid #f1f5f9",
  },
  itemLabel: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: 600,
  },
  skeletonBar: {
    height: 10,
    width: "100%",
    borderRadius: 999,
    background: "#f1f5f9",
  },
};
