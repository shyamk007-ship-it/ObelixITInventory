"use client";

interface DocumentItem {
  id: number;
  document_name?: string | null;
  created_at?: string | null;
}

interface LatestDocumentsProps {
  documents: DocumentItem[];
  loading?: boolean;
}

export default function LatestDocuments({
  documents,
  loading = false,
}: LatestDocumentsProps) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>Latest Documents</h3>
        <span style={styles.badge}>{documents.length}</span>
      </div>
      {loading ? (
        <div style={styles.skeletonRows}>
          <div style={styles.skeletonRow} />
          <div style={styles.skeletonRow} />
        </div>
      ) : documents.length > 0 ? (
        <div style={styles.list}>
          {documents.slice(0, 4).map((doc) => (
            <div key={doc.id} style={styles.item}>
              <div>
                <p style={styles.itemTitle}>{doc.document_name || "Document"}</p>
                <p style={styles.itemMeta}>
                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "No date"}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={styles.emptyText}>No records found.</p>
      )}
    </div>
  );
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
