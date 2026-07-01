"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

interface Asset {
  id: number;
  asset_name: string;
  asset_tag: string;
  asset_type: string;
  status: string;
  location: string;
  purchase_date: string;
}

export default function AssetsPage() {
  const params = useParams();
  const vesselId = params?.id as string;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vesselId) return;
    void loadAssets();
  }, [vesselId]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("vessel_id", vesselId)
        .order("asset_name", { ascending: true });

      if (!error && data) setAssets(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={styles.loadingText}>Loading assets…</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Vessel Assets</p>
          <h1 style={styles.title}>Assets</h1>
          <p style={styles.subtitle}>All IT assets assigned to this vessel.</p>
        </div>
      </div>

      {assets.length > 0 ? (
        <div style={styles.grid}>
          {assets.map((asset) => (
            <div key={asset.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{asset.asset_name}</h3>
                <span style={{ ...styles.badge, ...getStatusStyle(asset.status) }}>
                  {asset.status}
                </span>
              </div>
              <p style={styles.cardMeta}>Tag: {asset.asset_tag}</p>
              <p style={styles.cardMeta}>Type: {asset.asset_type}</p>
              <p style={styles.cardMeta}>Location: {asset.location || "—"}</p>
              <p style={styles.cardMeta}>
                Purchased: {asset.purchase_date || "—"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No assets found for this vessel.</p>
        </div>
      )}
    </div>
  );
}

function getStatusStyle(status: string) {
  if (status === "Available")
    return { background: "#dcfce7", color: "#166534" };
  if (status === "Assigned") return { background: "#dbeafe", color: "#1e40af" };
  if (status === "In Repair")
    return { background: "#fef3c7", color: "#b45309" };
  return { background: "#f1f5f9", color: "#475569" };
}

const styles: any = {
  page: {
    padding: 30,
    minHeight: "100vh",
    background: "#f8fbff",
    color: "#0f172a",
  },
  headerRow: { marginBottom: 30 },
  eyebrow: {
    margin: 0,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    fontSize: 12,
    fontWeight: 700,
  },
  title: { margin: "4px 0 6px", fontSize: 28, fontWeight: 800 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 760 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
  card: {
    background: "white",
    borderRadius: 20,
    padding: 20,
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.04)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" },
  cardMeta: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#64748b",
  },
  badge: {
    padding: "4px 10px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    whiteSpace: "nowrap" as const,
  },
  emptyState: {
    background: "white",
    borderRadius: 20,
    padding: 40,
    border: "1px solid #e2e8f0",
    textAlign: "center",
  },
  emptyText: {
    margin: 0,
    fontSize: 16,
    color: "#64748b",
  },
  loadingText: {
    textAlign: "center",
    color: "#2563eb",
    fontSize: 16,
    fontWeight: 600,
  },
};
