"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function FleetDocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("assets").select("id, asset_name, asset_tag, vessel_id, vessels(vessel_name)");
      if (!error) {
        setDocuments((data || []).map((asset: any) => ({
          id: asset.id,
          title: `${asset.asset_name} (${asset.asset_tag})`,
          vessel: asset.vessels?.vessel_name || "Unassigned",
          type: "Asset Record",
        })));
      }
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
          <h1 style={styles.title}>Fleet Documents</h1>
          <p style={styles.subtitle}>Reference asset records and vessel information in one place.</p>
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading fleet documents…</div>
      ) : (
        <div style={styles.grid}>
          {documents.map((document) => (
            <div key={document.id} style={styles.card}>
              <strong>{document.title}</strong>
              <p style={styles.meta}>{document.vessel}</p>
              <p style={styles.meta}>{document.type}</p>
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
