"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getUserProfile, isEmployee } from "../lib/rbac";

import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import StatsCards from "../components/StatsCards";
import AssetsChart from "../components/AssetsChart";
import ActivityFeed from "../components/ActivityFeed";
import RecentAssets from "../components/RecentAssets";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
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

  const [logs, setLogs] = useState<any[]>([]);
  const [recentAssets, setRecentAssets] = useState<any[]>([]);
  const [ticketCategoryData, setTicketCategoryData] = useState<any[]>([]);

  useEffect(() => {
    let realtimeChannel: any = null;

    const initialize = async () => {
      const isAuthenticated = await checkUser();
      if (!isAuthenticated) {
        return;
      }

      await loadDashboard();
      await loadLogs();

      realtimeChannel = supabase
        .channel("realtime_dashboard")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "activity_logs" },
          async () => {
            await loadLogs();
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "assets" },
          async () => {
            await loadDashboard();
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "assets" },
          async () => {
            await loadDashboard();
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "tickets" },
          async () => {
            await loadDashboard();
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "tickets" },
          async () => {
            await loadDashboard();
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "asset_maintenance" },
          async () => {
            await loadDashboard();
          }
        )
        .subscribe();
    };

    initialize();

    return () => {
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
      }
    };
  }, []);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/login";
      return false;
    }

    const profile = await getUserProfile();

    if (!profile) {
      window.location.href = "/login";
      return false;
    }

    if (isEmployee(profile.role)) {
      window.location.href = "/employee";
      return false;
    }

    return true;
  };

  // LOAD DASHBOARD
  const loadDashboard = async () => {
    const { count: totalAssets } = await supabase.from("assets").select("*", {
      count: "exact",
      head: true,
    });

    const { count: assignedAssets } = await supabase.from("assets").select("*", {
      count: "exact",
      head: true,
    }).eq("status", "Assigned");

    const { count: availableAssets } = await supabase.from("assets").select("*", {
      count: "exact",
      head: true,
    }).eq("status", "Available");

    const { count: employees } = await supabase.from("employees").select("*", {
      count: "exact",
      head: true,
    });

    const { data: recentData } = await supabase
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: ticketsData } = await supabase
      .from("tickets")
      .select("category, status, priority");

    const openTickets = (ticketsData || []).filter((ticket) => ticket.status === "Open").length;
    const resolvedTickets = (ticketsData || []).filter((ticket) => ticket.status === "Resolved").length;
    const criticalIssues = (ticketsData || []).filter((ticket) => ticket.priority === "Critical").length;

    const categoryCounts = (ticketsData || []).reduce((groups: Record<string, number>, ticket) => {
      const category = ticket.category || "Other";
      groups[category] = (groups[category] || 0) + 1;
      return groups;
    }, {});

    const ticketCategoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

    const { data: maintenanceData } = await supabase.from("asset_maintenance").select("maintenance_date");
    const dueMaintenance = (maintenanceData || []).filter((record) => {
      const maintenanceDate = new Date(record.maintenance_date);
      const now = new Date();
      const delta = (maintenanceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return delta >= 0 && delta <= 30;
    }).length;

    const { data: warrantyAssets } = await supabase.from("assets").select("warranty_expiry");
    const warrantyExpiring = (warrantyAssets || []).filter((asset) => {
      if (!asset.warranty_expiry) return false;
      const expiry = new Date(asset.warranty_expiry);
      const now = new Date();
      const delta = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return delta >= 0 && delta <= 30;
    }).length;

    setRecentAssets(recentData || []);
    setTicketCategoryData(ticketCategoryData);
    setStats({
      totalAssets: totalAssets || 0,
      assignedAssets: assignedAssets || 0,
      availableAssets: availableAssets || 0,
      employees: employees || 0,
      openTickets,
      resolvedTickets,
      criticalIssues,
      maintenanceDue: dueMaintenance,
      warrantyExpiring,
    });
  };

  // LOAD ACTIVITY LOGS
  const loadLogs = async () => {
    const { data } =
      await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(5);

    setLogs(data || []);
  };

  // PIE CHART DATA
  const pieData = [
    {
      name: "Assigned",
      value:
        stats.assignedAssets,
    },
    {
      name: "Available",
      value:
        stats.availableAssets,
    },
  ];

  const COLORS = [
    "#2563eb",
    "#16a34a",
  ];

  return (
    <>
      <Sidebar />

      <div style={styles.container}>
        {/* TOP BAR */}
        <TopBar />

        {/* KPI CARDS */}
        <StatsCards
          stats={stats}
        />

        {/* CHARTS */}
        <div style={styles.grid}>
          {/* BAR CHART */}
          <AssetsChart
            totalAssets={
              stats.totalAssets
            }
            employees={
              stats.employees
            }
          />

          {/* PIE CHART */}
          <div style={styles.chartCard}>
            <h2>
              Asset Status
            </h2>

            <ResponsiveContainer
              width="100%"
              height={320}
            >
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {pieData.map(
                    (
                      entry,
                      index
                    ) => (
                      <Cell
                        key={index}
                        fill={
                          COLORS[
                            index
                          ]
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.chartCard}>
            <h2>Support Tickets by Category</h2>
            {ticketCategoryData.length === 0 ? (
              <div style={styles.emptyState}>No ticket data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <Pie data={ticketCategoryData} dataKey="value" cx="50%" cy="50%" outerRadius={100} label>
                    {ticketCategoryData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={styles.chartCard}>
            <h2>Maintenance & Warranty</h2>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryCard}>
                <p>Upcoming Maintenance</p>
                <strong>{stats.maintenanceDue}</strong>
              </div>
              <div style={styles.summaryCard}>
                <p>Warranty Expiring</p>
                <strong>{stats.warrantyExpiring}</strong>
              </div>
            </div>
            <div style={styles.summaryDetail}>
              <p style={styles.summaryLabel}>Critical Tickets</p>
              <strong style={styles.summaryValue}>{stats.criticalIssues}</strong>
            </div>
          </div>
        </div>

        {/* ACTIVITY */}
        <ActivityFeed
          logs={logs}
        />

        {/* RECENT ASSETS */}
        <RecentAssets
          assets={recentAssets}
        />
      </div>
    </>
  );
}

const styles: any = {
  container: {
    marginLeft: 260,
    padding: 30,
    background: "#f1f5f9",
    minHeight: "100vh",
    fontFamily: "Arial",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",

    gap: 20,

    marginTop: 20,
  },

  chartCard: {
    background: "white",
    padding: 24,
    borderRadius: 16,
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.08)",
  },

  emptyState: {
    padding: 22,
    color: "#64748b",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginTop: 20,
  },

  summaryCard: {
    background: "#f8fafc",
    padding: 18,
    borderRadius: 16,
  },

  summaryDetail: {
    marginTop: 24,
    padding: 18,
    borderRadius: 16,
    background: "#f8fafc",
  },

  summaryLabel: {
    margin: 0,
    color: "#64748b",
  },

  summaryValue: {
    fontSize: 32,
    color: "#0f172a",
  },
};