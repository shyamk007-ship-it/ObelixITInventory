"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function OfficeDashboardPage() {
  const [stats, setStats] = useState<any>({
    officeAssets: 0,
    employees: 0,
    assignments: 0,
    tickets: 0,
    maintenanceDue: 0,
    reports: 0,
    activity: 0,
    users: 0,
  });

  useEffect(() => {
    const loadDashboard = async () => {
      const [
        totalAssetsResult,
        employeesResult,
        ticketsResult,
        assignmentsResult,
        usersResult,
        activityResult,
        maintenanceResult,
      ] = await Promise.all([
        supabase.from("assets").select("id", { count: "exact", head: true }),
        supabase.from("employees").select("id", { count: "exact", head: true }),
        supabase.from("tickets").select("status, priority"),
        supabase.from("assignment_records").select("id", { count: "exact", head: true }),
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }),
        supabase.from("asset_maintenance").select("maintenance_date"),
      ]);

      const tickets = ticketsResult.data || [];
      const maintenanceDue = (maintenanceResult.data || []).filter((item: any) => {
        const date = new Date(item.maintenance_date);
        const now = new Date();
        const days = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return days >= 0 && days <= 30;
      }).length;

      setStats({
        officeAssets: totalAssetsResult.count || 0,
        employees: employeesResult.count || 0,
        assignments: assignmentsResult.count || 0,
        tickets: tickets.length,
        maintenanceDue,
        reports: tickets.filter((ticket: any) => ticket.status === "Resolved").length,
        activity: activityResult.count || 0,
        users: usersResult.count || 0,
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

      <div style={styles.statsGrid}>
        <MetricCard label="Office Assets" value={stats.officeAssets} />
        <MetricCard label="Employees" value={stats.employees} />
        <MetricCard label="Assignments" value={stats.assignments} />
        <MetricCard label="Tickets" value={stats.tickets} />
        <MetricCard label="Maintenance" value={stats.maintenanceDue} />
        <MetricCard label="Reports" value={stats.reports} />
        <MetricCard label="Activity" value={stats.activity} />
        <MetricCard label="Users" value={stats.users} />
      </div>

      <div style={styles.quickActions}>
        <QuickCard href="/office/assets" label="Manage Assets" description="Review asset lifecycle, transfers, and assignment status." />
        <QuickCard href="/office/tickets" label="Support Tickets" description="Track open incidents, escalations, and team workload." />
        <QuickCard href="/office/network" label="Network Monitoring" description="Review connectivity and monitoring alerts across locations." />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.metricCard}>
      <p style={styles.metricLabel}>{label}</p>
      <strong style={styles.metricValue}>{value}</strong>
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
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 20,
  },
  metricCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: "14px 16px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  metricLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  metricValue: {
    display: "block",
    marginTop: 6,
    color: "#0f172a",
    fontSize: 24,
    fontWeight: 800,
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
