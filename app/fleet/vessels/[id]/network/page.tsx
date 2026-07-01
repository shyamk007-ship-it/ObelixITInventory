"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

interface NetworkDevice {
  id: number;
  device_name: string;
  ip_address: string;
  mac_address: string;
  device_type: string;
  status: string;
  location: string;
}

export default function NetworkPage() {
  const params = useParams();
  const vesselId = params?.id as string;

  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vesselId) return;
    void loadNetworkDevices();
  }, [vesselId]);

  const loadNetworkDevices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("network_devices")
        .select("*")
        .eq("vessel_id", vesselId)
        .order("device_name", { ascending: true });

      if (!error && data) setDevices(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={styles.loadingText}>Loading network devices…</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Network Infrastructure</p>
          <h1 style={styles.title}>Network</h1>
          <p style={styles.subtitle}>Network devices and connectivity status.</p>
        </div>
      </div>

      {devices.length > 0 ? (
        <div style={styles.grid}>
          {devices.map((device) => (
            <div key={device.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{device.device_name}</h3>
                <span
                  style={{
                    ...styles.badge,
                    ...getStatusStyle(device.status),
                  }}
                >
                  {device.status}
                </span>
              </div>
              <p style={styles.cardMeta}>IP: {device.ip_address || "—"}</p>
              <p style={styles.cardMeta}>MAC: {device.mac_address || "—"}</p>
              <p style={styles.cardMeta}>Type: {device.device_type || "—"}</p>
              <p style={styles.cardMeta}>
                Location: {device.location || "—"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No network devices found for this vessel.</p>
        </div>
      )}
    </div>
  );
}

function getStatusStyle(status: string) {
  if (status === "Online") return { background: "#dcfce7", color: "#166534" };
  if (status === "Offline") return { background: "#fee2e2", color: "#b91c1c" };
  if (status === "Monitoring")
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
