"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

interface VesselSummary {
  id: number;
  vessel_name?: string | null;
  imo_number?: string | null;
  status?: string | null;
  internet_provider?: string | null;
  last_backup?: string | null;
  vessel_type?: string | null;
  assets_count?: number;
  active_assets?: number;
  network_health?: number;
  internet_status?: string | null;
  maintenance_due?: number;
  open_incidents?: number;
}

export default function FleetDashboardPage() {
  const router = useRouter();
  const [vessels, setVessels] = useState<VesselSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadFleetData();
  }, []);

  const loadFleetData = async () => {
    setLoading(true);
    try {
      const [vesselsResult, assetsResult, maintenanceResult, ticketResult] = await Promise.all([
        supabase.from("vessels").select("id, vessel_name, imo_number, status, internet_provider, last_backup, vessel_type").order("vessel_name", { ascending: true }),
        supabase.from("assets").select("id, vessel_id, status"),
        supabase.from("asset_maintenance").select("id, asset_id, maintenance_date, status"),
        supabase.from("tickets").select("id, vessel_id, status"),
      ]);

      if (vesselsResult.error) throw vesselsResult.error;
      if (assetsResult.error) throw assetsResult.error;
      if (maintenanceResult.error) throw maintenanceResult.error;
      if (ticketResult.error) throw ticketResult.error;

      const assets = assetsResult.data || [];
      const maintenance = maintenanceResult.data || [];
      const tickets = ticketResult.data || [];

      const summary = (vesselsResult.data || []).map((vessel: any) => {
        const vesselAssets = assets.filter((asset: any) => String(asset.vessel_id) === String(vessel.id));
        const activeAssets = vesselAssets.filter((asset: any) => asset.status === "Assigned" || asset.status === "Available").length;
        const maintenanceDue = maintenance.filter((item: any) => {
          const assetInVessel = vesselAssets.some((asset: any) => String(asset.id) === String(item.asset_id));
          return assetInVessel && item.status === "Pending";
        }).length;
        const openIncidents = tickets.filter((ticket: any) => String(ticket.vessel_id) === String(vessel.id) && ticket.status !== "Resolved").length;
        const networkHealth = Math.max(70, 92 - maintenanceDue * 4 - openIncidents * 2);

        return {
          id: vessel.id,
          vessel_name: vessel.vessel_name,
          imo_number: vessel.imo_number,
          status: vessel.status,
          internet_provider: vessel.internet_provider,
          last_backup: vessel.last_backup || "No backup recorded",
          vessel_type: vessel.vessel_type,
          assets_count: vesselAssets.length,
          active_assets: activeAssets,
          network_health: networkHealth,
          internet_status: networkHealth >= 85 ? "Connected" : networkHealth >= 70 ? "Degraded" : "Offline",
          maintenance_due: maintenanceDue,
          open_incidents: openIncidents,
        } as VesselSummary;
      });

      setVessels(summary);
    } catch (error) {
      console.error(error);
      setVessels([]);
    } finally {
      setLoading(false);
    }
  };

  const totalAssets = useMemo(() => vessels.reduce((sum, vessel) => sum + (vessel.assets_count || 0), 0), [vessels]);
  const avgHealth = useMemo(() => {
    if (!vessels.length) return 0;
    return Math.round(vessels.reduce((sum, vessel) => sum + (vessel.network_health || 0), 0) / vessels.length);
  }, [vessels]);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Fleet Operations</p>
          <h1 style={styles.title}>Fleet Dashboard</h1>
          <p style={styles.subtitle}>Monitor vessel readiness, asset posture, connectivity, and incident load from a single overview.</p>
        </div>
      </div>

      <div style={styles.summaryGrid}>
        <SummaryCard label="Vessels" value={vessels.length} />
        <SummaryCard label="Total Assets" value={totalAssets} />
        <SummaryCard label="Avg. Network Health" value={`${avgHealth}%`} />
      </div>

      {loading ? (
        <div style={styles.loading}>Loading fleet overview…</div>
      ) : (
        <div style={styles.grid}>
          {vessels.map((vessel) => (
            <button key={vessel.id} style={styles.card} onClick={() => router.push(`/fleet/vessels/${vessel.id}`)}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>{vessel.vessel_name || "Unnamed Vessel"}</h3>
                  <p style={styles.cardSubtitle}>{vessel.imo_number || "—"}</p>
                </div>
                <span style={{ ...styles.statusBadge, ...getHealthStyle(vessel.network_health || 0) }}>{vessel.internet_status || "Unknown"}</span>
              </div>

              <div style={styles.metricGrid}>
                <Metric label="Total Assets" value={vessel.assets_count || 0} />
                <Metric label="Active Assets" value={vessel.active_assets || 0} />
                <Metric label="Network Health" value={`${vessel.network_health || 0}%`} />
                <Metric label="Maintenance Due" value={vessel.maintenance_due || 0} />
                <Metric label="Open Incidents" value={vessel.open_incidents || 0} />
                <Metric label="Last Backup" value={vessel.last_backup || "—"} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.summaryCard}>
      <p style={styles.summaryLabel}>{label}</p>
      <strong style={styles.summaryValue}>{value}</strong>
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

function getHealthStyle(health: number) {
  if (health >= 90) return { background: "#dcfce7", color: "#166534" };
  if (health >= 75) return { background: "#fef3c7", color: "#b45309" };
  return { background: "#fee2e2", color: "#b91c1c" };
}

const styles: any = {
  page: { padding: 30, minHeight: "100vh", background: "#f8fbff", color: "#0f172a" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap" },
  eyebrow: { margin: 0, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 12, fontWeight: 700 },
  title: { margin: "4px 0 6px", fontSize: 28, fontWeight: 800 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 760 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 },
  summaryLabel: { margin: 0, color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase" },
  summaryValue: { marginTop: 6, display: "block", fontSize: 24, color: "#0f172a" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 },
  card: { background: "white", borderRadius: 24, padding: 18, border: "1px solid #e2e8f0", boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)", textAlign: "left", cursor: "pointer" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  cardTitle: { margin: 0, color: "#0f172a", fontSize: 18 },
  cardSubtitle: { margin: "4px 0 0", color: "#64748b", fontSize: 13 },
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },
  metricBox: { background: "#f8fbff", borderRadius: 14, padding: 10, border: "1px solid #e2e8f0" },
  metricLabel: { margin: 0, color: "#64748b", fontSize: 12, fontWeight: 600 },
  metricValue: { marginTop: 4, display: "block", color: "#0f172a", fontSize: 16 },
  statusBadge: { padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, display: "inline-block" },
  loading: { padding: 30, color: "#2563eb", background: "white", borderRadius: 20, border: "1px solid #e2e8f0", textAlign: "center" },
};
