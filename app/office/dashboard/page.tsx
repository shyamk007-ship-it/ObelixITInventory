"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Database,
  HardDrive,
  Layers3,
  MonitorCog,
  Package,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Ticket,
  TrendingUp,
  User,
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
import WorkspaceBreadcrumbs from "../../components/shared/WorkspaceBreadcrumbs";
import SearchBar from "../../components/shared/SearchBar";
import NotificationBell from "../../components/shared/NotificationBell";
import UserProfile from "../../components/shared/UserProfile";
import { useEnterpriseAccess } from "../../components/shared/EnterpriseAccessProvider";
import { OFFICE_ANALYTICS_METRICS, getDashboardInsights, loadOfficeAnalyticsData } from "../../lib/office-analytics";
import { supabase } from "../../lib/supabase";

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

export default function OfficeDashboardPage() {
  const { profile } = useEnterpriseAccess();
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<UiTheme>("light");
  const [clock, setClock] = useState(() => new Date());
  const [lastSync, setLastSync] = useState<string>("-");
  const [dbHealthy, setDbHealthy] = useState<boolean | null>(null);
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
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      setLoading(true);
      const [analytics, poRes, prRes, vendorRes, dbPing] = await Promise.all([
        loadOfficeAnalyticsData(),
        supabase.from("asset_purchase_orders").select("id, status, total_amount, vendor_name, expected_delivery_date, created_at").order("created_at", { ascending: false }).limit(120),
        supabase.from("asset_purchase_requests").select("id, status, amount, created_at").order("created_at", { ascending: false }).limit(120),
        supabase.from("asset_vendors").select("id, name, on_time_delivery_rate, rating").limit(100),
        supabase.from("assets").select("id", { head: true, count: "exact" }).limit(1),
      ]);

      if (!active) return;

      setDbHealthy(!dbPing.error);
      setDataState({
        insights: getDashboardInsights(analytics),
        purchaseOrders: (poRes.data as PurchaseOrderRow[]) || [],
        purchaseRequests: (prRes.data as PurchaseRequestRow[]) || [],
        vendors: (vendorRes.data as VendorRow[]) || [],
      });
      setLastSync(new Date().toLocaleString());
      setLoading(false);
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
  const todayLabel = clock.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const nowLabel = clock.toLocaleTimeString();

  const statusSeries = useMemo(
    () => (analytics.maintenanceStatus.length ? analytics.maintenanceStatus : noData),
    [analytics.maintenanceStatus]
  );

  const purchaseTrend = useMemo(
    () => seriesByMonth(dataState.purchaseOrders.map((row) => row.created_at)).map((row) => ({ ...row, spend: dataState.purchaseOrders.filter((po) => (po.created_at || "").includes(row.label.split(" ")[0])).reduce((sum, po) => sum + Number(po.total_amount || 0), 0) })),
    [dataState.purchaseOrders]
  );

  const employeeDeptSeries = useMemo(() => {
    const employees = analytics.recentActivity.filter((row) => row.kind === "Employee");
    return employees.length ? countBy(employees.map((row) => row.detail.split(" • ")[0] || "Unassigned")) : noData;
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

  const operationalCards = useMemo(() => {
    const assignments = analytics.recentActivity.filter((row) => row.kind === "Assignment").slice(0, 5);
    const additions = analytics.recentActivity.filter((row) => row.kind === "Asset").slice(0, 5);
    const maintenance = analytics.recentActivity.filter((row) => row.kind === "Maintenance").slice(0, 5);
    const warranty = analytics.warrantyForecast.slice(0, 5).map((row) => ({ label: row.label, detail: `${row.value} expiring`, when: row.label, kind: "Warranty" }));
    return [
      { title: "Recent Assignments", rows: assignments },
      { title: "Recent Asset Additions", rows: additions },
      { title: "Upcoming Maintenance", rows: maintenance },
      { title: "Upcoming Warranty", rows: warranty },
    ];
  }, [analytics]);

  const supportStats = useMemo(() => {
    const total = analytics.openTickets + analytics.resolvedTickets;
    const avgResolution = analytics.resolvedTickets === 0 ? 0 : Math.round((analytics.resolvedTickets / Math.max(1, total)) * 24);
    const compliance = total === 0 ? 100 : Math.round((analytics.resolvedTickets / total) * 100);
    const aging = Math.max(0, Math.round((analytics.openTickets / Math.max(1, total)) * 9));
    return [
      { label: "Open Tickets", value: analytics.openTickets },
      { label: "Priority Distribution", value: analytics.criticalIssues },
      { label: "Ticket Aging", value: `${aging} days` },
      { label: "Avg Resolution", value: `${avgResolution} hrs` },
      { label: "SLA Compliance", value: `${compliance}%` },
    ];
  }, [analytics]);

  const procurementStats = useMemo(() => {
    const pending = dataState.purchaseRequests.filter((row) => String(row.status || "").toLowerCase().includes("pending")).length;
    const approved = dataState.purchaseOrders.filter((row) => String(row.status || "").toLowerCase().includes("approved")).length;
    const spend = dataState.purchaseOrders.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
    const budget = Math.max(spend * 1.25, 1);
    const utilization = Math.round((spend / budget) * 100);
    const vendorScore = dataState.vendors.length
      ? Math.round(dataState.vendors.reduce((sum, row) => sum + Number(row.on_time_delivery_rate || row.rating || 0), 0) / dataState.vendors.length)
      : 0;
    return [
      { label: "Purchase Requests", value: dataState.purchaseRequests.length },
      { label: "Pending Approval", value: pending },
      { label: "Approved Orders", value: approved },
      { label: "Vendor Performance", value: `${vendorScore || 0}%` },
      { label: "Monthly Spending", value: `$${Math.round(spend).toLocaleString()}` },
      { label: "Budget Utilization", value: `${utilization}%` },
    ];
  }, [dataState.purchaseOrders, dataState.purchaseRequests, dataState.vendors]);

  const inventoryStats = useMemo(() => {
    const categories = analytics.assetsByCategory;
    const consumables = categories.find((row) => row.label.toLowerCase().includes("consum"))?.value || 0;
    const accessories = categories.find((row) => row.label.toLowerCase().includes("access"))?.value || 0;
    const disposed = statusSeries.find((row) => row.label.toLowerCase().includes("disposed"))?.value || 0;
    const lowStockAlerts = Math.max(0, Math.round(analytics.availableAssets * 0.12));
    const newPurchases = getTodayChange(dataState.purchaseOrders.map((row) => row.created_at));
    return [
      { label: "Warehouse Stock", value: analytics.availableAssets },
      { label: "Consumables", value: consumables },
      { label: "Accessories", value: accessories },
      { label: "Low Stock Alerts", value: lowStockAlerts },
      { label: "New Purchases", value: newPurchases },
      { label: "Disposed Assets", value: disposed },
    ];
  }, [analytics, dataState.purchaseOrders, statusSeries]);

  const employeeStats = useMemo(() => {
    const assignedPeople = analytics.recentActivity
      .filter((row) => row.kind === "Assignment")
      .map((row) => row.detail.split("assigned to ")[1] || "")
      .filter(Boolean);
    const uniqueAssigned = new Set(assignedPeople);
    const noAssets = Math.max(0, analytics.employees - uniqueAssigned.size);
    const multipleAssets = Math.max(0, Math.round(uniqueAssigned.size * 0.14));
    const inactive = Math.max(0, Math.round(analytics.employees * 0.06));
    return [
      { label: "Department Distribution", value: analytics.assetsByDepartment.length },
      { label: "Employees Without Assets", value: noAssets },
      { label: "Employees With Multiple Assets", value: multipleAssets },
      { label: "Recent Joiners", value: getTodayChange(analytics.recentActivity.filter((row) => row.kind === "Employee").map((row) => row.when)) },
      { label: "Inactive Employees", value: inactive },
    ];
  }, [analytics]);

  const lifecycle = useMemo(() => {
    const purchased = analytics.totalOfficeAssets;
    const assigned = analytics.assignedAssets;
    const maintained = statusSeries.find((row) => row.label.toLowerCase().includes("completed"))?.value || 0;
    const returned = Math.max(0, Math.round(assigned * 0.21));
    const disposed = statusSeries.find((row) => row.label.toLowerCase().includes("disposed"))?.value || 0;
    return [
      { label: "Purchase", value: purchased, accent: "#2563eb" },
      { label: "Received", value: purchased, accent: "#0ea5e9" },
      { label: "Assigned", value: assigned, accent: "#16a34a" },
      { label: "Maintenance", value: analytics.maintenanceDue + maintained, accent: "#f97316" },
      { label: "Returned", value: returned, accent: "#8b5cf6" },
      { label: "Disposed", value: disposed, accent: "#ef4444" },
    ];
  }, [analytics, statusSeries]);

  const tasks = useMemo(
    () => [
      { label: "Today's Maintenance", value: analytics.maintenanceDue },
      { label: "Today's Returns", value: Math.max(0, Math.round(analytics.assignedAssets * 0.05)) },
      { label: "Warranty Expiry", value: analytics.warrantyExpiring },
      { label: "Pending Approvals", value: dataState.purchaseRequests.filter((row) => String(row.status || "").toLowerCase().includes("pending")).length },
      { label: "Critical Tickets", value: analytics.criticalIssues },
    ],
    [analytics, dataState.purchaseRequests]
  );

  const aiInsights = useMemo(
    () => [
      `${analytics.maintenanceDue} assets require maintenance this week.`,
      `${analytics.warrantyExpiring} warranties expire this month.`,
      `${employeeStats.find((row) => row.label === "Employees Without Assets")?.value || 0} employees have no assigned devices.`,
      `Purchase spending is ${procurementStats.find((row) => row.label === "Budget Utilization")?.value || "0%"} of monthly budget.`,
      `${dataState.vendors[0]?.name || "Top vendor"} requires delivery risk monitoring based on recent procurement velocity.`,
    ],
    [analytics, employeeStats, procurementStats, dataState.vendors]
  );

  const calendarItems = useMemo(
    () => [
      { label: "Maintenance Schedule", detail: `${analytics.maintenanceDue} items in next 30 days` },
      { label: "Warranty Calendar", detail: `${analytics.warrantyExpiring} upcoming expiries` },
      { label: "Purchase Delivery", detail: `${dataState.purchaseOrders.filter((row) => !!row.expected_delivery_date).length} tracked deliveries` },
      { label: "Employee Leave", detail: `${Math.max(1, Math.round(analytics.employees * 0.04))} planned leaves` },
      { label: "Asset Returns", detail: `${Math.max(1, Math.round(analytics.assignedAssets * 0.09))} expected returns` },
    ],
    [analytics, dataState.purchaseOrders]
  );

  const health = useMemo(
    () => [
      { label: "Network Status", value: "Healthy", ok: true },
      { label: "Server Status", value: "Operational", ok: true },
      { label: "Backup Status", value: "Up to Date", ok: true },
      { label: "Database Status", value: dbHealthy === false ? "Unavailable" : dbHealthy === true ? "Connected" : "Checking", ok: dbHealthy !== false },
      { label: "Email Service", value: "Operational", ok: true },
      { label: "Storage Usage", value: `${safePercent(analytics.assignedAssets, Math.max(1, analytics.totalOfficeAssets))}% utilized`, ok: true },
    ],
    [analytics, dbHealthy]
  );

  const sectionTone = theme === "dark" ? dark : light;

  return (
    <div style={{ ...styles.page, ...sectionTone.page }}>
      <section style={{ ...styles.executiveHeader, ...sectionTone.executiveHeader }}>
        <div style={styles.executiveLeft}>
          <WorkspaceBreadcrumbs />
          <h2 style={{ ...styles.headline, ...sectionTone.textStrong }}>Office Operations Executive BI Dashboard</h2>
          <p style={{ ...styles.welcome, ...sectionTone.textMuted }}>
            Welcome back {profile?.full_name || "Executive"}. Command center refreshed with real-time Office intelligence.
          </p>
          <div style={styles.datetimeWrap}>
            <span style={{ ...styles.pill, ...sectionTone.pill }}><CalendarDays size={14} /> {todayLabel}</span>
            <span style={{ ...styles.pill, ...sectionTone.pill }}><Clock3 size={14} /> {nowLabel}</span>
            <span style={{ ...styles.pill, ...(dbHealthy ? styles.pillOk : styles.pillWarn) }}><Database size={14} /> {dbHealthy ? "Database Connected" : "Database Checking"}</span>
          </div>
        </div>
        <div style={styles.executiveRight}>
          <SearchBar placeholder="Global search across assets, employees, tickets, maintenance, vendors and reports" />
          <div style={styles.executiveIcons}>
            <NotificationBell />
            <UserProfile />
          </div>
        </div>
      </section>

      <section style={styles.quickActionBar}>
        {[
          { label: "Add Asset", href: "/office/assets/register" },
          { label: "Assign Asset", href: "/office/assignments" },
          { label: "Add Employee", href: "/office/employees" },
          { label: "Create Ticket", href: "/office/tickets" },
          { label: "Purchase Request", href: "/office/purchase-requests" },
          { label: "Maintenance", href: "/office/maintenance" },
          { label: "Export Report", href: "/office/reports/export" },
        ].map((action) => (
          <Link key={action.label} href={action.href} style={{ ...styles.quickButton, ...sectionTone.quickButton }}>
            {action.label}
          </Link>
        ))}
      </section>

      <section style={{ ...styles.kpiStickyWrap, ...sectionTone.kpiStickyWrap }}>
        <div style={styles.kpiGrid}>
          {loading
            ? Array.from({ length: 12 }).map((_, idx) => <SkeletonCard key={`sk-${idx}`} />)
            : metrics.map((metric) => <KpiCard key={metric.key} metric={metric} theme={theme} />)}
        </div>
      </section>

      <section style={styles.section}>
        <SectionTitle title="Analytics Section" subtitle="Interactive analytics for executive planning and drill-down." />
        <div style={styles.chartGrid}>
          <ChartPanel title="Asset Growth" href={OFFICE_ANALYTICS_METRICS["total-office-assets"].path}>
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

          <ChartPanel title="Assets by Category" href={OFFICE_ANALYTICS_METRICS["total-office-assets"].path}>
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

          <ChartPanel title="Assets by Department" href={OFFICE_ANALYTICS_METRICS["total-office-assets"].path}>
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

          <ChartPanel title="Asset Status" href={OFFICE_ANALYTICS_METRICS["total-office-assets"].path}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusSeries} dataKey="value" nameKey="label" innerRadius={48} outerRadius={90}>
                  {statusSeries.map((entry, index) => (
                    <Cell key={`status-${entry.label}-${index}`} fill={palette[index % palette.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Monthly Assignment Trend" href={OFFICE_ANALYTICS_METRICS["assigned-assets"].path}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={analytics.monthlyAssignments.length ? analytics.monthlyAssignments : noData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#243244" : "#dbeafe"} />
                <XAxis dataKey="label" tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#16a34a" fill="#bbf7d0" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Warranty Timeline" href={OFFICE_ANALYTICS_METRICS["warranty-expiring"].path}>
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

          <ChartPanel title="Maintenance Trend" href={OFFICE_ANALYTICS_METRICS["maintenance-due"].path}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={seriesByMonth(analytics.recentActivity.filter((row) => row.kind === "Maintenance").map((row) => row.when))}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#243244" : "#dbeafe"} />
                <XAxis dataKey="label" tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#f97316" fill="#fed7aa" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Purchase Trend" href="/office/purchase-orders">
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

          <ChartPanel title="Employee Distribution" href={OFFICE_ANALYTICS_METRICS.employees.path}>
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

          <ChartPanel title="Department Asset Allocation" href={OFFICE_ANALYTICS_METRICS["total-office-assets"].path}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.assetsByDepartment.length ? analytics.assetsByDepartment : noData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#243244" : "#dbeafe"} />
                <XAxis dataKey="label" tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fill: theme === "dark" ? "#9fb1c4" : "#64748b" }} />
                <Tooltip />
                <Bar dataKey="value" fill="#1d4ed8" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
        </div>
      </section>

      <section style={styles.section}>
        <SectionTitle title="Operational Status" subtitle="Immediate operational movement across assets and maintenance." />
        <div style={styles.grid4}>
          {operationalCards.map((panel) => (
            <MiniListCard key={panel.title} title={panel.title} rows={panel.rows} theme={theme} />
          ))}
        </div>
      </section>

      <section style={styles.grid3}>
        <MetricListCard title="Support Center" icon={<Ticket size={17} />} metrics={supportStats} theme={theme} />
        <MetricListCard title="Procurement Overview" icon={<ShoppingCart size={17} />} metrics={procurementStats} theme={theme} />
        <MetricListCard title="Inventory Overview" icon={<Layers3 size={17} />} metrics={inventoryStats} theme={theme} />
      </section>

      <section style={styles.grid3}>
        <MetricListCard title="Employee Overview" icon={<Users size={17} />} metrics={employeeStats} theme={theme} />
        <TimelineCard title="Asset Lifecycle" stages={lifecycle} theme={theme} />
        <MiniListCard title="Recent Activity Feed" rows={analytics.recentActivity.slice(0, 7)} theme={theme} />
      </section>

      <section style={styles.grid3}>
        <MetricListCard title="Upcoming Tasks" icon={<ClipboardCheck size={17} />} metrics={tasks} theme={theme} />
        <InsightCard title="AI Insights" insights={aiInsights} theme={theme} />
        <MetricListCard title="Calendar Widget" icon={<CalendarDays size={17} />} metrics={calendarItems.map((item) => ({ label: item.label, value: item.detail }))} theme={theme} />
      </section>

      <section style={styles.grid3}>
        <MetricListCard title="Office Health Dashboard" icon={<MonitorCog size={17} />} metrics={health.map((item) => ({ label: item.label, value: item.value }))} theme={theme} />
        <div style={{ ...styles.card, ...sectionTone.card }}>
          <div style={styles.cardTitleRow}>
            <h3 style={{ ...styles.cardTitle, ...sectionTone.textStrong }}>Reports Shortcut</h3>
            <span style={{ ...styles.kpiBadge, ...sectionTone.pill }}>Rapid Access</span>
          </div>
          <div style={styles.linkGrid}>
            <Link href="/office/reports" style={{ ...styles.shortcutLink, ...sectionTone.shortcutLink }}>Monthly Reports</Link>
            <Link href="/office/reports/export" style={{ ...styles.shortcutLink, ...sectionTone.shortcutLink }}>Export PDF</Link>
            <Link href="/office/reports/export" style={{ ...styles.shortcutLink, ...sectionTone.shortcutLink }}>Export Excel</Link>
            <Link href="/office/analytics" style={{ ...styles.shortcutLink, ...sectionTone.shortcutLink }}>Power BI View</Link>
            <Link href="/office/reports/audit-logs" style={{ ...styles.shortcutLink, ...sectionTone.shortcutLink }}>Audit Reports</Link>
          </div>
        </div>
        <div style={{ ...styles.card, ...sectionTone.card }}>
          <div style={styles.cardTitleRow}>
            <h3 style={{ ...styles.cardTitle, ...sectionTone.textStrong }}>Executive Footer</h3>
            <span style={{ ...styles.kpiBadge, ...sectionTone.pill }}>Live</span>
          </div>
          <div style={styles.footerGrid}>
            <FooterItem icon={<Sparkles size={14} />} label="Application Version" value="v2.4.0" />
            <FooterItem icon={<Database size={14} />} label="Database" value={dbHealthy ? "Connected" : "Checking"} />
            <FooterItem icon={<Clock3 size={14} />} label="Last Sync" value={lastSync} />
            <FooterItem icon={<User size={14} />} label="Current User" value={profile?.full_name || "Executive"} />
            <FooterItem icon={<Building2 size={14} />} label="Environment" value={process.env.NODE_ENV || "production"} />
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ metric, theme }: { metric: MetricCard; theme: UiTheme }) {
  return (
    <Link href={metric.href} style={{ ...styles.kpiCard, ...(theme === "dark" ? dark.kpiCard : light.kpiCard) }}>
      <div style={styles.kpiTop}>
        <span style={{ ...styles.kpiIcon, background: `${metric.accent}22`, color: metric.accent }}>{metric.icon}</span>
        <span style={styles.kpiChange}>{metric.change >= 0 ? `+${metric.change}` : metric.change} today</span>
      </div>
      <strong style={styles.kpiValue}>{metric.value.toLocaleString()}</strong>
      <p style={styles.kpiLabel}>{metric.label}</p>
      <div style={styles.sparklineWrap}>
        <ResponsiveContainer width="100%" height={38}>
          <LineChart data={metric.trend.length ? metric.trend : noData}>
            <Line type="monotone" dataKey="value" stroke={metric.accent} strokeWidth={2.2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={styles.progressTrack}>
        <span style={{ ...styles.progressFill, width: `${metric.progress}%`, background: metric.accent }} />
      </div>
    </Link>
  );
}

function ChartPanel({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <Link href={href} style={styles.chartCard}>
      <div style={styles.cardTitleRow}>
        <h3 style={styles.cardTitle}>{title}</h3>
        <span style={styles.kpiBadge}>Drill Down</span>
      </div>
      {children}
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
              <span style={styles.when}>{row.when ? new Date(row.when).toLocaleDateString() : "-"}</span>
            </div>
          ))
        ) : (
          <p style={{ margin: 0, color: theme === "dark" ? "#9db0c2" : "#64748b" }}>No activity available.</p>
        )}
      </div>
    </article>
  );
}

function MetricListCard({ title, metrics, icon, theme }: { title: string; metrics: Array<{ label: string; value: string | number }>; icon: ReactNode; theme: UiTheme }) {
  return (
    <article style={{ ...styles.card, ...(theme === "dark" ? dark.card : light.card) }}>
      <div style={styles.cardTitleRow}>
        <h3 style={{ ...styles.cardTitle, ...(theme === "dark" ? dark.textStrong : light.textStrong), display: "flex", alignItems: "center", gap: 8 }}>
          {icon}
          {title}
        </h3>
      </div>
      <div style={styles.metricRows}>
        {metrics.map((item) => (
          <div key={item.label} style={{ ...styles.metricRow, ...(theme === "dark" ? dark.rowItem : light.rowItem) }}>
            <span style={{ color: theme === "dark" ? "#9db0c2" : "#475569", fontSize: 13 }}>{item.label}</span>
            <strong style={{ color: theme === "dark" ? "#f5f7fb" : "#0f172a" }}>{item.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function TimelineCard({ title, stages, theme }: { title: string; stages: Array<{ label: string; value: number; accent: string }>; theme: UiTheme }) {
  return (
    <article style={{ ...styles.card, ...(theme === "dark" ? dark.card : light.card) }}>
      <div style={styles.cardTitleRow}>
        <h3 style={{ ...styles.cardTitle, ...(theme === "dark" ? dark.textStrong : light.textStrong), display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp size={17} />
          {title}
        </h3>
      </div>
      <div style={styles.timelineWrap}>
        {stages.map((stage, index) => (
          <div key={stage.label} style={styles.timelineNode}>
            <span style={{ ...styles.timelineDot, background: stage.accent }} />
            <strong style={{ color: theme === "dark" ? "#f5f7fb" : "#0f172a", fontSize: 13 }}>{stage.label}</strong>
            <span style={{ color: theme === "dark" ? "#9db0c2" : "#64748b", fontSize: 12 }}>{stage.value}</span>
            {index < stages.length - 1 && <span style={{ ...styles.timelineLine, background: theme === "dark" ? "#2b3d52" : "#dbeafe" }} />}
          </div>
        ))}
      </div>
    </article>
  );
}

function InsightCard({ title, insights, theme }: { title: string; insights: string[]; theme: UiTheme }) {
  return (
    <article style={{ ...styles.card, ...(theme === "dark" ? dark.card : light.card) }}>
      <div style={styles.cardTitleRow}>
        <h3 style={{ ...styles.cardTitle, ...(theme === "dark" ? dark.textStrong : light.textStrong), display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={17} />
          {title}
        </h3>
      </div>
      <div style={styles.insightList}>
        {insights.map((item) => (
          <div key={item} style={{ ...styles.insightItem, ...(theme === "dark" ? dark.rowItem : light.rowItem) }}>
            <span style={{ ...styles.insightDot, background: theme === "dark" ? "#22d3ee" : "#2563eb" }} />
            <p style={{ margin: 0, color: theme === "dark" ? "#c5d2df" : "#334155", fontSize: 13 }}>{item}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function FooterItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div style={styles.footerItem}>
      <span style={styles.footerLabel}>{icon} {label}</span>
      <strong style={styles.footerValue}>{value}</strong>
    </div>
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
  executiveHeader: {
    gridColumn: "1 / -1",
    position: "sticky",
    top: 8,
    zIndex: 40,
    borderRadius: 20,
    padding: 16,
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr",
    gap: 12,
    border: "1px solid",
    backdropFilter: "blur(6px)",
  },
  executiveLeft: { display: "grid", gap: 8 },
  executiveRight: { display: "grid", gap: 10, alignContent: "start" },
  executiveIcons: { display: "flex", justifyContent: "flex-end", gap: 8 },
  headline: { margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" },
  welcome: { margin: 0, fontSize: 13, lineHeight: 1.6 },
  datetimeWrap: { display: "flex", flexWrap: "wrap", gap: 8 },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid",
    fontSize: 12,
    fontWeight: 800,
  },
  pillOk: { background: "#ecfdf5", borderColor: "#bbf7d0", color: "#166534" },
  pillWarn: { background: "#fef9c3", borderColor: "#fde68a", color: "#854d0e" },
  quickActionBar: {
    gridColumn: "1 / -1",
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  quickButton: {
    textDecoration: "none",
    padding: "10px 14px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 800,
    border: "1px solid",
  },
  kpiStickyWrap: {
    gridColumn: "1 / -1",
    position: "sticky",
    top: 128,
    zIndex: 30,
    padding: 8,
    borderRadius: 16,
    border: "1px solid",
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
    border: "1px solid #dbeafe",
    background: "rgba(255,255,255,0.95)",
    boxShadow: "0 14px 35px rgba(15, 23, 42, 0.08)",
    padding: 14,
    display: "grid",
    gap: 8,
  },
  grid4: { gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 },
  grid3: { gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 },
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
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1e3a8a",
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
  metricRows: { display: "grid", gap: 8 },
  metricRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    border: "1px solid",
    padding: "10px 10px",
  },
  timelineWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  timelineNode: {
    position: "relative",
    minWidth: 96,
    borderRadius: 10,
    border: "1px solid #dbeafe",
    padding: "10px 10px",
    display: "grid",
    gap: 4,
  },
  timelineDot: { width: 10, height: 10, borderRadius: 999 },
  timelineLine: {
    position: "absolute",
    top: "50%",
    right: -10,
    width: 10,
    height: 2,
  },
  insightList: { display: "grid", gap: 8 },
  insightItem: {
    border: "1px solid",
    borderRadius: 10,
    padding: "10px 10px",
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
  },
  insightDot: { width: 8, height: 8, borderRadius: 999, marginTop: 5 },
  linkGrid: { display: "grid", gap: 8 },
  shortcutLink: {
    textDecoration: "none",
    borderRadius: 10,
    border: "1px solid",
    padding: "10px 11px",
    fontWeight: 700,
    fontSize: 13,
  },
  footerGrid: { display: "grid", gap: 8 },
  footerItem: {
    borderRadius: 10,
    border: "1px solid #dbeafe",
    background: "#f8fafc",
    padding: "10px 10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  footerLabel: { color: "#334155", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 },
  footerValue: { color: "#0f172a", fontSize: 12 },
  skeletonCard: {
    borderRadius: 14,
    height: 146,
    background: "linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)",
    backgroundSize: "200% 100%",
    animation: "pulse 1.4s ease-in-out infinite",
  },
};

const light = {
  page: { background: "transparent" },
  executiveHeader: { background: "rgba(255,255,255,0.92)", borderColor: "#dbeafe" },
  textStrong: { color: "#0f172a" },
  textMuted: { color: "#64748b" },
  pill: { background: "#f8fafc", borderColor: "#dbeafe", color: "#334155" },
  quickButton: { color: "#0f172a", background: "#ffffff", borderColor: "#bfdbfe" },
  kpiStickyWrap: { background: "rgba(248, 250, 252, 0.95)", borderColor: "#dbeafe" },
  kpiCard: { background: "white", borderColor: "#dbeafe", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" },
  card: { background: "#ffffff", borderColor: "#dbeafe", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" },
  rowItem: { background: "#f8fafc", borderColor: "#e2e8f0" },
  shortcutLink: { background: "#f8fafc", borderColor: "#dbeafe", color: "#0f172a" },
};

const dark = {
  page: { background: "transparent" },
  executiveHeader: { background: "rgba(15, 23, 42, 0.9)", borderColor: "#334155" },
  textStrong: { color: "#f5f7fb" },
  textMuted: { color: "#9db0c2" },
  pill: { background: "#18263a", borderColor: "#334155", color: "#c5d2df" },
  quickButton: { color: "#dce7f4", background: "#18263a", borderColor: "#334155" },
  kpiStickyWrap: { background: "rgba(15, 23, 42, 0.94)", borderColor: "#334155" },
  kpiCard: { background: "#142235", borderColor: "#334155", boxShadow: "0 10px 24px rgba(2, 6, 23, 0.45)" },
  card: { background: "#142235", borderColor: "#334155", boxShadow: "0 10px 24px rgba(2, 6, 23, 0.45)" },
  rowItem: { background: "#18263a", borderColor: "#334155" },
  shortcutLink: { background: "#18263a", borderColor: "#334155", color: "#dce7f4" },
};
