"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import StatsCards from "../../components/StatsCards";

export default function OfficeDashboardPage() {
  const [stats, setStats] = useState<any>({
    totalAssets: 0,
    assignedAssets: 0,
    availableAssets: 0,
    employees: 0,
    openTickets: 0,
    resolvedTickets: 0,
    criticalIssues: 0,
    maintenanceDue: 0,
    warrantyExpiring: 0,
  });

  useEffect(() => {
    const loadDashboard = async () => {
      const [
        totalAssetsResult,
        assignedAssetsResult,
        availableAssetsResult,
        employeesResult,
        ticketsResult,
        maintenanceResult,
        warrantyResult,
      ] = await Promise.all([
        supabase.from("assets").select("id", { count: "exact", head: true }),
        supabase.from("assets").select("id", { count: "exact", head: true }).eq("status", "Assigned"),
        supabase.from("assets").select("id", { count: "exact", head: true }).eq("status", "Available"),
        supabase.from("employees").select("id", { count: "exact", head: true }),
        supabase.from("tickets").select("status, priority"),
        supabase.from("asset_maintenance").select("maintenance_date"),
        supabase.from("assets").select("warranty_expiry"),
      ]);

      const tickets = ticketsResult.data || [];
      const maintenanceDue = (maintenanceResult.data || []).filter((item: any) => {
        const date = new Date(item.maintenance_date);
        const now = new Date();
        const days = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return days >= 0 && days <= 30;
      }).length;

      const warrantyExpiring = (warrantyResult.data || []).filter((item: any) => {
        if (!item.warranty_expiry) return false;
        const date = new Date(item.warranty_expiry);
        const now = new Date();
        const days = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return days >= 0 && days <= 30;
      }).length;

      setStats({
        totalAssets: totalAssetsResult.count || 0,
        assignedAssets: assignedAssetsResult.count || 0,
        availableAssets: availableAssetsResult.count || 0,
        employees: employeesResult.count || 0,
        openTickets: tickets.filter((ticket: any) => ticket.status === "Open").length,
        resolvedTickets: tickets.filter((ticket: any) => ticket.status === "Resolved").length,
        criticalIssues: tickets.filter((ticket: any) => ticket.priority === "Critical").length,
        maintenanceDue,
        warrantyExpiring,
      });
    };

    void loadDashboard();
  }, []);

  return (
    <div>
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Office Workspace</p>
          <h1 style={styles.title}>Office Dashboard</h1>
          <p style={styles.subtitle}>Operational overview for office IT and support teams.</p>
        </div>
      </div>

      <StatsCards stats={stats} />

      <div style={styles.quickActions}>
        <QuickCard href="/admin/assets" label="Manage Assets" description="Review asset lifecycle, transfers, and assignment status." />
        <QuickCard href="/admin/tickets" label="Support Tickets" description="Track open incidents, escalations, and team workload." />
        <QuickCard href="/admin/network" label="Network Monitoring" description="Review connectivity and monitoring alerts across locations." />
      </div>
    </div>
  );
}

function QuickCard({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link href={href} style={styles.quickCard}>
      <h3 style={styles.quickTitle}>{label}</h3>
      <p style={styles.quickText}>{description}</p>
    </Link>
  );
}

const styles: any = {
  header: {
    marginBottom: 24,
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
    margin: "6px 0 8px",
    color: "#0f172a",
    fontSize: 30,
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
  },
  quickActions: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  quickCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 18,
    textDecoration: "none",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  quickTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 18,
  },
  quickText: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.5,
  },
};
