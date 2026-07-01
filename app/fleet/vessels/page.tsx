"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

interface VesselCardData {
  id: number;
  vessel_name?: string | null;
  imo_number?: string | null;
  status?: string | null;
  internet_provider?: string | null;
  last_backup?: string | null;
  assetCount: number;
  openTickets: number;
  healthScore: number;
  internetStatus: string;
}

export default function FleetVesselsPage() {
  const [vessels, setVessels] = useState<VesselCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadVessels();
  }, []);

  const loadVessels = async () => {
    setLoading(true);
    try {
      const [vesselsResult, assetsResult, networkResult, ticketsResult] = await Promise.all([
        supabase.from("vessels").select("id, vessel_name, imo_number, status, internet_provider, last_backup").order("vessel_name", { ascending: true }),
        supabase.from("assets").select("id, vessel_id").order("id", { ascending: true }),
        supabase.from("network_devices").select("id, vessel_id, status").order("id", { ascending: true }),
        supabase.from("tickets").select("id, vessel_id, status").order("id", { ascending: true }),
      ]);

      if (vesselsResult.error) throw vesselsResult.error;
      if (assetsResult.error) throw assetsResult.error;
      if (networkResult.error) throw networkResult.error;
      if (ticketsResult.error) throw ticketsResult.error;

      const assets = assetsResult.data || [];
      const networkDevices = networkResult.data || [];
      const tickets = ticketsResult.data || [];

      const mapped = (vesselsResult.data || []).map((vessel: any) => {
        const vesselAssets = assets.filter((asset: any) => String(asset.vessel_id) === String(vessel.id));
        const vesselDevices = networkDevices.filter((device: any) => String(device.vessel_id) === String(vessel.id));
        const openTickets = tickets.filter((ticket: any) => String(ticket.vessel_id) === String(vessel.id) && ticket.status !== "Resolved").length;
        const healthScore = Math.max(55, Math.min(99, 92 - openTickets * 4 - (vesselDevices.some((device: any) => device.status === "Offline") ? 4 : 0)));
        const internetStatus = vesselDevices.some((device: any) => device.status === "Online") ? "Connected" : "Offline";

        return {
          id: vessel.id,
          vessel_name: vessel.vessel_name,
          imo_number: vessel.imo_number,
          status: vessel.status,
          internet_provider: vessel.internet_provider,
          last_backup: vessel.last_backup,
          assetCount: vesselAssets.length,
          openTickets,
          healthScore,
          internetStatus,
        } satisfies VesselCardData;
      });

      setVessels(mapped);
    } catch (error) {
      console.error(error);
      setVessels([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Fleet Workspace</p>
          <h1 style={styles.title}>Vessels</h1>
          <p style={styles.subtitle}>Open any vessel workspace directly from the fleet inventory.</p>
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading vessel inventory…</div>
      ) : (
        <div style={styles.grid}>
          {vessels.map((vessel) => (
            <div key={vessel.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>{vessel.vessel_name || "Unnamed Vessel"}</h3>
                  <p style={styles.cardSubtitle}>IMO {vessel.imo_number || "—"}</p>
                </div>
                <span style={{ ...styles.badge, ...getStatusStyle(vessel.status || "Unknown") }}>{vessel.status || "Unknown"}</span>
              </div>

              <div style={styles.metricGrid}>
                <Metric label="Internet" value={vessel.internetStatus} />
                <Metric label="Assets" value={vessel.assetCount} />
                <Metric label="Tickets" value={vessel.openTickets} />
                <Metric label="Health" value={`${vessel.healthScore}%`} />
              </div>

              <div style={styles.footerRow}>
                <p style={styles.meta}>Provider {vessel.internet_provider || "—"}</p>
                <Link href={`/fleet/vessels/${vessel.id}`} style={styles.actionButton}>
                  Open Workspace
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.metricBox}>
      <p style={styles.metricLabel}>{label}</p>
      <strong style={styles.metricValue}>{value}</strong>
    </div>
  );
}

function getStatusStyle(status: string) {
  if (status === "Active" || status === "Operational") return { background: "#dcfce7", color: "#166534" };
  if (status === "Maintenance" || status === "Warning") return { background: "#fef3c7", color: "#b45309" };
  return { background: "#f1f5f9", color: "#475569" };
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 30, minHeight: "100vh", background: "#f8fbff", color: "#0f172a" },
  headerRow: { marginBottom: 24 },
  eyebrow: { margin: 0, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 12, fontWeight: 700 },
  title: { margin: "4px 0 6px", fontSize: 28, fontWeight: 800 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 760 },
  loading: { padding: 30, background: "white", borderRadius: 20, border: "1px solid #e2e8f0", textAlign: "center", color: "#2563eb" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 },
  card: { background: "white", borderRadius: 24, padding: 18, border: "1px solid #e2e8f0", boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" },
  cardSubtitle: { margin: "4px 0 0", fontSize: 13, color: "#64748b" },
  badge: { padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 14 },
  metricBox: { background: "#f8fbff", borderRadius: 14, padding: 10, border: "1px solid #e2e8f0" },
  metricLabel: { margin: 0, color: "#64748b", fontSize: 12, fontWeight: 600 },
  metricValue: { marginTop: 4, display: "block", color: "#0f172a", fontSize: 16 },
  footerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  meta: { margin: 0, color: "#64748b", fontSize: 12 },
  actionButton: { background: "#2563eb", color: "white", textDecoration: "none", padding: "10px 14px", borderRadius: 999, fontWeight: 700, fontSize: 13 },
};
