"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

interface CrewMember {
  id: number;
  name: string;
  position: string;
  email: string;
  phone: string;
  assigned_at: string;
}

export default function CrewPage() {
  const params = useParams();
  const vesselId = params?.id as string;

  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vesselId) return;
    void loadCrew();
  }, [vesselId]);

  const loadCrew = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("crew_members")
        .select("*")
        .eq("vessel_id", vesselId)
        .order("position", { ascending: true });

      if (!error && data) setCrew(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={styles.loadingText}>Loading crew IT…</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Crew Management</p>
          <h1 style={styles.title}>Crew IT</h1>
          <p style={styles.subtitle}>IT assignments and crew member information.</p>
        </div>
      </div>

      {crew.length > 0 ? (
        <div style={styles.grid}>
          {crew.map((member) => (
            <div key={member.id} style={styles.card}>
              <h3 style={styles.cardTitle}>{member.name}</h3>
              <p style={styles.cardMeta}>Position: {member.position || "—"}</p>
              {member.email && (
                <p style={styles.cardMeta}>Email: {member.email}</p>
              )}
              {member.phone && (
                <p style={styles.cardMeta}>Phone: {member.phone}</p>
              )}
              <p style={styles.cardMeta}>
                Assigned:{" "}
                {new Date(member.assigned_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No crew members assigned to this vessel.</p>
        </div>
      )}
    </div>
  );
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
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" },
  cardMeta: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#64748b",
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
