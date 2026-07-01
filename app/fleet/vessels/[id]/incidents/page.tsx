"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

interface Incident {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  created_by: string;
}

export default function IncidentsPage() {
  const params = useParams();
  const vesselId = params?.id as string;

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vesselId) return;
    void loadIncidents();
  }, [vesselId]);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("vessel_id", vesselId)
        .order("created_at", { ascending: false });

      if (!error && data) setIncidents(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={styles.loadingText}>Loading incidents…</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Incident Management</p>
          <h1 style={styles.title}>Incidents</h1>
          <p style={styles.subtitle}>Open and closed incidents for this vessel.</p>
        </div>
      </div>

      {incidents.length > 0 ? (
        <div style={styles.grid}>
          {incidents.map((incident) => (
            <div key={incident.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardHeaderContent}>
                  <h3 style={styles.cardTitle}>{incident.title}</h3>
                  <p style={styles.cardDescription}>
                    {incident.description || "No description"}
                  </p>
                </div>
                <span
                  style={{
                    ...styles.badge,
                    ...getStatusStyle(incident.status),
                  }}
                >
                  {incident.status}
                </span>
              </div>
              <div style={styles.cardMetas}>
                <span
                  style={{
                    ...styles.priorityBadge,
                    ...getPriorityStyle(incident.priority),
                  }}
                >
                  {incident.priority || "Normal"}
                </span>
                <p style={styles.cardMeta}>
                  Created: {new Date(incident.created_at).toLocaleDateString()}
                </p>
                {incident.created_by && (
                  <p style={styles.cardMeta}>By: {incident.created_by}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No incidents found.</p>
        </div>
      )}
    </div>
  );
}

function getStatusStyle(status: string) {
  if (status === "Resolved")
    return { background: "#dcfce7", color: "#166534" };
  if (status === "Open") return { background: "#fef3c7", color: "#b45309" };
  if (status === "In Progress")
    return { background: "#dbeafe", color: "#1e40af" };
  return { background: "#f1f5f9", color: "#475569" };
}

function getPriorityStyle(priority: string) {
  if (priority === "Critical")
    return { background: "#fee2e2", color: "#b91c1c" };
  if (priority === "High") return { background: "#fed7aa", color: "#b45309" };
  if (priority === "Medium")
    return { background: "#fef3c7", color: "#b45309" };
  return { background: "#dcfce7", color: "#166534" };
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
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
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
  cardHeaderContent: { flex: 1 },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" },
  cardDescription: {
    margin: "4px 0 0",
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.4,
  },
  cardMetas: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
  },
  cardMeta: {
    margin: 0,
    fontSize: 12,
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
  priorityBadge: {
    padding: "4px 10px",
    borderRadius: 10,
    fontSize: 10,
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
