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
  const [stats, setStats] =
    useState<any>({
      totalAssets: 0,
      assignedAssets: 0,
      availableAssets: 0,
      employees: 0,
    });

  const [logs, setLogs] =
    useState<any[]>([]);

  const [recentAssets, setRecentAssets] =
    useState<any[]>([]);

  useEffect(() => {
    const initialize = async () => {
      const isAuthenticated = await checkUser();
      if (!isAuthenticated) {
        return;
      }

      await loadDashboard();
      await loadLogs();
    };

    initialize();
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
    // TOTAL ASSETS
    const {
      count: totalAssets,
    } = await supabase
      .from("assets")
      .select("*", {
        count: "exact",
        head: true,
      });

    // ASSIGNED ASSETS
    const {
      count: assignedAssets,
    } = await supabase
      .from("assets")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "Assigned");

    // AVAILABLE ASSETS
    const {
      count:
        availableAssets,
    } = await supabase
      .from("assets")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "Available"
      );

    // EMPLOYEES
    const {
      count: employees,
    } = await supabase
      .from("employees")
      .select("*", {
        count: "exact",
        head: true,
      });

    // RECENT ASSETS
    const {
      data: recentData,
    } = await supabase
      .from("assets")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(5);

    setRecentAssets(
      recentData || []
    );

    setStats({
      totalAssets:
        totalAssets || 0,

      assignedAssets:
        assignedAssets || 0,

      availableAssets:
        availableAssets || 0,

      employees:
        employees || 0,
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
};