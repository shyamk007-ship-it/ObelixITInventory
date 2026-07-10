"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import OfficeStats from "../../components/office/OfficeStats";
import OfficeQuickActions from "../../components/office/OfficeQuickActions";
import OfficeWidgets from "../../components/office/OfficeWidgets";

interface TicketRow {
  status?: string | null;
  priority?: string | null;
}

interface MaintenanceRow {
  maintenance_date?: string | null;
  status?: string | null;
}

interface WarrantyRow {
  warranty_expiry?: string | null;
}

export default function OfficeDashboardPage() {
  const [stats, setStats] = useState({
    totalOfficeAssets: 0,
    assignedAssets: 0,
    availableAssets: 0,
    employees: 0,
    openTickets: 0,
    resolvedTickets: 0,
    criticalIssues: 0,
    maintenanceDue: 0,
    warrantyExpiring: 0,
  });

  const [widgets, setWidgets] = useState({
    assetOverview: "Loading...",
    employeeSummary: "Loading...",
    supportTickets: "Loading...",
    networkStatus: "Loading...",
    recentActivity: "Loading...",
    upcomingMaintenance: "Loading...",
  });

  useEffect(() => {
    const loadOfficeDashboard = async () => {
      const [
        totalAssetsResult,
        assignedAssetsResult,
        availableAssetsResult,
        employeesResult,
        ticketsResult,
        maintenanceResult,
        warrantyResult,
        activityResult,
      ] = await Promise.all([
        supabase.from("assets").select("id", { count: "exact", head: true }),
        supabase.from("assets").select("id", { count: "exact", head: true }).eq("status", "Assigned"),
        supabase.from("assets").select("id", { count: "exact", head: true }).eq("status", "Available"),
        supabase.from("employees").select("id", { count: "exact", head: true }),
        supabase.from("tickets").select("status, priority"),
        supabase.from("asset_maintenance").select("maintenance_date, status"),
        supabase.from("assets").select("warranty_expiry"),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }),
      ]);

      const tickets: TicketRow[] = ticketsResult.data || [];
      const maintenanceRows: MaintenanceRow[] = maintenanceResult.data || [];
      const warrantyRows: WarrantyRow[] = warrantyResult.data || [];
      const now = new Date();

      const maintenanceDue = maintenanceRows.filter((item) => {
        if (!item.maintenance_date) return false;
        const date = new Date(item.maintenance_date);
        const days = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return item.status === "Pending" && days >= 0 && days <= 30;
      }).length;

      const warrantyExpiring = warrantyRows.filter((item) => {
        if (!item.warranty_expiry) return false;
        const date = new Date(item.warranty_expiry);
        const days = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return days >= 0 && days <= 30;
      }).length;

      const totalAssets = totalAssetsResult.count || 0;
      const assignedAssets = assignedAssetsResult.count || 0;
      const availableAssets = availableAssetsResult.count || 0;
      const employees = employeesResult.count || 0;
      const openTickets = tickets.filter((ticket) => ticket.status === "Open").length;
      const resolvedTickets = tickets.filter((ticket) => ticket.status === "Resolved").length;
      const criticalIssues = tickets.filter((ticket) => ticket.priority === "Critical").length;
      const auditCount = activityResult.count || 0;

      setStats({
        totalOfficeAssets: totalAssets,
        assignedAssets,
        availableAssets,
        employees,
        openTickets,
        resolvedTickets,
        criticalIssues,
        maintenanceDue,
        warrantyExpiring,
      });

      setWidgets({
        assetOverview: `${assignedAssets} assigned / ${availableAssets} available`,
        employeeSummary: `${employees} active office employees`,
        supportTickets: `${openTickets} open, ${resolvedTickets} resolved`,
        networkStatus: criticalIssues > 0 ? "Attention required" : "Stable",
        recentActivity: `${auditCount} recent audit events tracked`,
        upcomingMaintenance: `${maintenanceDue} tasks due in the next 30 days`,
      });
    };

    void loadOfficeDashboard();
  }, []);

  return (
    <div>
      <OfficeStats {...stats} />
      <OfficeWidgets {...widgets} />
      <OfficeQuickActions />
    </div>
  );
}
