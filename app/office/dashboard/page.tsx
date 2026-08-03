"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
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
import { supabase } from "../../lib/supabase";
import OfficeStats from "../../components/office/OfficeStats";
import OfficeQuickActions from "../../components/office/OfficeQuickActions";
import OfficeWidgets from "../../components/office/OfficeWidgets";

interface AssetRow {
  id: number;
  asset_name: string;
  category?: string | null;
  status?: string | null;
  purchase_date?: string | null;
  warranty_expiry?: string | null;
  currently_assigned_to?: number | null;
}

interface EmployeeRow {
  id: number;
}

interface TicketRow {
  status?: string | null;
  priority?: string | null;
  created_at?: string | null;
}

interface MaintenanceRow {
  id: number;
  asset_id: number;
  status?: string | null;
  maintenance_date?: string | null;
  maintenance_cost?: number | null;
}

interface AssignmentRow {
  id: number;
  status?: string | null;
  assigned_date?: string | null;
  actual_return_date?: string | null;
}

interface ActivityRow {
  id: number;
  action?: string | null;
  description?: string | null;
  created_at?: string | null;
}

const chartColors = ["#1d4ed8", "#2563eb", "#38bdf8", "#0f766e", "#14b8a6", "#06b6d4"];

export default function OfficeDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [maintenanceRows, setMaintenanceRows] = useState<MaintenanceRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [assetResponse, employeeResponse, ticketResponse, maintenanceResponse, assignmentResponse, activityResponse] =
        await Promise.all([
          supabase
            .from("assets")
            .select("id, asset_name, category, status, purchase_date, warranty_expiry, currently_assigned_to")
            .is("vessel_id", null)
            .order("created_at", { ascending: false }),
          supabase.from("employees").select("id").order("created_at", { ascending: false }),
          supabase
            .from("tickets")
            .select("status, priority, created_at")
            .is("vessel_id", null)
            .order("created_at", { ascending: false }),
          supabase.from("asset_maintenance").select("id, asset_id, status, maintenance_date, maintenance_cost").order("maintenance_date", { ascending: false }),
          supabase.from("assignment_records").select("id, status, assigned_date, actual_return_date").order("assigned_date", { ascending: false }),
          supabase.from("activity_logs").select("id, action, description, created_at").order("created_at", { ascending: false }).limit(20),
        ]);

      setAssets((assetResponse.data as AssetRow[]) || []);
      setEmployees((employeeResponse.data as EmployeeRow[]) || []);
      setTickets((ticketResponse.data as TicketRow[]) || []);
      setMaintenanceRows((maintenanceResponse.data as MaintenanceRow[]) || []);
      setAssignments((assignmentResponse.data as AssignmentRow[]) || []);
      setActivityRows((activityResponse.data as ActivityRow[]) || []);
      setLoading(false);
    };

    void load();
  }, []);

  const now = Date.now();

  const stats = useMemo(() => {
    const totalOfficeAssets = assets.length;
    const assignedAssets = assets.filter((asset) => asset.status === "Assigned" || asset.currently_assigned_to !== null).length;
    const availableAssets = assets.filter((asset) => (asset.status || "").toLowerCase() === "available").length;
    const employeeCount = employees.length;
    const openTickets = tickets.filter((ticket) => (ticket.status || "").toLowerCase() === "open").length;
    const resolvedTickets = tickets.filter((ticket) => (ticket.status || "").toLowerCase() === "resolved").length;
    const criticalIssues = tickets.filter((ticket) => (ticket.priority || "").toLowerCase() === "critical").length;
    const warrantyExpiring = assets.filter((asset) => {
      if (!asset.warranty_expiry) return false;
      const deltaDays = (new Date(asset.warranty_expiry).getTime() - now) / (1000 * 60 * 60 * 24);
      return deltaDays >= 0 && deltaDays <= 30;
    }).length;
    const maintenanceDue = maintenanceRows.filter((row) => {
      if (!row.maintenance_date) return false;
      const deltaDays = (new Date(row.maintenance_date).getTime() - now) / (1000 * 60 * 60 * 24);
      return (row.status || "").toLowerCase() === "pending" && deltaDays >= 0 && deltaDays <= 30;
    }).length;

    return {
      totalOfficeAssets,
      assignedAssets,
      availableAssets,
      employees: employeeCount,
      openTickets,
      resolvedTickets,
      criticalIssues,
      warrantyExpiring,
      maintenanceDue,
    };
  }, [assets, employees.length, maintenanceRows, now, tickets]);

  const widgets = useMemo(() => {
    const assignedAssets = assets.filter((asset) => asset.status === "Assigned" || asset.currently_assigned_to !== null).length;
    const availableAssets = assets.filter((asset) => (asset.status || "").toLowerCase() === "available").length;
    const activeEmployees = employees.length;
    const openTickets = tickets.filter((ticket) => (ticket.status || "").toLowerCase() === "open").length;
    const maintenanceDue = maintenanceRows.filter((row) => {
      if (!row.maintenance_date) return false;
      const deltaDays = (new Date(row.maintenance_date).getTime() - now) / (1000 * 60 * 60 * 24);
      return (row.status || "").toLowerCase() === "pending" && deltaDays >= 0 && deltaDays <= 30;
    }).length;

    return {
      assetOverview: `${assignedAssets} assigned, ${availableAssets} available`,
      employeeSummary: `${activeEmployees} active employees tracked`,
      supportTickets: `${openTickets} open tickets currently in queue`,
      networkStatus: "Office infrastructure under active monitoring",
      recentActivity: `${activityRows.length} recent activity events`,
      upcomingMaintenance: `${maintenanceDue} maintenance items due soon`,
    };
  }, [activityRows.length, assets, employees.length, maintenanceRows, now, tickets]);

  const assetsByCategory = useMemo(() => {
    const bucket = new Map<string, number>();
    assets.forEach((asset) => {
      const key = asset.category || "Uncategorized";
      bucket.set(key, (bucket.get(key) || 0) + 1);
    });
    return Array.from(bucket.entries()).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const assetStatusData = useMemo(() => {
    const bucket = new Map<string, number>();
    assets.forEach((asset) => {
      const key = asset.status || "Unknown";
      bucket.set(key, (bucket.get(key) || 0) + 1);
    });
    return Array.from(bucket.entries()).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const assignmentTrend = useMemo(() => {
    const bucket = new Map<string, number>();
    assignments.forEach((row) => {
      if (!row.assigned_date) return;
      const key = new Date(row.assigned_date).toLocaleString("default", { month: "short", year: "numeric" });
      bucket.set(key, (bucket.get(key) || 0) + 1);
    });
    return Array.from(bucket.entries()).map(([month, count]) => ({ month, count }));
  }, [assignments]);

  const ticketStatusData = useMemo(() => {
    const bucket = new Map<string, number>();
    tickets.forEach((ticket) => {
      const key = ticket.status || "Unknown";
      bucket.set(key, (bucket.get(key) || 0) + 1);
    });
    return Array.from(bucket.entries()).map(([name, value]) => ({ name, value }));
  }, [tickets]);

  const recentAssignments = assignments.slice(0, 5);
  const recentMaintenance = maintenanceRows.slice(0, 5);
  const recentTickets = tickets.slice(0, 5);
  const recentEmployeeActivity = activityRows.filter((row) => {
    const action = (row.action || "").toLowerCase();
    return action.includes("employee") || action.includes("user") || action.includes("login") || action.includes("logout");
  }).slice(0, 5);

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Office Workspace</p>
          <h2 style={styles.title}>Enterprise IT Asset Management Portal</h2>
          <p style={styles.subtitle}>
            Manage office assets, employees, support operations, maintenance, and monitoring in a single workspace.
          </p>
        </div>
        <div style={styles.actions}>
          <Link href="/office/assets/register" style={styles.primaryButton}>
            Add Asset
          </Link>
          <Link href="/office/employees" style={styles.secondaryButton}>
            Add Employee
          </Link>
          <Link href="/office/assets/assignments" style={styles.secondaryButton}>
            Assign Asset
          </Link>
          <Link href="/office/tickets" style={styles.secondaryButton}>
            Create Ticket
          </Link>
        </div>
      </section>

      <OfficeStats
        totalOfficeAssets={stats.totalOfficeAssets}
        assignedAssets={stats.assignedAssets}
        availableAssets={stats.availableAssets}
        employees={stats.employees}
        openTickets={stats.openTickets}
        resolvedTickets={stats.resolvedTickets}
        criticalIssues={stats.criticalIssues}
        maintenanceDue={stats.maintenanceDue}
        warrantyExpiring={stats.warrantyExpiring}
      />

      <OfficeWidgets {...widgets} />

      {loading ? (
        <section style={styles.loadingCard}>Loading office dashboard...</section>
      ) : (
        <>
          <section style={styles.chartGrid}>
            <ChartCard title="Assets by Category">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={assetsByCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={95} paddingAngle={3}>
                    {assetsByCategory.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Asset Status">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={assetStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Assignment Trend">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={assignmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Ticket Status">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={ticketStatusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={92} paddingAngle={3}>
                    {ticketStatusData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={chartColors[(index + 2) % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>

          <section style={styles.activityGrid}>
            <ActivityCard title="Recent Asset Assignments" rows={recentAssignments.map((row) => ({
              primary: `Assignment #${row.id}`,
              secondary: row.status || "Assigned",
              detail: row.assigned_date ? new Date(row.assigned_date).toLocaleDateString() : "No date",
            }))} />
            <ActivityCard title="Recent Employee Activity" rows={recentEmployeeActivity.map((row) => ({
              primary: row.action || "Activity",
              secondary: row.description || "Employee event",
              detail: row.created_at ? new Date(row.created_at).toLocaleString() : "",
            }))} />
            <ActivityCard title="Recent Tickets" rows={recentTickets.map((row, index) => ({
              primary: `Ticket ${index + 1}`,
              secondary: row.status || "Open",
              detail: row.priority || "Normal",
            }))} />
            <ActivityCard title="Recent Maintenance" rows={recentMaintenance.map((row) => ({
              primary: `Maintenance #${row.id}`,
              secondary: row.status || "Scheduled",
              detail: row.maintenance_date ? new Date(row.maintenance_date).toLocaleDateString() : "Pending",
            }))} />
          </section>

          <section style={styles.quickLinks}>
            <Link href="/office/assets" style={styles.quickLinkCard}>
              <span style={styles.quickLabel}>Asset Management</span>
              <strong style={styles.quickValue}>Open the full office asset workspace</strong>
            </Link>
            <Link href="/office/reports" style={styles.quickLinkCard}>
              <span style={styles.quickLabel}>Reports</span>
              <strong style={styles.quickValue}>Export assets, employees, tickets, and maintenance data</strong>
            </Link>
            <Link href="/office/settings" style={styles.quickLinkCard}>
              <span style={styles.quickLabel}>Administration</span>
              <strong style={styles.quickValue}>Tune departments, locations, notifications, and audit rules</strong>
            </Link>
          </section>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article style={styles.card}>
      <h3 style={styles.cardTitle}>{title}</h3>
      {children}
    </article>
  );
}

function ActivityCard({ title, rows }: { title: string; rows: Array<{ primary: string; secondary: string; detail: string }> }) {
  return (
    <article style={styles.card}>
      <h3 style={styles.cardTitle}>{title}</h3>
      <div style={styles.activityList}>
        {rows.length === 0 ? (
          <p style={styles.empty}>No recent items.</p>
        ) : (
          rows.map((row, index) => (
            <div key={`${title}-${index}-${row.primary}`} style={styles.activityRow}>
              <div>
                <strong style={styles.activityPrimary}>{row.primary}</strong>
                <p style={styles.activitySecondary}>{row.secondary}</p>
              </div>
              <span style={styles.activityDetail}>{row.detail}</span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: "grid",
    gap: 18,
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    padding: 22,
    borderRadius: 24,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.96) 100%)",
    border: "1px solid rgba(191, 219, 254, 0.9)",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
  },
  eyebrow: {
    margin: 0,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    fontSize: 11,
    fontWeight: 800,
  },
  title: {
    margin: "10px 0 0",
    color: "#0f172a",
    fontSize: 32,
    fontWeight: 900,
    letterSpacing: "-0.03em",
    maxWidth: 820,
  },
  subtitle: {
    margin: "10px 0 0",
    color: "#64748b",
    lineHeight: 1.65,
    maxWidth: 780,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "flex-start",
    justifyContent: "flex-end",
  },
  primaryButton: {
    textDecoration: "none",
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "white",
    padding: "12px 16px",
    borderRadius: 14,
    fontWeight: 800,
    boxShadow: "0 16px 30px rgba(37, 99, 235, 0.24)",
  },
  secondaryButton: {
    textDecoration: "none",
    background: "rgba(255,255,255,0.92)",
    color: "#0f172a",
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(191, 219, 254, 0.9)",
    fontWeight: 800,
  },
  loadingCard: {
    padding: 20,
    borderRadius: 18,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(191, 219, 254, 0.9)",
    color: "#0f172a",
    fontWeight: 700,
  },
  chartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
  },
  activityGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  card: {
    background: "rgba(255,255,255,0.94)",
    borderRadius: 22,
    border: "1px solid rgba(191, 219, 254, 0.88)",
    padding: 18,
    boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
  },
  cardTitle: {
    margin: "0 0 14px",
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 900,
  },
  activityList: {
    display: "grid",
    gap: 10,
  },
  activityRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    padding: "12px 0",
    borderTop: "1px solid rgba(226, 232, 240, 0.9)",
  },
  activityPrimary: {
    color: "#0f172a",
    display: "block",
    fontSize: 14,
  },
  activitySecondary: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: 13,
  },
  activityDetail: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  empty: {
    margin: 0,
    color: "#64748b",
  },
  quickLinks: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  quickLinkCard: {
    textDecoration: "none",
    color: "inherit",
    padding: 20,
    borderRadius: 22,
    background: "linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)",
    border: "1px solid rgba(191, 219, 254, 0.9)",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
    display: "grid",
    gap: 8,
  },
  quickLabel: {
    color: "#2563eb",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    fontWeight: 900,
  },
  quickValue: {
    color: "#0f172a",
    fontSize: 16,
    lineHeight: 1.45,
  },
};
