"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

interface CrewMember {
  id: number;
  name?: string | null;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  vessel_id?: number | null;
  assigned_at?: string | null;
}

interface VesselRow {
  id: number;
  vessel_name?: string | null;
}

export default function FleetCrewPage() {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [vessels, setVessels] = useState<VesselRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadCrew();
  }, []);

  const loadCrew = async () => {
    setLoading(true);
    try {
      const [crewResult, vesselsResult] = await Promise.all([
        supabase
          .from("crew_members")
          .select("id, name, position, email, phone, vessel_id, assigned_at")
          .order("name", { ascending: true }),
        supabase.from("vessels").select("id, vessel_name").order("vessel_name", { ascending: true }),
      ]);

      if (!crewResult.error) setCrew((crewResult.data as CrewMember[]) || []);
      if (!vesselsResult.error) setVessels((vesselsResult.data as VesselRow[]) || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const vesselLabelById = useMemo(
    () =>
      vessels.reduce<Record<string, string>>((accumulator, vessel) => {
        accumulator[String(vessel.id)] = vessel.vessel_name || "Unnamed Vessel";
        return accumulator;
      }, {}),
    [vessels]
  );

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Fleet Operations</p>
          <h1 style={styles.title}>Crew</h1>
          <p style={styles.subtitle}>Crew members assigned across the fleet workspace.</p>
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading fleet crew…</div>
      ) : crew.length === 0 ? (
        <div style={styles.empty}>No crew members found.</div>
      ) : (
        <div style={styles.grid}>
          {crew.map((member) => (
            <div key={member.id} style={styles.card}>
              <strong style={styles.cardTitle}>{member.name || "Unnamed Crew Member"}</strong>
              <p style={styles.meta}>{member.position || "Position unavailable"}</p>
              <p style={styles.meta}>{vesselLabelById[String(member.vessel_id || "")] || "Unassigned Vessel"}</p>
              <p style={styles.meta}>{member.email || "No email on file"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 30, minHeight: "100vh", background: "#f8fbff", color: "#0f172a" },
  headerRow: { marginBottom: 20 },
  eyebrow: { margin: 0, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 12, fontWeight: 700 },
  title: { margin: "4px 0 6px", fontSize: 28, fontWeight: 800 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 760 },
  loading: { padding: 24, background: "white", borderRadius: 20, border: "1px solid #e2e8f0", textAlign: "center", color: "#2563eb" },
  empty: { padding: 24, background: "white", borderRadius: 20, border: "1px solid #e2e8f0", textAlign: "center", color: "#64748b" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 },
  card: { background: "white", borderRadius: 20, padding: 18, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)" },
  cardTitle: { display: "block", color: "#0f172a", fontSize: 16 },
  meta: { margin: "6px 0 0", color: "#64748b" },
};
