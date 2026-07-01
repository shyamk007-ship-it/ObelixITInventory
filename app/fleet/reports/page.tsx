"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function FleetReportsPage() {
  const [vessels, setVessels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("vessels").select("id, vessel_name, imo_number, status").order("vessel_name", { ascending: true });
      if (!error) setVessels(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Fleet Operations</p>
          <h1 style={styles.title}>Fleet Reports</h1>
          <p style={styles.subtitle}>Operational summaries for vessels in the fleet.</p>
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading fleet reports…</div>
      ) : (
        <div style={styles.grid}>
          {vessels.map((vessel) => (
            <div key={vessel.id} style={styles.card}>
              <strong>{vessel.vessel_name}</strong>
              <p style={styles.meta}>IMO: {vessel.imo_number || "—"}</p>
              <p style={styles.meta}>Status: {vessel.status || "—"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: any = {
  page: { padding: 30, minHeight: "100vh", background: "#f8fbff", color: "#0f172a" },
  headerRow: { marginBottom: 20 },
  eyebrow: { margin: 0, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 12, fontWeight: 700 },
  title: { margin: "4px 0 6px", fontSize: 28, fontWeight: 800 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 760 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 },
  card: { background: "white", borderRadius: 20, padding: 18, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)" },
  meta: { margin: "6px 0 0", color: "#64748b" },
  loading: { padding: 24, background: "white", borderRadius: 20, border: "1px solid #e2e8f0", textAlign: "center", color: "#2563eb" },
};
