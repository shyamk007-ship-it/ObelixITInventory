"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

interface VesselDetail {
  id: number;
  vessel_name?: string | null;
  imo_number?: string | null;
  vessel_type?: string | null;
  status?: string | null;
  internet_provider?: string | null;
  satellite_provider?: string | null;
  operating_region?: string | null;
  captain?: string | null;
  last_backup?: string | null;
}

const tabs = ["Overview", "Assets", "Network", "IT Checklist", "Maintenance", "Incidents", "Documents", "Reports"] as const;
type TabKey = (typeof tabs)[number];

export default function FleetVesselDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vesselId = Number(params?.id);
  const [activeTab, setActiveTab] = useState<TabKey>("Overview");
  const [vessel, setVessel] = useState<VesselDetail | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [networkDevices, setNetworkDevices] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vesselId) return;
    void loadVesselData();
  }, [vesselId]);

  const loadVesselData = async () => {
    setLoading(true);
    try {
      const [vesselResult, assetsResult, networkResult, checklistResult, maintenanceResult, incidentResult] = await Promise.all([
        supabase.from("vessels").select("*").eq("id", vesselId).single(),
        supabase.from("assets").select("*").eq("vessel_id", vesselId),
        supabase.from("network_devices").select("*").eq("vessel_id", vesselId),
        supabase.from("vessel_it_checklists").select("*").eq("vessel_id", vesselId),
        supabase.from("asset_maintenance").select("*, assets(asset_name)").eq("asset_id", vesselId),
        supabase.from("tickets").select("*").eq("vessel_id", vesselId),
      ]);

      if (!vesselResult.error) setVessel(vesselResult.data as VesselDetail);
      if (!assetsResult.error) setAssets(assetsResult.data || []);
      if (!networkResult.error) setNetworkDevices(networkResult.data || []);
      if (!checklistResult.error) setChecklists(checklistResult.data || []);
      if (!maintenanceResult.error) setMaintenance(maintenanceResult.data || []);
      if (!incidentResult.error) setIncidents(incidentResult.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => ({
    assets: assets.length,
    onlineDevices: networkDevices.filter((device) => device.status === "Online").length,
    openIncidents: incidents.filter((incident) => incident.status !== "Resolved").length,
    maintenanceDue: maintenance.filter((item) => item.status === "Pending").length,
  }), [assets, networkDevices, incidents, maintenance]);

  if (loading) {
    return <div style={styles.loading}>Loading vessel profile…</div>;
  }

  if (!vessel) {
    return <div style={styles.loading}>Vessel not found.</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Fleet Operations</p>
          <h1 style={styles.title}>{vessel.vessel_name || "Vessel"}</h1>
          <p style={styles.subtitle}>Operational snapshot and lifecycle view for this vessel.</p>
        </div>
        <button style={styles.secondaryButton} onClick={() => router.push("/fleet/dashboard")}>← Back to Fleet</button>
      </div>

      <div style={styles.summaryGrid}>
        <SummaryCard label="Assets" value={summary.assets} />
        <SummaryCard label="Online Devices" value={summary.onlineDevices} />
        <SummaryCard label="Open Incidents" value={summary.openIncidents} />
        <SummaryCard label="Maintenance Due" value={summary.maintenanceDue} />
      </div>

      <div style={styles.tabRow}>
        {tabs.map((tab) => (
          <button key={tab} style={{ ...styles.tabButton, ...(activeTab === tab ? styles.tabButtonActive : {}) }} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      <div style={styles.card}>
        {activeTab === "Overview" && (
          <div style={styles.contentGrid}>
            <div>
              <p style={styles.metaLabel}>IMO</p>
              <h3 style={styles.metaValue}>{vessel.imo_number || "—"}</h3>
            </div>
            <div>
              <p style={styles.metaLabel}>Type</p>
              <h3 style={styles.metaValue}>{vessel.vessel_type || "—"}</h3>
            </div>
            <div>
              <p style={styles.metaLabel}>Status</p>
              <h3 style={styles.metaValue}>{vessel.status || "—"}</h3>
            </div>
            <div>
              <p style={styles.metaLabel}>Internet Provider</p>
              <h3 style={styles.metaValue}>{vessel.internet_provider || "—"}</h3>
            </div>
            <div>
              <p style={styles.metaLabel}>Satellite Provider</p>
              <h3 style={styles.metaValue}>{vessel.satellite_provider || "—"}</h3>
            </div>
            <div>
              <p style={styles.metaLabel}>Region</p>
              <h3 style={styles.metaValue}>{vessel.operating_region || "—"}</h3>
            </div>
            <div>
              <p style={styles.metaLabel}>Captain</p>
              <h3 style={styles.metaValue}>{vessel.captain || "—"}</h3>
            </div>
            <div>
              <p style={styles.metaLabel}>Last Backup</p>
              <h3 style={styles.metaValue}>{vessel.last_backup || "—"}</h3>
            </div>
          </div>
        )}

        {activeTab === "Assets" && (
          <div style={styles.listGrid}>
            {assets.map((asset) => (
              <div key={asset.id} style={styles.listCard}>
                <strong>{asset.asset_name || "Unnamed Asset"}</strong>
                <p style={styles.listText}>{asset.asset_tag || "—"}</p>
                <p style={styles.listText}>{asset.status || "Unknown"}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Network" && (
          <div style={styles.listGrid}>
            {networkDevices.map((device) => (
              <div key={device.id} style={styles.listCard}>
                <strong>{device.device_name || "Unnamed Device"}</strong>
                <p style={styles.listText}>{device.ip_address || "—"}</p>
                <p style={styles.listText}>{device.status || "Unknown"}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "IT Checklist" && (
          <div style={styles.listGrid}>
            {checklists.map((item) => (
              <div key={item.id} style={styles.listCard}>
                <strong>{item.checklist_type || "Checklist"}</strong>
                <p style={styles.listText}>{item.status || "Pending"}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Maintenance" && (
          <div style={styles.listGrid}>
            {maintenance.map((item) => (
              <div key={item.id} style={styles.listCard}>
                <strong>{item.assets?.asset_name || "Maintenance Item"}</strong>
                <p style={styles.listText}>{item.status || "Pending"}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Incidents" && (
          <div style={styles.listGrid}>
            {incidents.map((incident) => (
              <div key={incident.id} style={styles.listCard}>
                <strong>{incident.title || "Incident"}</strong>
                <p style={styles.listText}>{incident.status || "Open"}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Documents" && <div style={styles.emptyState}>Documents will be surfaced here from the fleet document repository.</div>}
        {activeTab === "Reports" && <div style={styles.emptyState}>Operational reports will be generated here for the selected vessel.</div>}
      </div>
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

const styles: any = {
  page: { padding: 30, minHeight: "100vh", background: "#f8fbff", color: "#0f172a" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 16 },
  eyebrow: { margin: 0, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 12, fontWeight: 700 },
  title: { margin: "4px 0 6px", fontSize: 28, fontWeight: 800 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 760 },
  secondaryButton: { border: "1px solid #cbd5e1", background: "white", color: "#0f172a", padding: "10px 14px", borderRadius: 999, fontWeight: 700, cursor: "pointer" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 },
  summaryCard: { background: "white", borderRadius: 20, padding: 16, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)" },
  summaryLabel: { margin: 0, color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase" },
  summaryValue: { marginTop: 6, display: "block", fontSize: 24, color: "#0f172a" },
  tabRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 },
  tabButton: { border: "1px solid #cbd5e1", background: "white", color: "#334155", borderRadius: 999, padding: "8px 12px", cursor: "pointer", fontWeight: 700 },
  tabButtonActive: { background: "#2563eb", color: "white", borderColor: "#2563eb" },
  card: { background: "white", borderRadius: 24, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)" },
  contentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 },
  metaLabel: { margin: 0, color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase" },
  metaValue: { margin: "4px 0 0", fontSize: 18, color: "#0f172a" },
  listGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 },
  listCard: { border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, background: "#f8fbff" },
  listText: { margin: "4px 0 0", color: "#64748b", fontSize: 13 },
  emptyState: { padding: 24, color: "#64748b", background: "#f8fbff", borderRadius: 16, border: "1px dashed #cbd5e1" },
  loading: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh", color: "#0f172a" },
};
