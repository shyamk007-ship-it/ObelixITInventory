"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

interface ActivityItem {
  id: number;
  title: string;
  detail: string;
  timestamp: string;
  tone: "info" | "warning" | "critical";
}

interface FleetSummary {
  fleetHealth: number;
  totalVessels: number;
  onlineVessels: number;
  criticalAlerts: number;
  maintenanceDue: number;
  fleetAssets: number;
  openTickets: number;
  warrantyExpiring: number;
  recentActivity: ActivityItem[];
}

export default function FleetDashboardPage() {
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadFleetData();
  }, []);

  const loadFleetData = async () => {
    setLoading(true);
    try {
      const [vesselsResult, assetsResult, networkResult, maintenanceResult, ticketResult, documentsResult] = await Promise.all([
        supabase.from("vessels").select("id, vessel_name, status, internet_provider").order("vessel_name", { ascending: true }),
        supabase.from("assets").select("id, vessel_id, warranty_expiry"),
        supabase.from("network_devices").select("id, vessel_id, status"),
        supabase.from("asset_maintenance").select("id, vessel_id, status, maintenance_date"),
        supabase.from("tickets").select("id, vessel_id, title, status, created_at").order("created_at", { ascending: false }),
        supabase.from("documents").select("id, vessel_id, document_name, created_at").order("created_at", { ascending: false }),
      ]);

      if (vesselsResult.error) throw vesselsResult.error;
      if (assetsResult.error) throw assetsResult.error;
      if (networkResult.error) throw networkResult.error;
      if (maintenanceResult.error) throw maintenanceResult.error;
      if (ticketResult.error) throw ticketResult.error;
      if (documentsResult.error) throw documentsResult.error;

      const vessels = vesselsResult.data || [];
      const assets = assetsResult.data || [];
      const networkDevices = networkResult.data || [];
      const maintenance = maintenanceResult.data || [];
      const tickets = ticketResult.data || [];
      const documents = documentsResult.data || [];

      const onlineVessels = vessels.filter((vessel: any) => {
        const vesselDevices = networkDevices.filter((device: any) => String(device.vessel_id) === String(vessel.id));
        return vessel.status !== "Offline" || vesselDevices.some((device: any) => device.status === "Online");
      }).length;

      const openTickets = tickets.filter((ticket: any) => ticket.status !== "Resolved").length;
      const maintenanceDue = maintenance.filter((item: any) => item.status === "Pending").length;
      const criticalAlerts = Math.max(openTickets, maintenanceDue);
      const warrantyExpiring = (assets as Array<{ warranty_expiry?: string | null }>).filter((asset) => {
        if (!asset.warranty_expiry) return false;
        const expiry = new Date(asset.warranty_expiry);
        const soon = new Date();
        soon.setDate(soon.getDate() + 90);
        return expiry <= soon;
      }).length;

      const fleetHealth = vessels.length
        ? Math.max(55, Math.round(100 - (openTickets * 4 + maintenanceDue * 3 + Math.max(0, vessels.length - onlineVessels) * 2)))
        : 100;

      const recentActivity = [
        ...tickets.slice(0, 4).map((ticket: any) => ({
          id: ticket.id,
          title: ticket.title || "Ticket updated",
          detail: `${ticket.status || "Open"} • Vessel ${ticket.vessel_id || "unknown"}`,
          timestamp: ticket.created_at || "Recently updated",
          tone: ticket.status === "Resolved" ? "info" : "warning" as const,
        })),
        ...maintenance.slice(0, 3).map((item: any) => ({
          id: item.id,
          title: "Maintenance activity",
          detail: `${item.status || "Scheduled"} • Vessel ${item.vessel_id || "unknown"}`,
          timestamp: item.maintenance_date || "Pending",
          tone: item.status === "Pending" ? "critical" as const : "info" as const,
        })),
        ...documents.slice(0, 2).map((document: any) => ({
          id: document.id,
          title: document.document_name || "Document shared",
          detail: `Uploaded for vessel ${document.vessel_id || "unknown"}`,
          timestamp: document.created_at || "Recently updated",
          tone: "info" as const,
        })),
      ]
        .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
        .slice(0, 6);

      setSummary({
        fleetHealth,
        totalVessels: vessels.length,
        onlineVessels,
        criticalAlerts,
        maintenanceDue,
        fleetAssets: assets.length,
        openTickets,
        warrantyExpiring,
        recentActivity,
      });
    } catch (error) {
      console.error(error);
      setSummary({
        fleetHealth: 0,
        totalVessels: 0,
        onlineVessels: 0,
        criticalAlerts: 0,
        maintenanceDue: 0,
        fleetAssets: 0,
        openTickets: 0,
        warrantyExpiring: 0,
        recentActivity: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Fleet Health", value: `${summary.fleetHealth}%` },
      { label: "Total Vessels", value: summary.totalVessels },
      { label: "Online Vessels", value: summary.onlineVessels },
      { label: "Critical Alerts", value: summary.criticalAlerts },
      { label: "Maintenance Due", value: summary.maintenanceDue },
      { label: "Fleet Assets", value: summary.fleetAssets },
      { label: "Open Tickets", value: summary.openTickets },
      { label: "Warranty Expiring", value: summary.warrantyExpiring },
    ];
  }, [summary]);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Fleet Operations</p>
          <h1 style={styles.title}>Fleet Dashboard</h1>
          <p style={styles.subtitle}>A high-level operational view of vessel readiness, incident posture, and IT health across the fleet.</p>
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading fleet overview…</div>
      ) : (
        <>
          <div style={styles.summaryGrid}>
            {statCards.map((item) => (
              <SummaryCard key={item.label} label={item.label} value={item.value} />
            ))}
          </div>

          <div style={styles.contentGrid}>
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>Recent Fleet Activity</h2>
                <span style={styles.panelCount}>{summary?.recentActivity.length || 0}</span>
              </div>
              <div style={styles.panelBody}>
                {summary?.recentActivity.length ? (
                  summary.recentActivity.map((activity) => (
                    <div key={activity.id} style={styles.activityItem}>
                      <div style={{ ...styles.dot, ...getToneStyle(activity.tone) }} />
                      <div style={styles.activityCopy}>
                        <p style={styles.activityTitle}>{activity.title}</p>
                        <p style={styles.activityDetail}>{activity.detail}</p>
                        <p style={styles.activityTimestamp}>{activity.timestamp}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={styles.emptyText}>No recent activity found.</p>
                )}
              </div>
            </div>
          </div>
        </>
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

function getToneStyle(tone: "info" | "warning" | "critical") {
  if (tone === "critical") return { background: "#dc2626" };
  if (tone === "warning") return { background: "#f59e0b" };
  return { background: "#2563eb" };
}

const styles: any = {
  page: { padding: 30, minHeight: "100vh", background: "#f8fbff", color: "#0f172a" },
  headerRow: { marginBottom: 22 },
  eyebrow: { margin: 0, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 12, fontWeight: 700 },
  title: { margin: "4px 0 6px", fontSize: 28, fontWeight: 800 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 760 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 },
  summaryCard: { background: "white", borderRadius: 20, padding: 16, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)" },
  summaryLabel: { margin: 0, color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase" },
  summaryValue: { marginTop: 6, display: "block", fontSize: 24, color: "#0f172a" },
  contentGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1fr)" },
  panel: { background: "white", borderRadius: 24, border: "1px solid #e2e8f0", boxShadow: "0 12px 40px rgba(15, 23, 42, 0.06)" },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" },
  panelTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" },
  panelCount: { background: "#f1f5f9", color: "#475569", padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  panelBody: { padding: 16 },
  activityItem: { display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" },
  activityCopy: { flex: 1 },
  activityTitle: { margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" },
  activityDetail: { margin: "4px 0 0", fontSize: 13, color: "#64748b" },
  activityTimestamp: { margin: "4px 0 0", fontSize: 12, color: "#94a3b8" },
  dot: { width: 10, height: 10, borderRadius: "50%", marginTop: 6 },
  emptyText: { margin: 0, fontSize: 14, color: "#64748b" },
  loading: { padding: 30, color: "#2563eb", background: "white", borderRadius: 20, border: "1px solid #e2e8f0", textAlign: "center" },
};
