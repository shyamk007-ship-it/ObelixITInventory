"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

interface Document {
  id: number;
  document_name: string;
  document_type: string;
  uploaded_at: string;
  file_size: number;
  uploaded_by: string;
}

export default function DocumentsPage() {
  const params = useParams();
  const vesselId = params?.id as string;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vesselId) return;
    void loadDocuments();
  }, [vesselId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("vessel_id", vesselId)
        .order("uploaded_at", { ascending: false });

      if (!error && data) setDocuments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={styles.loadingText}>Loading documents…</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Fleet Documents</p>
          <h1 style={styles.title}>Documents</h1>
          <p style={styles.subtitle}>Fleet and vessel documentation repository.</p>
        </div>
      </div>

      {documents.length > 0 ? (
        <div style={styles.grid}>
          {documents.map((doc) => (
            <div key={doc.id} style={styles.card}>
              <h3 style={styles.cardTitle}>📄 {doc.document_name}</h3>
              <p style={styles.cardMeta}>Type: {doc.document_type || "—"}</p>
              <p style={styles.cardMeta}>
                Size: {(doc.file_size / 1024).toFixed(2)} KB
              </p>
              <p style={styles.cardMeta}>
                Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
              </p>
              {doc.uploaded_by && (
                <p style={styles.cardMeta}>By: {doc.uploaded_by}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No documents found for this vessel.</p>
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
