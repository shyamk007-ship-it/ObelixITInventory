"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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

export default function VesselOverviewPage() {
  const params = useParams();
  const vesselId = params?.id as string;

  const [vessel, setVessel] = useState<VesselDetail | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [networkDevices, setNetworkDevices] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vesselId) return;
    void loadVesselData();
  }, [vesselId]);

  const loadVesselData = async () => {
    setLoading(true);
    try {
      const [vesselResult, assetsResult, networkResult, maintenanceResult, incidentResult, checklistResult, documentResult] = await Promise.all([
        supabase.from("vessels").select("*").eq("id", vesselId).single(),
        supabase.from("assets").select("*").eq("vessel_id", vesselId).limit(100),
        supabase.from("network_devices").select("*").eq("vessel_id", vesselId).limit(100),
        supabase.from("asset_maintenance").select("*, assets(asset_name)").eq("vessel_id", vesselId).limit(100),
        supabase.from("tickets").select("*").eq("vessel_id", vesselId).limit(100),
        supabase.from("vessel_it_checklists").select("*").eq("vessel_id", vesselId).limit(100),
        supabase.from("documents").select("*").eq("vessel_id", vesselId).limit(100),
      ]);

      if (!vesselResult.error && vesselResult.data) setVessel(vesselResult.data as VesselDetail);
      if (!assetsResult.error && assetsResult.data) setAssets(assetsResult.data);
      if (!networkResult.error && networkResult.data) setNetworkDevices(networkResult.data);
      if (!maintenanceResult.error && maintenanceResult.data) setMaintenance(maintenanceResult.data);
      if (!incidentResult.error && incidentResult.data) setIncidents(incidentResult.data);
      if (!checklistResult.error && checklistResult.data) setChecklists(checklistResult.data);
      if (!documentResult.error && documentResult.data) setDocuments(documentResult.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(
    () => ({
      assets: assets.length,
      networkDevices: networkDevices.length,
      servers: assets.filter((a) => a.asset_type === "Server").length,
      openTickets: incidents.filter((i) => i.status !== "Resolved").length,
      maintenanceDue: maintenance.filter((m) => m.status === "Pending").length,
      internetStatus:
        networkDevices.filter((d) => d.status === "Online").length > 0
          ? "Connected"
          : "Offline",
      networkHealth: Math.max(
        50,
        100 - incidents.filter((i) => i.status !== "Resolved").length * 5
      ),
      lastBackup: vessel?.last_backup || "No backup recorded",
    }),
    [assets, networkDevices, incidents, maintenance, vessel]
  );

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>
          <p style={styles.loadingText}>Loading vessel overview…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Vessel Workspace</p>
          <h1 style={styles.title}>Overview</h1>
          <p style={styles.subtitle}>Key metrics and operational status at a glance.</p>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <StatCard label="Total Assets" value={summary.assets} />
        <StatCard label="Network Devices" value={summary.networkDevices} />
        <StatCard label="Servers" value={summary.servers} />
        <StatCard label="Open Tickets" value={summary.openTickets} />
        <StatCard label="Maintenance Due" value={summary.maintenanceDue} />
        <StatCard label="Internet Status" value={summary.internetStatus} />
        <StatCard label="Network Health" value={`${summary.networkHealth}%`} />
        <StatCard label="Last Backup" value={summary.lastBackup} />
      </div>

      <div style={styles.panelsGrid}>
        <Panel title="Recent Incidents" count={incidents.length}>
          {incidents.slice(0, 5).length > 0 ? (
            incidents.slice(0, 5).map((incident) => (
              <div key={incident.id} style={styles.panelItem}>
                <p style={styles.panelItemTitle}>{incident.title || "Untitled"}</p>
                <p style={styles.panelItemMeta}>{incident.status || "Open"}</p>
              </div>
            ))
          ) : (
            <p style={styles.emptyText}>No records found.</p>
          )}
        </Panel>

        <Panel title="Upcoming Maintenance" count={maintenance.length}>
          {maintenance.slice(0, 5).length > 0 ? (
            maintenance.slice(0, 5).map((item) => (
              <div key={item.id} style={styles.panelItem}>
                <p style={styles.panelItemTitle}>
                  {item.assets?.asset_name || "Asset"}
                </p>
                <p style={styles.panelItemMeta}>{item.status || "Pending"}</p>
              </div>
            ))
          ) : (
            <p style={styles.emptyText}>No records found.</p>
          )}
        </Panel>

        <Panel title="Checklist Completion" count={checklists.length}>
          {checklists.slice(0, 5).length > 0 ? (
            checklists.slice(0, 5).map((checklist) => (
              <div key={checklist.id} style={styles.panelItem}>
                <p style={styles.panelItemTitle}>
                  {checklist.checklist_type || "Checklist"}
                </p>
                <p style={styles.panelItemMeta}>{checklist.status || "Pending"}</p>
              </div>
            ))
          ) : (
            <p style={styles.emptyText}>No records found.</p>
          )}
        </Panel>

        <Panel title="Latest Documents" count={documents.length}>
          {documents.slice(0, 5).length > 0 ? (
            documents.slice(0, 5).map((doc) => (
              <div key={doc.id} style={styles.panelItem}>
                <p style={styles.panelItemTitle}>{doc.document_name || "Document"}</p>
                <p style={styles.panelItemMeta}>
                  {doc.created_at || "No date"}
                </p>
              </div>
            ))
          ) : (
            <p style={styles.emptyText}>No records found.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statLabel}>{label}</p>
      <strong style={styles.statValue}>{value}</strong>
    </div>
  );
}

function Panel({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h3 style={styles.panelTitle}>{title}</h3>
        <span style={styles.panelCount}>{count}</span>
      </div>
      <div style={styles.panelContent}>{children}</div>
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
  headerRow: {
    marginBottom: 30,
  },
  eyebrow: {
    margin: 0,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    fontSize: 12,
    fontWeight: 700,
  },
  title: {
    margin: "4px 0 6px",
    fontSize: 28,
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
    maxWidth: 760,
  },
  loadingContainer: {
    background: "white",
    padding: 40,
    borderRadius: 20,
    border: "1px solid #e2e8f0",
    textAlign: "center",
  },
  loadingText: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    background: "white",
    borderRadius: 16,
    padding: 16,
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.04)",
  },
  statLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  statValue: {
    marginTop: 6,
    display: "block",
    fontSize: 22,
    color: "#0f172a",
  },
  panelsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 16,
  },
  panel: {
    background: "white",
    borderRadius: 20,
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.04)",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #e2e8f0",
  },
  panelTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
  },
  panelCount: {
    background: "#f1f5f9",
    color: "#0f172a",
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
  },
  panelContent: {
    padding: 16,
  },
  panelItem: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottom: "1px solid #f1f5f9",
  },
  panelItemTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: "#0f172a",
  },
  panelItemMeta: {
    margin: "2px 0 0",
    fontSize: 12,
    color: "#64748b",
  },
  emptyText: {
    margin: 0,
    fontSize: 13,
    color: "#94a3b8",
    fontStyle: "italic",
  },
};
