import { supabase } from "../supabase";

export interface FleetOverviewData {
  vessel: {
    id: number;
    vessel_name?: string | null;
    imo_number?: string | null;
    status?: string | null;
    internet_provider?: string | null;
    last_backup?: string | null;
  } | null;
  stats: {
    totalAssets: number;
    networkDevices: number;
    servers: number;
    openTickets: number;
    maintenanceDue: number;
    checklistCompletion: number;
    internetStatus: string;
    warrantyExpiry: number;
  };
  incidents: Array<{
    id: number;
    title?: string | null;
    status?: string | null;
    created_at?: string | null;
  }>;
  maintenance: Array<{
    id: number;
    maintenance_date?: string | null;
    status?: string | null;
    assets?: {
      asset_name?: string | null;
    } | null;
  }>;
  checklists: Array<{
    id: number;
    checklist_type?: string | null;
    status?: string | null;
  }>;
  warrantyItems: Array<{
    id: number;
    asset_name?: string | null;
    warranty_expiry?: string | null;
  }>;
  documents: Array<{
    id: number;
    document_name?: string | null;
    created_at?: string | null;
  }>;
}

export async function getFleetOverviewData(vesselId: string): Promise<FleetOverviewData> {
  const [vesselResult, assetsResult, networkResult, ticketsResult, maintenanceResult, checklistResult, documentsResult] = await Promise.all([
    supabase.from("vessels").select("id, vessel_name, imo_number, status, internet_provider, last_backup").eq("id", vesselId).single(),
    supabase.from("assets").select("id, asset_type, warranty_expiry, asset_name").eq("vessel_id", vesselId),
    supabase.from("network_devices").select("id, status").eq("vessel_id", vesselId),
    supabase.from("tickets").select("id, title, status, created_at").eq("vessel_id", vesselId).order("created_at", { ascending: false }),
    supabase.from("asset_maintenance").select("id, maintenance_date, status, assets(asset_name)").eq("vessel_id", vesselId).order("maintenance_date", { ascending: false }),
    supabase.from("vessel_it_checklists").select("id, checklist_type, status").eq("vessel_id", vesselId).order("created_at", { ascending: false }),
    supabase.from("documents").select("id, document_name, created_at").eq("vessel_id", vesselId).order("created_at", { ascending: false }),
  ]);

  if (vesselResult.error) {
    throw vesselResult.error;
  }

  const assets = assetsResult.data || [];
  const networkDevices = networkResult.data || [];
  const tickets = ticketsResult.data || [];
  const maintenance = (maintenanceResult.data || []).map((item: any) => ({
    ...item,
    assets: Array.isArray(item.assets) ? item.assets[0] ?? null : item.assets ?? null,
  }));
  const checklists = checklistResult.data || [];
  const documents = documentsResult.data || [];

  const warrantyItems = (assets as Array<{ id: number; asset_name?: string | null; warranty_expiry?: string | null }>).filter(
    (asset) => Boolean(asset.warranty_expiry)
  );

  const stats = {
    totalAssets: assets.length,
    networkDevices: networkDevices.length,
    servers: assets.filter((asset: { asset_type?: string | null }) => asset.asset_type === "Server").length,
    openTickets: tickets.filter((ticket: { status?: string | null }) => ticket.status !== "Resolved").length,
    maintenanceDue: maintenance.filter((item: { status?: string | null }) => item.status === "Pending").length,
    checklistCompletion: checklists.length ? Math.round((checklists.filter((item) => item.status === "Completed").length / checklists.length) * 100) : 0,
    internetStatus: networkDevices.some((device: { status?: string | null }) => device.status === "Online") ? "Connected" : "Offline",
    warrantyExpiry: warrantyItems.length,
  };

  return {
    vessel: vesselResult.data || null,
    stats,
    incidents: tickets,
    maintenance,
    checklists,
    warrantyItems,
    documents,
  };
}
