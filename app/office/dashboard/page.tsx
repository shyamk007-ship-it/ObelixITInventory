"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import OfficeStats from "../../components/office/OfficeStats";
import OfficeQuickActions from "../../components/office/OfficeQuickActions";
import {
  OFFICE_ANALYTICS_METRICS,
  getDashboardInsights,
  loadOfficeAnalyticsData,
} from "../../lib/office-analytics";
import { supabase } from "../../lib/supabase";

const palette = ["#1d4ed8", "#2563eb", "#38bdf8", "#0f766e", "#14b8a6", "#06b6d4", "#93c5fd", "#60a5fa"];

export default function OfficeDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(() => getDashboardInsights({ assets: [], assetExtensions: {}, employees: [], tickets: [], maintenance: [], assignments: [], activity: [] }));
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      setLoading(true);
      const data = await loadOfficeAnalyticsData();
      if (!active) return;
      setInsights(getDashboardInsights(data));
      setLastUpdated(new Date().toLocaleString());
      setLoading(false);
    };

    void refresh();

    const channel = supabase
      .channel("office-dashboard-bi")
      .on("postgres_changes", { event: "*", schema: "public", table: "assets" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "asset_maintenance" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "assignment_records" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "asset_register_extensions" }, () => void refresh())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const statsLinks = {
    totalOfficeAssets: OFFICE_ANALYTICS_METRICS["total-office-assets"].path,
    assignedAssets: OFFICE_ANALYTICS_METRICS["assigned-assets"].path,
    availableAssets: OFFICE_ANALYTICS_METRICS["available-assets"].path,
    employees: OFFICE_ANALYTICS_METRICS.employees.path,
    openTickets: OFFICE_ANALYTICS_METRICS["open-tickets"].path,
    resolvedTickets: OFFICE_ANALYTICS_METRICS["resolved-tickets"].path,
    criticalIssues: OFFICE_ANALYTICS_METRICS["critical-issues"].path,
    maintenanceDue: OFFICE_ANALYTICS_METRICS["maintenance-due"].path,
    warrantyExpiring: OFFICE_ANALYTICS_METRICS["warranty-expiring"].path,
  };

  const recentAssignments = insights.recentActivity.filter((row) => row.kind === "Assignment").slice(0, 4);
  const recentNewAssets = insights.recentActivity.filter((row) => row.kind === "Asset").slice(0, 4);
  const recentEmployees = insights.recentActivity.filter((row) => row.kind === "Employee").slice(0, 4);
  const recentTickets = insights.recentActivity.filter((row) => row.kind === "Ticket").slice(0, 4);
  const recentMaintenance = insights.recentActivity.filter((row) => row.kind === "Maintenance").slice(0, 4);

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Office Workspace</p>
          <h2 style={styles.title}>Business Intelligence Command Center</h2>
          <p style={styles.subtitle}>
            Live analytics for office assets, employees, tickets, and maintenance with drill-down KPI pages and automatic refresh from Supabase.
          </p>
        </div>
        <div style={styles.actions}>
          <Link href="/office/assets/register" style={styles.primaryButton}>Add Asset</Link>
          <Link href="/office/employees" style={styles.secondaryButton}>Add Employee</Link>
          <Link href="/office/tickets" style={styles.secondaryButton}>Create Ticket</Link>
          <Link href="/office/analytics" style={styles.secondaryButton}>Open Analytics Hub</Link>
        </div>
      </section>

      <OfficeStats
        totalOfficeAssets={insights.totalOfficeAssets}
        assignedAssets={insights.assignedAssets}
        availableAssets={insights.availableAssets}
        employees={insights.employees}
        openTickets={insights.openTickets}
        resolvedTickets={insights.resolvedTickets}
        criticalIssues={insights.criticalIssues}
        maintenanceDue={insights.maintenanceDue}
        warrantyExpiring={insights.warrantyExpiring}
        hrefs={statsLinks}
      />

      <section style={styles.chartGrid}>
        <ChartCard title="Asset Growth" href={statsLinks.totalOfficeAssets}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={insights.assetGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
              <XAxis dataKey="label" tick={{ fill: "#64748b" }} />
              <YAxis allowDecimals={false} tick={{ fill: "#64748b" }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Assets by Category" href={statsLinks.totalOfficeAssets}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={insights.assetsByCategory} dataKey="value" nameKey="label" innerRadius={50} outerRadius={92} paddingAngle={4}>
                {insights.assetsByCategory.map((entry, index) => <Cell key={`${entry.label}-${index}`} fill={palette[index % palette.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Assets by Department" href={statsLinks.totalOfficeAssets}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={insights.assetsByDepartment}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
              <XAxis dataKey="label" tick={{ fill: "#64748b" }} interval={0} angle={-12} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fill: "#64748b" }} />
              <Tooltip />
              <Bar dataKey="value" fill="#1d4ed8" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Assignments" href={statsLinks.assignedAssets}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={insights.monthlyAssignments}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
              <XAxis dataKey="label" tick={{ fill: "#64748b" }} />
              <YAxis allowDecimals={false} tick={{ fill: "#64748b" }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#0f766e" fill="#d1fae5" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Warranty Expiry Forecast" href={statsLinks.warrantyExpiring}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={insights.warrantyForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
              <XAxis dataKey="label" tick={{ fill: "#64748b" }} />
              <YAxis allowDecimals={false} tick={{ fill: "#64748b" }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Maintenance Status" href={statsLinks.maintenanceDue}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={insights.maintenanceStatus} dataKey="value" nameKey="label" innerRadius={54} outerRadius={94} paddingAngle={4}>
                {insights.maintenanceStatus.map((entry, index) => <Cell key={`${entry.label}-m-${index}`} fill={palette[(index + 2) % palette.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section style={styles.activityGrid}>
        <ActivityPanel title="Recent Activity" rows={insights.recentActivity} />
        <ActivityPanel title="New Assets" rows={recentNewAssets} />
        <ActivityPanel title="Asset Assignments" rows={recentAssignments} />
        <ActivityPanel title="Employee Creation" rows={recentEmployees} />
        <ActivityPanel title="Ticket Updates" rows={recentTickets} />
        <ActivityPanel title="Maintenance Updates" rows={recentMaintenance} />
      </section>

      <OfficeQuickActions />

      {loading && <div style={styles.loadingCard}>Loading office dashboard...</div>}
      {lastUpdated && <div style={styles.footerNote}>Last refreshed {lastUpdated}</div>}
    </div>
  );
}

function ChartCard({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <Link href={href} style={styles.chartCard}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>{title}</h3>
        <span style={styles.cardMeta}>Drill down</span>
      </div>
      {children}
    </Link>
  );
}

function ActivityPanel({ title, rows }: { title: string; rows: Array<{ label: string; detail: string; when: string; kind: string }> }) {
  return (
    <article style={styles.activityCard}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>{title}</h3>
        <span style={styles.cardMeta}>{rows.length} items</span>
      </div>
      <div style={styles.activityList}>
        {rows.length === 0 ? (
          <p style={styles.empty}>No recent items.</p>
        ) : (
          rows.map((row, index) => (
            <div key={`${title}-${index}-${row.label}`} style={styles.activityRow}>
              <div>
                <strong style={styles.activityPrimary}>{row.label}</strong>
                <p style={styles.activitySecondary}>{row.detail}</p>
              </div>
              <span style={styles.activityDetail}>{new Date(row.when).toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 18 },
  hero: { display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: 22, borderRadius: 24, background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.96) 100%)", border: "1px solid rgba(191, 219, 254, 0.9)", boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)" },
  eyebrow: { margin: 0, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 11, fontWeight: 800 },
  title: { margin: "10px 0 0", color: "#0f172a", fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", maxWidth: 820 },
  subtitle: { margin: "10px 0 0", color: "#64748b", lineHeight: 1.65, maxWidth: 860 },
  actions: { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start", justifyContent: "flex-end" },
  primaryButton: { textDecoration: "none", background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "white", padding: "12px 16px", borderRadius: 14, fontWeight: 800, boxShadow: "0 16px 30px rgba(37, 99, 235, 0.24)" },
  secondaryButton: { textDecoration: "none", background: "rgba(255,255,255,0.92)", color: "#0f172a", padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(191, 219, 254, 0.9)", fontWeight: 800 },
  loadingCard: { padding: 20, borderRadius: 18, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(191, 219, 254, 0.9)", color: "#0f172a", fontWeight: 700 },
  chartGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 },
  chartCard: { display: "grid", gap: 10, padding: 18, borderRadius: 22, background: "rgba(255,255,255,0.96)", border: "1px solid rgba(191, 219, 254, 0.88)", boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)", textDecoration: "none" },
  activityGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 },
  activityCard: { background: "rgba(255,255,255,0.94)", borderRadius: 22, border: "1px solid rgba(191, 219, 254, 0.9)", padding: 18, boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)", display: "grid", gap: 10 },
  cardHeader: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  cardTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 900 },
  cardMeta: { color: "#1d4ed8", fontSize: 11, textTransform: "uppercase", fontWeight: 900, letterSpacing: "0.1em" },
  activityList: { display: "grid", gap: 10 },
  activityRow: { display: "flex", justifyContent: "space-between", gap: 10, padding: "12px 0", borderTop: "1px solid rgba(226, 232, 240, 0.9)" },
  activityPrimary: { color: "#0f172a", display: "block", fontSize: 14 },
  activitySecondary: { margin: "6px 0 0", color: "#64748b", fontSize: 13, lineHeight: 1.45 },
  activityDetail: { color: "#1d4ed8", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" },
  empty: { margin: 0, color: "#64748b" },
  footerNote: { color: "#64748b", textAlign: "right", fontSize: 12 },
};
