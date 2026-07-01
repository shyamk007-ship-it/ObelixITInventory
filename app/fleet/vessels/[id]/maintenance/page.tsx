"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

interface MaintenanceRecord {
  id: number;
  asset_id: number;
  maintenance_date: string;
  status: string;
  description: string;
  technician_name: string;
  assets?: { asset_name: string };
}

export default function MaintenancePage() {
  const params = useParams();
  const vesselId = params?.id as string;

  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vesselId) return;
    void loadMaintenance();
  }, [vesselId]);

  const loadMaintenance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("asset_maintenance")
        .select("*, assets(asset_name)")
        .eq("vessel_id", vesselId)
        .order("maintenance_date", { ascending: false });

      if (!error && data) setMaintenance(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={styles.loadingText}>Loading maintenance records…</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Asset Maintenance</p>
          <h1 style={styles.title}>Maintenance</h1>
          <p style={styles.subtitle}>Maintenance schedule and history.</p>
        </div>
      </div>

      {maintenance.length > 0 ? (
        <div style={styles.grid}>
          {maintenance.map((record) => (
            <div key={record.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>
                  {record.assets?.asset_name || "Asset"}
                </h3>
                <span
                  style={{
                    ...styles.badge,
                    ...getStatusStyle(record.status),
                  }}
                >
                  {record.status}
                </span>
              </div>
              <p style={styles.cardMeta}>
                Date: {new Date(record.maintenance_date).toLocaleDateString()}
              </p>
              {record.description && (
                <p style={styles.cardMeta}>Description: {record.description}</p>
              )}
              {record.technician_name && (
                <p style={styles.cardMeta}>
                  Technician: {record.technician_name}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No maintenance records found.</p>
        </div>
      )}
    </div>
  );
}

function getStatusStyle(status: string) {
  if (status === "Completed")
    return { background: "#dcfce7", color: "#166534" };
  if (status === "Pending") return { background: "#fef3c7", color: "#b45309" };
  if (status === "In Progress")
    return { background: "#dbeafe", color: "#1e40af" };
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
