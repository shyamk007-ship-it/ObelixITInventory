"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

interface Vessel {
  id: number;
  vessel_name: string;
  imo_number: string;
  vessel_type: string;
  status: string;
  internet_provider: string;
  satellite_provider: string;
  operating_region: string;
  captain: string;
  last_backup: string;
}

export default function OverviewPage() {
  const params = useParams();
  const vesselId = params?.id as string;

  const [vessel, setVessel] = useState<Vessel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vesselId) return;
    void loadVessel();
  }, [vesselId]);

  const loadVessel = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vessels")
        .select("*")
        .eq("id", vesselId)
        .single();

      if (!error && data) setVessel(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={styles.loadingText}>Loading vessel details…</p>
      </div>
    );
  }

  if (!vessel) {
    return (
      <div style={styles.page}>
        <p style={styles.emptyText}>Vessel not found.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Vessel Information</p>
          <h1 style={styles.title}>{vessel.vessel_name}</h1>
          <p style={styles.subtitle}>Vessel details and specifications.</p>
        </div>
      </div>

      <div style={styles.grid}>
        <DetailCard label="IMO Number" value={vessel.imo_number || "—"} />
        <DetailCard label="Vessel Type" value={vessel.vessel_type || "—"} />
        <DetailCard label="Status" value={vessel.status || "—"} />
        <DetailCard
          label="Internet Provider"
          value={vessel.internet_provider || "—"}
        />
        <DetailCard
          label="Satellite Provider"
          value={vessel.satellite_provider || "—"}
        />
        <DetailCard
          label="Operating Region"
          value={vessel.operating_region || "—"}
        />
        <DetailCard label="Captain" value={vessel.captain || "—"} />
        <DetailCard label="Last Backup" value={vessel.last_backup || "—"} />
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.card}>
      <p style={styles.cardLabel}>{label}</p>
      <h3 style={styles.cardValue}>{value}</h3>
    </div>
  );
}

const styles: any = {
  page: { padding: 30, minHeight: "100vh", background: "#f8fbff", color: "#0f172a" },
  headerRow: { marginBottom: 30 },
  eyebrow: { margin: 0, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 12, fontWeight: 700 },
  title: { margin: "4px 0 6px", fontSize: 28, fontWeight: 800 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 760 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  card: { background: "white", borderRadius: 20, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(15, 23, 42, 0.04)" },
  cardLabel: { margin: 0, color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" },
  cardValue: { marginTop: 8, margin: 0, fontSize: 18, fontWeight: 600, color: "#0f172a" },
  loadingText: { textAlign: "center", color: "#2563eb", fontSize: 16, fontWeight: 600 },
  emptyText: { textAlign: "center", color: "#64748b", fontSize: 16 },
};
