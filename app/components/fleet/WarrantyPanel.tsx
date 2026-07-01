"use client";

interface WarrantyItem {
  id: number;
  asset_name?: string | null;
  warranty_expiry?: string | null;
}

interface WarrantyPanelProps {
  items: WarrantyItem[];
  loading?: boolean;
}

export default function WarrantyPanel({ items, loading = false }: WarrantyPanelProps) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>Warranty Expiry</h3>
        <span style={styles.badge}>{items.length}</span>
      </div>
      {loading ? (
        <div style={styles.skeletonRows}>
          <div style={styles.skeletonRow} />
          <div style={styles.skeletonRow} />
        </div>
      ) : items.length > 0 ? (
        <div style={styles.list}>
          {items.slice(0, 4).map((item) => (
            <div key={item.id} style={styles.item}>
              <div>
                <p style={styles.itemTitle}>{item.asset_name || "Asset"}</p>
                <p style={styles.itemMeta}>
                  {item.warranty_expiry ? new Date(item.warranty_expiry).toLocaleDateString() : "No expiry"}
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
