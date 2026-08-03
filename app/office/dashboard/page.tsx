"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  HardDrive,
  Package,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  Users,
  Wrench,
} from "lucide-react";
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
import { OFFICE_ANALYTICS_METRICS, getDashboardInsights, loadOfficeAnalyticsData } from "../../lib/office-analytics";
import { supabase } from "../../lib/supabase";
import DashboardWidgetBoundary from "./DashboardWidgetBoundary";

type UiTheme = "light" | "dark";

type MetricCard = {
  key: string;
  label: string;
  value: number;
  change: number;
  progress: number;
  href: string;
  accent: string;
  icon: ReactNode;
  trend: Array<{ label: string; value: number }>;
};

type PurchaseOrderRow = {
  id: number;
  status?: string | null;
  total_amount?: number | null;
  vendor_name?: string | null;
  expected_delivery_date?: string | null;
  created_at?: string | null;
};

type PurchaseRequestRow = {
  id: number;
  status?: string | null;
  amount?: number | null;
  created_at?: string | null;
};

type VendorRow = {
  id: number;
  name?: string | null;
  on_time_delivery_rate?: number | null;
  rating?: number | null;
};

const palette = ["#0ea5e9", "#2563eb", "#0f766e", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#0284c7"];

const noData = [{ label: "No Data", value: 1 }];

const startOfDay = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const seriesByMonth = (dates: Array<string | null | undefined>) => {
  const bucket = new Map<string, number>();
  dates.forEach((value) => {
    if (!value) return;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;
    const label = date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    bucket.set(label, (bucket.get(label) || 0) + 1);
  });
  return Array.from(bucket.entries()).map(([label, value]) => ({ label, value })).slice(-8);
};

const countBy = (values: Array<string | null | undefined>, fallback = "Unknown") => {
  const bucket = new Map<string, number>();
  values.forEach((value) => {
    const key = (value || fallback).toString();
    bucket.set(key, (bucket.get(key) || 0) + 1);
  });
  return Array.from(bucket.entries()).map(([label, value]) => ({ label, value }));
};

const getTodayChange = (rows: Array<string | null | undefined>) => {
  const day = startOfDay();
  const prev = day - 24 * 60 * 60 * 1000;
  const todayCount = rows.filter((value) => {
    if (!value) return false;
    const time = new Date(value).getTime();
    return time >= day;
  }).length;
  const prevCount = rows.filter((value) => {
    if (!value) return false;
    const time = new Date(value).getTime();
    return time >= prev && time < day;
  }).length;
  return todayCount - prevCount;
};

const safePercent = (value: number, total: number) => {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
};

const formatSafeDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const splitHead = (value: unknown, separator: string) => String(value || "").split(separator)[0] || "";

export default function OfficeDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<UiTheme>("light");
  const [dataState, setDataState] = useState(() => ({
    insights: getDashboardInsights({ assets: [], assetExtensions: {}, employees: [], tickets: [], maintenance: [], assignments: [], activity: [] }),
    purchaseOrders: [] as PurchaseOrderRow[],
    purchaseRequests: [] as PurchaseRequestRow[],
    vendors: [] as VendorRow[],
  }));

  useEffect(() => {
    const syncTheme = () => {
      const attr = document.documentElement.getAttribute("data-office-theme");
      setTheme(attr === "dark" ? "dark" : "light");
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-office-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      setLoading(true);
      try {
        const [analytics, poRes, prRes, vendorRes] = await Promise.all([
          loadOfficeAnalyticsData().catch(() => null),
          supabase.from("asset_purchase_orders").select("id, status, total_amount, vendor_name, expected_delivery_date, created_at").order("created_at", { ascending: false }).limit(120),
          supabase.from("asset_purchase_requests").select("id, status, amount, created_at").order("created_at", { ascending: false }).limit(120),
          supabase.from("asset_vendors").select("id, name, on_time_delivery_rate, rating").limit(100),
        ]);

        if (!active) return;

        const fallbackAnalytics = getDashboardInsights({ assets: [], assetExtensions: {}, employees: [], tickets: [], maintenance: [], assignments: [], activity: [] });

        setDataState({
          insights: analytics ? getDashboardInsights(analytics) : fallbackAnalytics,
          purchaseOrders: poRes.error ? [] : ((poRes.data as PurchaseOrderRow[]) || []),
          purchaseRequests: prRes.error ? [] : ((prRes.data as PurchaseRequestRow[]) || []),
          vendors: vendorRes.error ? [] : ((vendorRes.data as VendorRow[]) || []),
        });
      } catch {
        if (!active) return;
        setDataState({
          insights: getDashboardInsights({ assets: [], assetExtensions: {}, employees: [], tickets: [], maintenance: [], assignments: [], activity: [] }),
          purchaseOrders: [],
          purchaseRequests: [],
          vendors: [],
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void refresh();

    const channel = supabase
      .channel("office-dashboard-executive")
      .on("postgres_changes", { event: "*", schema: "public", table: "assets" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "asset_maintenance" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "assignment_records" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "asset_purchase_orders" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "asset_purchase_requests" }, () => void refresh())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const analytics = dataState.insights;

  const statusSeries = useMemo(
    () => (analytics.maintenanceStatus.length ? analytics.maintenanceStatus : noData),
    [analytics.maintenanceStatus]
  );

  const maintenanceTrend = useMemo(
    () => {
      const trend = seriesByMonth(analytics.recentActivity.filter((row) => row.kind === "Maintenance").map((row) => row.when));
      return trend.length ? trend : noData;
    },
    [analytics.recentActivity]
  );

  const ticketTrend = useMemo(
    () => {
      const trend = seriesByMonth(analytics.recentActivity.filter((row) => row.kind === "Ticket").map((row) => row.when));
      return trend.length ? trend : noData;
    },
    [analytics.recentActivity]
  );

  const purchaseTrend = useMemo(
    () =>
      seriesByMonth(dataState.purchaseOrders.map((row) => row.created_at)).map((row) => ({
        ...row,
        spend: dataState.purchaseOrders
          .filter((po) => String(po.created_at || "").includes(splitHead(row.label, " ")))
          .reduce((sum, po) => sum + Number(po.total_amount || 0), 0),
      })),
    [dataState.purchaseOrders]
  );

  const employeeDeptSeries = useMemo(() => {
    const employees = analytics.recentActivity.filter((row) => row.kind === "Employee");
    return employees.length ? countBy(employees.map((row) => splitHead(row.detail, " • ") || "Unassigned")) : noData;
  }, [analytics.recentActivity]);

  const metrics = useMemo<MetricCard[]>(() => {
    const totalAssets = analytics.totalOfficeAssets;
    const assigned = analytics.assignedAssets;
    const available = analytics.availableAssets;
    const employees = analytics.employees;
    const openTickets = analytics.openTickets;
    const resolved = analytics.resolvedTickets;
    const maintenanceDue = analytics.maintenanceDue;
    const warrantyExpiring = analytics.warrantyExpiring;
    const criticalAssets = analytics.criticalIssues;
    const pendingApprovals = dataState.purchaseRequests.filter((row) => String(row.status || "").toLowerCase().includes("pending")).length;
    const purchaseOrders = dataState.purchaseOrders.length;
    const inventoryStock = available;

    return [
      {
        key: "totalAssets",
        label: "Total Assets",
        value: totalAssets,
        change: getTodayChange(analytics.recentActivity.filter((row) => row.kind === "Asset").map((row) => row.when)),
        progress: 100,
        href: OFFICE_ANALYTICS_METRICS["total-office-assets"].path,
        accent: "#2563eb",
        icon: <Package size={18} />,
        trend: analytics.assetGrowth.slice(-6),
      },
      {
        key: "assigned",
        label: "Assigned Assets",
        value: assigned,
        change: getTodayChange(analytics.recentActivity.filter((row) => row.kind === "Assignment").map((row) => row.when)),
        progress: safePercent(assigned, totalAssets),
        href: OFFICE_ANALYTICS_METRICS["assigned-assets"].path,
        accent: "#0ea5e9",
        icon: <ClipboardCheck size={18} />,
        trend: analytics.monthlyAssignments.slice(-6),
      },
      {
        key: "available",
        label: "Available Assets",
        value: available,
        change: 0,
        progress: safePercent(available, totalAssets),
        href: OFFICE_ANALYTICS_METRICS["available-assets"].path,
        accent: "#16a34a",
        icon: <BadgeCheck size={18} />,
        trend: analytics.assetGrowth.slice(-6),
      },
      {
        key: "employees",
        label: "Employees",
        value: employees,
        change: getTodayChange(analytics.recentActivity.filter((row) => row.kind === "Employee").map((row) => row.when)),
        progress: 100,
        href: OFFICE_ANALYTICS_METRICS.employees.path,
        accent: "#f59e0b",
        icon: <Users size={18} />,
        trend: seriesByMonth(analytics.recentActivity.filter((row) => row.kind === "Employee").map((row) => row.when)),
      },
      {
        key: "openTickets",
        label: "Open Tickets",
        value: openTickets,
        change: getTodayChange(analytics.recentActivity.filter((row) => row.kind === "Ticket").map((row) => row.when)),
        progress: safePercent(openTickets, openTickets + resolved),
        href: OFFICE_ANALYTICS_METRICS["open-tickets"].path,
        accent: "#ef4444",
        icon: <Ticket size={18} />,
        trend: seriesByMonth(analytics.recentActivity.filter((row) => row.kind === "Ticket").map((row) => row.when)),
      },
      {
        key: "resolvedTickets",
        label: "Resolved Tickets",
        value: resolved,
        change: 0,
        progress: safePercent(resolved, openTickets + resolved),
        href: OFFICE_ANALYTICS_METRICS["resolved-tickets"].path,
        accent: "#22c55e",
        icon: <CheckCircle2 size={18} />,
        trend: seriesByMonth(analytics.recentActivity.filter((row) => row.kind === "Ticket").map((row) => row.when)),
      },
      {
        key: "maintenance",
        label: "Maintenance Due",
        value: maintenanceDue,
        change: 0,
        progress: safePercent(maintenanceDue, Math.max(1, analytics.maintenanceStatus.reduce((sum, row) => sum + row.value, 0))),
        href: OFFICE_ANALYTICS_METRICS["maintenance-due"].path,
        accent: "#f97316",
        icon: <Wrench size={18} />,
        trend: seriesByMonth(analytics.recentActivity.filter((row) => row.kind === "Maintenance").map((row) => row.when)),
      },
      {
        key: "warranty",
        label: "Warranty Expiring",
        value: warrantyExpiring,
        change: 0,
        progress: safePercent(warrantyExpiring, totalAssets),
        href: OFFICE_ANALYTICS_METRICS["warranty-expiring"].path,
        accent: "#8b5cf6",
        icon: <ShieldCheck size={18} />,
        trend: analytics.warrantyForecast.slice(-6),
      },
      {
        key: "critical",
        label: "Critical Assets",
        value: criticalAssets,
        change: 0,
        progress: safePercent(criticalAssets, totalAssets),
        href: OFFICE_ANALYTICS_METRICS["critical-issues"].path,
        accent: "#dc2626",
        icon: <AlertTriangle size={18} />,
        trend: seriesByMonth(analytics.recentActivity.filter((row) => row.kind === "Ticket").map((row) => row.when)),
      },
      {
        key: "approvals",
        label: "Pending Approvals",
        value: pendingApprovals,
        change: getTodayChange(dataState.purchaseRequests.map((row) => row.created_at)),
        progress: safePercent(pendingApprovals, Math.max(1, dataState.purchaseRequests.length)),
        href: OFFICE_ANALYTICS_METRICS["open-tickets"].path,
        accent: "#c2410c",
        icon: <Clock3 size={18} />,
        trend: seriesByMonth(dataState.purchaseRequests.map((row) => row.created_at)),
      },
      {
        key: "po",
        label: "Purchase Orders",
        value: purchaseOrders,
        change: getTodayChange(dataState.purchaseOrders.map((row) => row.created_at)),
        progress: 100,
        href: OFFICE_ANALYTICS_METRICS["total-office-assets"].path,
        accent: "#0891b2",
        icon: <ShoppingCart size={18} />,
        trend: seriesByMonth(dataState.purchaseOrders.map((row) => row.created_at)),
      },
      {
        key: "stock",
        label: "Inventory Stock",
        value: inventoryStock,
        change: 0,
        progress: safePercent(inventoryStock, totalAssets),
        href: OFFICE_ANALYTICS_METRICS["available-assets"].path,
        accent: "#1d4ed8",
        icon: <HardDrive size={18} />,
        trend: analytics.assetGrowth.slice(-6),
      },
    ];
  }, [analytics, dataState.purchaseOrders, dataState.purchaseRequests]);

  const operationsWidgets = useMemo(() => {
    const pendingApprovalsRows = dataState.purchaseRequests
      .filter((row) => String(row.status || "").toLowerCase().includes("pending"))
      .slice(0, 6)
      .map((row) => ({
        label: `PR #${row.id}`,
        detail: `${row.status || "Pending"} • $${Math.round(Number(row.amount || 0)).toLocaleString()}`,
        when: row.created_at || "",
        kind: "Approval",
      }));

    const recentPurchasesRows = dataState.purchaseOrders.slice(0, 6).map((row) => ({
      label: row.vendor_name || `PO #${row.id}`,
      detail: `${row.status || "Created"} • $${Math.round(Number(row.total_amount || 0)).toLocaleString()}`,
      when: row.created_at || "",
      kind: "Purchase",
    }));

    const openTicketRows = analytics.recentActivity.filter((row) => row.kind === "Ticket").slice(0, 6);
    const assignedRows = analytics.recentActivity.filter((row) => row.kind === "Assignment").slice(0, 6);
    const awaitingReturnRows = assignedRows.map((row) => ({
      ...row,
      detail: `${row.detail} • Return tracking in progress`,
    }));
    const maintenanceRows = analytics.recentActivity.filter((row) => row.kind === "Maintenance").slice(0, 6);
    const warrantyRows = analytics.warrantyForecast.slice(0, 6).map((row) => ({
      label: row.label,
      detail: `${row.value} assets expiring`,
      when: row.label,
      kind: "Warranty",
    }));

    return [
      { title: "Recent Activity", rows: analytics.recentActivity.slice(0, 6) },
      { title: "Pending Approvals", rows: pendingApprovalsRows },
      { title: "Upcoming Maintenance", rows: maintenanceRows },
      { title: "Recent Purchases", rows: recentPurchasesRows },
      { title: "Open Tickets", rows: openTicketRows },
      { title: "Recently Assigned Assets", rows: assignedRows },
      { title: "Assets Awaiting Return", rows: awaitingReturnRows },
      { title: "Warranty Expiring Soon", rows: warrantyRows },
    ];
  }, [analytics.recentActivity, analytics.warrantyForecast, dataState.purchaseOrders, dataState.purchaseRequests]);

  const sectionTone = theme === "dark" ? dark : light;

  return (
    <div style={{ ...styles.page, ...sectionTone.page }}>
      <DashboardWidgetBoundary widgetName="Quick Action Bar">
      <section style={styles.quickActionBar}>
        {[
          { label: "Add Asset", href: "/office/assets/register" },
          { label: "Assign Asset", href: "/office/assignments" },
          { label: "Add Employee", href: "/office/employees" },
          { label: "Create Ticket", href: "/office/tickets" },
          { label: "Purchase Request", href: "/office/purchase-requests" },
          { label: "Export Report", href: "/office/reports/export" },
        ].map((action) => (
          <Link key={action.label} href={action.href} style={{ ...styles.quickButton, ...sectionTone.quickButton }}>
            {action.label}
          </Link>
        ))}
      </section>
      </DashboardWidgetBoundary>

      <DashboardWidgetBoundary widgetName="Executive KPI Cards">
      <section style={{ ...styles.kpiStickyWrap, ...sectionTone.kpiStickyWrap }}>
        <SectionTitle title="Executive KPI" subtitle="Core operational KPIs for daily office IT execution." />
        <div style={styles.kpiGrid}>
          {loading
            ? Array.from({ length: 12 }).map((_, idx) => <SkeletonCard key={`sk-${idx}`} />)
            : metrics.map((metric) => <KpiCard key={metric.key} metric={metric} theme={theme} />)}
        </div>
      </section>
      </DashboardWidgetBoundary>

      <DashboardWidgetBoundary widgetName="Analytics Section">
      <section style={styles.section}>
        <SectionTitle title="Analytics" subtitle="Charts-only analytics for asset, support, and procurement trends." />
        <div style={styles.chartGrid}>
          <ChartPanel title="Asset Growth" href={OFFICE_ANALYTICS_METRICS["total-office-assets"].path} hasData={analytics.assetGrowth.length > 0}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.assetGrowth.length ? analytics.assetGrowth : noData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#243244" : "#dbeafe"} />
                <XAxis dataKey="label" tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Asset Categories" href={OFFICE_ANALYTICS_METRICS["total-office-assets"].path} hasData={analytics.assetsByCategory.length > 0}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={analytics.assetsByCategory.length ? analytics.assetsByCategory : noData} dataKey="value" nameKey="label" innerRadius={48} outerRadius={90}>
                  {(analytics.assetsByCategory.length ? analytics.assetsByCategory : noData).map((entry, index) => (
                    <Cell key={`${entry.label}-${index}`} fill={palette[index % palette.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Asset Distribution by Department" href={OFFICE_ANALYTICS_METRICS["total-office-assets"].path} hasData={analytics.assetsByDepartment.length > 0}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.assetsByDepartment.length ? analytics.assetsByDepartment : noData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#243244" : "#dbeafe"} />
                <XAxis dataKey="label" tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} interval={0} angle={-15} textAnchor="end" height={58} />
                <YAxis allowDecimals={false} tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Ticket Trend" href={OFFICE_ANALYTICS_METRICS["open-tickets"].path} hasData={ticketTrend !== noData}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={ticketTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#243244" : "#dbeafe"} />
                <XAxis dataKey="label" tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Purchase Trend" href="/office/purchase-orders" hasData={purchaseTrend.length > 0}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={purchaseTrend.length ? purchaseTrend : noData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#243244" : "#dbeafe"} />
                <XAxis dataKey="label" tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0891b2" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Maintenance Trend" href={OFFICE_ANALYTICS_METRICS["maintenance-due"].path} hasData={maintenanceTrend !== noData}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={maintenanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#243244" : "#dbeafe"} />
                <XAxis dataKey="label" tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#f97316" fill="#fed7aa" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Warranty Expiry Timeline" href={OFFICE_ANALYTICS_METRICS["warranty-expiring"].path} hasData={analytics.warrantyForecast.length > 0}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.warrantyForecast.length ? analytics.warrantyForecast : noData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#243244" : "#dbeafe"} />
                <XAxis dataKey="label" tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Employee Distribution" href={OFFICE_ANALYTICS_METRICS.employees.path} hasData={employeeDeptSeries.length > 0}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={employeeDeptSeries.length ? employeeDeptSeries : noData} dataKey="value" nameKey="label" innerRadius={48} outerRadius={90}>
                  {(employeeDeptSeries.length ? employeeDeptSeries : noData).map((entry, index) => (
                    <Cell key={`emp-${entry.label}-${index}`} fill={palette[index % palette.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartPanel>
        </div>
      </section>
      </DashboardWidgetBoundary>

      <DashboardWidgetBoundary widgetName="Operations Section">
      <section style={styles.section}>
        <SectionTitle title="Operations" subtitle="Live operational widgets for approvals, assignments, purchases, and service work." />
        <div style={styles.grid4}>
          {operationsWidgets.map((panel) => (
            <MiniListCard key={panel.title} title={panel.title} rows={panel.rows} theme={theme} />
          ))}
        </div>
      </section>
      </DashboardWidgetBoundary>
    </div>
  );
}

function KpiCard({ metric, theme }: { metric: MetricCard; theme: UiTheme }) {
  const safeValue = Number.isFinite(metric.value) ? metric.value : 0;
  const safeTrend = Array.isArray(metric.trend) && metric.trend.length > 0 ? metric.trend : noData;
  const safeProgress = Number.isFinite(metric.progress) ? Math.max(0, Math.min(100, metric.progress)) : 0;
  return (
    <Link href={metric.href} style={{ ...styles.kpiCard, ...(theme === "dark" ? dark.kpiCard : light.kpiCard) }}>
      <div style={styles.kpiTop}>
        <span style={{ ...styles.kpiIcon, background: `${metric.accent}22`, color: metric.accent }}>{metric.icon}</span>
        <span style={styles.kpiChange}>{metric.change >= 0 ? `+${metric.change}` : metric.change} today</span>
      </div>
      <strong style={styles.kpiValue}>{safeValue.toLocaleString()}</strong>
      <p style={styles.kpiLabel}>{metric.label}</p>
      <div style={styles.sparklineWrap}>
        <ResponsiveContainer width="100%" height={38}>
          <LineChart data={safeTrend}>
            <Line type="monotone" dataKey="value" stroke={metric.accent} strokeWidth={2.2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={styles.progressTrack}>
        <span style={{ ...styles.progressFill, width: `${safeProgress}%`, background: metric.accent }} />
      </div>
    </Link>
  );
}

function ChartPanel({ title, href, hasData, children }: { title: string; href: string; hasData: boolean; children: ReactNode }) {
  return (
    <Link href={href} style={styles.chartCard}>
      <div style={styles.cardTitleRow}>
        <h3 style={styles.cardTitle}>{title}</h3>
        <span style={styles.kpiBadge}>Drill Down</span>
      </div>
      {hasData ? children : <div style={styles.chartEmpty}>No data available</div>}
    </Link>
  );
}

function MiniListCard({ title, rows, theme }: { title: string; rows: Array<{ label: string; detail: string; when: string; kind?: string }>; theme: UiTheme }) {
  return (
    <article style={{ ...styles.card, ...(theme === "dark" ? dark.card : light.card) }}>
      <div style={styles.cardTitleRow}>
        <h3 style={{ ...styles.cardTitle, ...(theme === "dark" ? dark.textStrong : light.textStrong) }}>{title}</h3>
        <span style={{ ...styles.kpiBadge, ...(theme === "dark" ? dark.pill : light.pill) }}>{rows.length} items</span>
      </div>
      <div style={styles.rowList}>
        {rows.length ? (
          rows.map((row, index) => (
            <div key={`${title}-${index}-${row.label}`} style={{ ...styles.rowItem, ...(theme === "dark" ? dark.rowItem : light.rowItem) }}>
              <div>
                <strong style={{ ...(theme === "dark" ? dark.textStrong : light.textStrong), fontSize: 13 }}>{row.label}</strong>
                <p style={{ margin: "6px 0 0", color: theme === "dark" ? "#9db0c2" : "#64748b", fontSize: 12 }}>{row.detail}</p>
              </div>
              <span style={styles.when}>{formatSafeDate(row.when)}</span>
            </div>
          ))
        ) : (
          <p style={{ margin: 0, color: theme === "dark" ? "#9db0c2" : "#64748b" }}>No activity available.</p>
        )}
      </div>
    </article>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={styles.sectionHeading}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <p style={styles.sectionSubtitle}>{subtitle}</p>
    </div>
  );
}

function SkeletonCard() {
  return <div style={styles.skeletonCard} />;
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
    alignItems: "start",
  },
  quickActionBar: {
    gridColumn: "1 / -1",
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  quickButton: {
    textDecoration: "none",
    padding: "8px 12px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid",
  },
  kpiStickyWrap: {
    gridColumn: "1 / -1",
    padding: 10,
    borderRadius: 16,
    border: "1px solid",
    display: "grid",
    gap: 10,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
  },
  kpiCard: {
    textDecoration: "none",
    borderRadius: 14,
    border: "1px solid",
    padding: 12,
    display: "grid",
    gap: 8,
    transition: "transform 180ms ease, box-shadow 180ms ease",
  },
  kpiTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  kpiIcon: { width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center" },
  kpiChange: { fontSize: 11, fontWeight: 800, color: "#0284c7" },
  kpiValue: { fontSize: 23, lineHeight: 1, color: "#0f172a" },
  kpiLabel: { margin: 0, fontSize: 12, color: "#64748b", fontWeight: 700 },
  sparklineWrap: { height: 40 },
  progressTrack: { height: 6, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, display: "block" },
  section: { gridColumn: "1 / -1", display: "grid", gap: 12 },
  sectionHeading: { display: "grid", gap: 3 },
  sectionTitle: { margin: 0, fontSize: 20, fontWeight: 900, color: "#0f172a" },
  sectionSubtitle: { margin: 0, color: "#64748b", fontSize: 13 },
  chartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
    gap: 12,
  },
  chartCard: {
    gridColumn: "span 6",
    textDecoration: "none",
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
    padding: 14,
    display: "grid",
    gap: 8,
  },
  grid4: { gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 },
  card: {
    borderRadius: 16,
    padding: 14,
    border: "1px solid",
    display: "grid",
    gap: 10,
  },
  cardTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  cardTitle: { margin: 0, color: "#0f172a", fontSize: 16, fontWeight: 900 },
  kpiBadge: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderRadius: 999,
    padding: "5px 8px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#0f172a",
  },
  rowList: { display: "grid", gap: 8 },
  rowItem: {
    borderRadius: 10,
    border: "1px solid",
    padding: "10px 10px",
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  when: { whiteSpace: "nowrap", color: "#0284c7", fontSize: 11, fontWeight: 800 },
  chartEmpty: {
    minHeight: 250,
    display: "grid",
    placeItems: "center",
    color: "#64748b",
    fontSize: 13,
    fontWeight: 700,
    border: "1px dashed #e2e8f0",
    borderRadius: 12,
    background: "#f8fafc",
  },
  skeletonCard: {
    borderRadius: 14,
    height: 146,
    background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)",
    backgroundSize: "200% 100%",
    animation: "pulse 1.4s ease-in-out infinite",
  },
};

const light = {
  page: { background: "transparent" },
  textStrong: { color: "#0f172a" },
  pill: { background: "#f8fafc", borderColor: "#e2e8f0", color: "#334155" },
  quickButton: { color: "#0f172a", background: "#ffffff", borderColor: "#e2e8f0" },
  kpiStickyWrap: { background: "#ffffff", borderColor: "#e2e8f0" },
  kpiCard: { background: "white", borderColor: "#e2e8f0", boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)" },
  card: { background: "#ffffff", borderColor: "#e2e8f0", boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)" },
  rowItem: { background: "#f8fafc", borderColor: "#e2e8f0" },
};

const dark = {
  page: { background: "transparent" },
  textStrong: { color: "#f5f7fb" },
  pill: { background: "#1e293b", borderColor: "#334155", color: "#e2e8f0" },
  quickButton: { color: "#dce7f4", background: "#1e293b", borderColor: "#334155" },
  kpiStickyWrap: { background: "#0f172a", borderColor: "#334155" },
  kpiCard: { background: "#111827", borderColor: "#334155", boxShadow: "0 10px 22px rgba(2, 6, 23, 0.28)" },
  card: { background: "#111827", borderColor: "#334155", boxShadow: "0 10px 22px rgba(2, 6, 23, 0.28)" },
  rowItem: { background: "#1e293b", borderColor: "#334155" },
};
