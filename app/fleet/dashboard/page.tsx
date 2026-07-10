"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import FleetStats from "../../components/fleet/FleetStats";
import FleetWidgets from "../../components/fleet/FleetWidgets";
import FleetQuickActions from "../../components/fleet/FleetQuickActions";

interface VesselSummary {
  id: number;
  vessel_name?: string | null;
  network_health?: number;
  open_incidents?: number;
  maintenance_due?: number;
}

interface VesselRow {
  id: number;
  vessel_name?: string | null;
}

interface AssetRow {
  id: number;
  vessel_id?: number | string | null;
}

interface MaintenanceRow {
  id: number;
  asset_id?: number | string | null;
  status?: string | null;
}

interface TicketRow {
  id: number;
  vessel_id?: number | string | null;
  status?: string | null;
}

interface ChecklistRow {
  id: number;
  status?: string | null;
}

export default function FleetDashboardPage() {
  const [vessels, setVessels] = useState<VesselSummary[]>([]);
  const [fleetAssets, setFleetAssets] = useState(0);
  const [checklistCompletion, setChecklistCompletion] = useState("0%");

  useEffect(() => {
    const loadFleetData = async () => {
      const [vesselsResult, assetsResult, maintenanceResult, ticketResult, checklistResult] = await Promise.all([
        supabase.from("vessels").select("id, vessel_name, status").order("vessel_name", { ascending: true }),
        supabase.from("assets").select("id, vessel_id"),
        supabase.from("asset_maintenance").select("id, asset_id, status"),
        supabase.from("tickets").select("id, vessel_id, status"),
        supabase.from("vessel_checklists").select("id, status"),
      ]);

      const vesselsData: VesselRow[] = vesselsResult.data || [];
      const assets: AssetRow[] = assetsResult.data || [];
      const maintenance: MaintenanceRow[] = maintenanceResult.data || [];
      const tickets: TicketRow[] = ticketResult.data || [];
      const checklists: ChecklistRow[] = checklistResult.data || [];

      const summary = vesselsData.map((vessel) => {
        const vesselAssets = assets.filter((asset) => String(asset.vessel_id) === String(vessel.id));
        const maintenanceDue = maintenance.filter((item) => {
          const assetInVessel = vesselAssets.some((asset) => String(asset.id) === String(item.asset_id));
          return item.status === "Pending" && assetInVessel;
        }).length;

        const openIncidents = tickets.filter(
          (ticket) => String(ticket.vessel_id) === String(vessel.id) && ticket.status !== "Resolved"
        ).length;

        return {
          id: vessel.id,
          vessel_name: vessel.vessel_name,
          maintenance_due: maintenanceDue,
          open_incidents: openIncidents,
          network_health: Math.max(65, 95 - maintenanceDue * 5 - openIncidents * 4),
        } as VesselSummary;
      });

      const completed = checklists.filter((item) => item.status === "Completed").length;
      const checklistRate = checklists.length ? Math.round((completed / checklists.length) * 100) : 0;

      setVessels(summary);
      setFleetAssets(assets.length);
      setChecklistCompletion(`${checklistRate}%`);
    };

    void loadFleetData();
  }, []);

  const totalVessels = vessels.length;
  const onlineVessels = useMemo(() => vessels.filter((vessel) => (vessel.network_health || 0) >= 85).length, [vessels]);
  const offlineVessels = useMemo(() => vessels.filter((vessel) => (vessel.network_health || 0) < 70).length, [vessels]);
  const openIncidents = useMemo(() => vessels.reduce((sum, vessel) => sum + (vessel.open_incidents || 0), 0), [vessels]);
  const maintenanceDue = useMemo(() => vessels.reduce((sum, vessel) => sum + (vessel.maintenance_due || 0), 0), [vessels]);
  const avgHealth = useMemo(() => {
    if (!vessels.length) return 0;
    return Math.round(vessels.reduce((sum, vessel) => sum + (vessel.network_health || 0), 0) / vessels.length);
  }, [vessels]);
  const internetStatus = avgHealth >= 85 ? "Connected" : avgHealth >= 70 ? "Degraded" : "Offline";

  const widgets = {
    fleetStatus: `${onlineVessels} online / ${offlineVessels} offline`,
    recentVesselActivity: vessels.slice(0, 3).map((vessel) => vessel.vessel_name || "Unnamed").join(", ") || "No vessel activity",
    upcomingMaintenance: `${maintenanceDue} pending maintenance tasks`,
    latestIncidents: `${openIncidents} active incidents`,
    fleetNetworkHealth: `${avgHealth}% average health`,
    checklistProgress: checklistCompletion,
    fleetDocuments: "Document repository available in Fleet Documents",
  };

  return (
    <div>
      <FleetStats
        totalVessels={totalVessels}
        onlineVessels={onlineVessels}
        offlineVessels={offlineVessels}
        fleetAssets={fleetAssets}
        openIncidents={openIncidents}
        maintenanceDue={maintenanceDue}
        internetStatus={internetStatus}
        networkHealth={`${avgHealth}%`}
        checklistCompletion={checklistCompletion}
      />
      <FleetWidgets {...widgets} />
      <FleetQuickActions />
    </div>
  );
}
