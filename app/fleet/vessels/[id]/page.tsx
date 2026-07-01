"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import FleetStatCard from "../../../components/fleet/FleetStatCard";
import VesselHeader from "../../../components/fleet/VesselHeader";
import RecentIncidents from "../../../components/fleet/RecentIncidents";
import UpcomingMaintenance from "../../../components/fleet/UpcomingMaintenance";
import ChecklistProgress from "../../../components/fleet/ChecklistProgress";
import WarrantyPanel from "../../../components/fleet/WarrantyPanel";
import InternetStatus from "../../../components/fleet/InternetStatus";
import LatestDocuments from "../../../components/fleet/LatestDocuments";
import { getFleetOverviewData } from "../../../lib/fleet/overview";

export default function VesselOverviewPage() {
  const params = useParams();
  const vesselId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof getFleetOverviewData>> | null>(null);

  useEffect(() => {
    if (!vesselId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    void loadOverview();
  }, [vesselId]);

  const loadOverview = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const overview = await getFleetOverviewData(vesselId);
      setData(overview);
      if (!overview.vessel) {
        setNotFound(true);
      }
    } catch (error) {
      console.error(error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <VesselHeader loading />
        <div style={styles.statsGrid}>
          {Array.from({ length: 8 }).map((_, index) => (
            <FleetStatCard key={index} label="" value="" loading />
          ))}
        </div>
        <div style={styles.panelsGrid}>
          <RecentIncidents incidents={[]} loading />
          <UpcomingMaintenance maintenance={[]} loading />
          <ChecklistProgress checklists={[]} loading />
          <WarrantyPanel items={[]} loading />
        </div>
      </div>
    );
  }

  if (notFound || !data?.vessel) {
    return (
      <div style={styles.page}>
        <div style={styles.notFoundCard}>
          <p style={styles.eyebrow}>Fleet Workspace</p>
          <h1 style={styles.title}>Vessel Not Found</h1>
          <p style={styles.subtitle}>The selected vessel could not be found. Please return to the fleet dashboard and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <VesselHeader vesselName={data.vessel.vessel_name} subtitle={`Operational snapshot for ${data.vessel.vessel_name || "this vessel"}.`} />

      <div style={styles.statsGrid}>
        <FleetStatCard label="Total Assets" value={data.stats.totalAssets} description="Assigned and available assets" />
        <FleetStatCard label="Network Devices" value={data.stats.networkDevices} description="Online and offline endpoints" />
        <FleetStatCard label="Servers" value={data.stats.servers} description="Server infrastructure" />
        <FleetStatCard label="Open Tickets" value={data.stats.openTickets} description="Active incidents" />
        <FleetStatCard label="Maintenance Due" value={data.stats.maintenanceDue} description="Pending maintenance" />
        <FleetStatCard label="Checklist Completion" value={`${data.stats.checklistCompletion}%`} description="Operational readiness" />
        <InternetStatus status={data.stats.internetStatus} />
        <FleetStatCard label="Warranty Expiry" value={data.stats.warrantyExpiry} description="Assets with active warranties" />
      </div>

      <div style={styles.panelsGrid}>
        <RecentIncidents incidents={data.incidents} />
        <UpcomingMaintenance maintenance={data.maintenance} />
        <ChecklistProgress checklists={data.checklists} />
        <WarrantyPanel items={data.warrantyItems} />
        <LatestDocuments documents={data.documents} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 30,
    minHeight: "100vh",
    background: "#f8fbff",
    color: "#0f172a",
  },
  eyebrow: {
    margin: 0,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    fontSize: 12,
    fontWeight: 700,
  },
  title: {
    margin: "6px 0 6px",
    fontSize: 28,
    fontWeight: 800,
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
    maxWidth: 700,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 24,
  },
  panelsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
  },
  notFoundCard: {
    background: "white",
    borderRadius: 24,
    padding: 40,
    border: "1px solid #e2e8f0",
    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
    maxWidth: 560,
    margin: "0 auto",
    textAlign: "center",
  },
};
