"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";
import OfficeAssetModuleNav from "../../components/office/OfficeAssetModuleNav";
import { supabase } from "../../lib/supabase";

interface OfficeAssetRow {
  id: number;
  asset_name: string;
  category?: string | null;
  status?: string | null;
  purchase_cost?: number | null;
  purchase_date?: string | null;
  warranty_expiry?: string | null;
  currently_assigned_to?: number | null;
}

interface AssignmentRow {
  id: number;
  asset_id: number;
  status: string;
  assigned_date?: string | null;
}

interface MaintenanceRow {
  id: number;
  asset_id: number;
  status?: string | null;
  maintenance_date?: string | null;
  maintenance_cost?: number | null;
}

const chartColors = ["#0f766e", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4", "#ccfbf1"];

export default function OfficeAssetDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<OfficeAssetRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [maintenanceRows, setMaintenanceRows] = useState<MaintenanceRow[]>([]);
  const [disposalCount, setDisposalCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const assetResponse = await supabase
        .from("assets")
        .select("id, asset_name, category, status, purchase_cost, purchase_date, warranty_expiry, currently_assigned_to")
        .is("vessel_id", null)
        .order("created_at", { ascending: false });

      const assetRows = (assetResponse.data as OfficeAssetRow[]) || [];
      setAssets(assetRows);

      const assetIds = assetRows.map((item) => item.id);
      if (!assetIds.length) {
        setAssignments([]);
        setMaintenanceRows([]);
        setDisposalCount(0);
        setLoading(false);
        return;
      }

      const [assignmentResponse, maintenanceResponse, disposalResponse] = await Promise.all([
        supabase.from("assignment_records").select("id, asset_id, status, assigned_date").in("asset_id", assetIds),
        supabase
          .from("asset_maintenance")
          .select("id, asset_id, status, maintenance_date, maintenance_cost")
          .in("asset_id", assetIds),
        supabase.from("asset_disposals").select("id, asset_id").in("asset_id", assetIds),
      ]);

      setAssignments((assignmentResponse.data as AssignmentRow[]) || []);
      setMaintenanceRows((maintenanceResponse.data as MaintenanceRow[]) || []);
      setDisposalCount(
        disposalResponse.error
          ? assetRows.filter((item) => item.status === "Retired").length
          : (disposalResponse.data || []).length
      );
      setLoading(false);
    };

    void load();
  }, []);

  const kpis = useMemo(() => {
    const total = assets.length;
    const assigned = assets.filter((asset) => asset.status === "Assigned" || !!asset.currently_assigned_to).length;
    const available = assets.filter((asset) => (asset.status || "").toLowerCase() === "available").length;
    const underRepair = assets.filter(
      (asset) =>
        (asset.status || "").toLowerCase().includes("maintenance") ||
        (asset.status || "").toLowerCase().includes("repair")
    ).length;
    const retired = assets.filter((asset) => (asset.status || "").toLowerCase() === "retired").length;

    const now = Date.now();
    const warrantyExpiring = assets.filter((asset) => {
      if (!asset.warranty_expiry) return false;
      const expiryMs = new Date(asset.warranty_expiry).getTime();
      const delta = (expiryMs - now) / (1000 * 60 * 60 * 24);
      return delta >= 0 && delta <= 45;
    }).length;

    const totalAssetValue = assets.reduce((sum, asset) => sum + Number(asset.purchase_cost || 0), 0);

    return {
      total,
      assigned,
      available,
      underRepair,
      warrantyExpiring,
      retired,
      totalAssetValue,
    };
  }, [assets]);

  const byCategory = useMemo(() => {
    const bucket = new Map<string, number>();
    assets.forEach((asset) => {
      const key = asset.category || "Uncategorized";
      bucket.set(key, (bucket.get(key) || 0) + 1);
    });
    return Array.from(bucket.entries()).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const byDepartment = useMemo(() => {
    const bucket = new Map<string, number>();
    assignments.forEach((row) => {
      const dept = row.status === "Assigned" ? "Assigned" : row.status || "Unknown";
      bucket.set(dept, (bucket.get(dept) || 0) + 1);
    });
    return Array.from(bucket.entries()).map(([name, value]) => ({ name, value }));
  }, [assignments]);

  const warrantyTimeline = useMemo(() => {
    const bucket = new Map<string, number>();
    assets.forEach((asset) => {
      if (!asset.warranty_expiry) return;
      const key = new Date(asset.warranty_expiry).toLocaleString("default", { month: "short", year: "numeric" });
      bucket.set(key, (bucket.get(key) || 0) + 1);
    });
    return Array.from(bucket.entries()).map(([month, count]) => ({ month, count }));
  }, [assets]);

  const monthlyPurchases = useMemo(() => {
    const bucket = new Map<string, number>();
    assets.forEach((asset) => {
      if (!asset.purchase_date) return;
      const key = new Date(asset.purchase_date).toLocaleString("default", { month: "short", year: "numeric" });
      bucket.set(key, (bucket.get(key) || 0) + 1);
    });
    return Array.from(bucket.entries()).map(([month, count]) => ({ month, count }));
  }, [assets]);

  return (
    <div style={styles.page}>
      <OfficeAssetModuleNav />

      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Office Asset Management</p>
          <h2 style={styles.title}>Enterprise Asset Command Center</h2>
          <p style={styles.subtitle}>
            Unified visibility over register, assignments, maintenance, warranty, returns, and disposal for office operations.
          </p>
        </div>
        <div style={styles.heroActions}>
          <Link href="/office/assets/register" style={styles.primaryButton}>
            Open Asset Register
          </Link>
          <Link href="/office/assets/reports" style={styles.secondaryButton}>
            Generate Reports
          </Link>
        </div>
      </section>

      <section style={styles.kpiGrid}>
        <KpiCard label="Total Assets" value={kpis.total} />
        <KpiCard label="Assigned Assets" value={kpis.assigned} />
        <KpiCard label="Available Assets" value={kpis.available} />
        <KpiCard label="Under Repair" value={kpis.underRepair} />
        <KpiCard label="Warranty Expiring" value={kpis.warrantyExpiring} />
        <KpiCard label="Retired Assets" value={kpis.retired} />
        <KpiCard label="Total Asset Value" value={`$${kpis.totalAssetValue.toLocaleString()}`} />
        <KpiCard label="Disposal Records" value={disposalCount} />
      </section>

      {loading ? (
        <div style={styles.loading}>Loading office asset analytics...</div>
      ) : (
        <section style={styles.chartGrid}>
          <ChartCard title="Assets by Category">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={90}>
                  {byCategory.map((item, index) => (
                    <Cell key={`${item.name}-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Assets by Department">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byDepartment}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#1d4ed8" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Warranty Expiry Timeline">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={warrantyTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Monthly Purchases">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyPurchases}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f766e" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article style={styles.kpiCard}>
      <p style={styles.kpiLabel}>{label}</p>
      <p style={styles.kpiValue}>{value}</p>
    </article>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article style={styles.chartCard}>
      <h3 style={styles.chartTitle}>{title}</h3>
      {children}
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 14 },
  hero: {
    background: "linear-gradient(120deg, #0f172a 0%, #1d4ed8 45%, #0f766e 100%)",
    borderRadius: 16,
    color: "white",
    padding: 18,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  eyebrow: {
    margin: 0,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    opacity: 0.8,
    fontWeight: 700,
  },
  title: { margin: "6px 0", fontSize: 28, fontWeight: 900 },
  subtitle: { margin: 0, maxWidth: 760, opacity: 0.92 },
  heroActions: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" },
  primaryButton: {
    textDecoration: "none",
    borderRadius: 10,
    background: "#22c55e",
    color: "#052e16",
    padding: "10px 14px",
    fontWeight: 800,
  },
  secondaryButton: {
    textDecoration: "none",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.35)",
    background: "rgba(255,255,255,0.1)",
    color: "white",
    padding: "10px 14px",
    fontWeight: 800,
  },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 },
  kpiCard: { background: "white", borderRadius: 14, border: "1px solid #dbeafe", padding: 12 },
  kpiLabel: {
    margin: 0,
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: 700,
    letterSpacing: "0.06em",
  },
  kpiValue: { margin: "8px 0 0", fontSize: 24, color: "#0f172a", fontWeight: 900 },
  loading: {
    background: "white",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: 20,
    color: "#334155",
    fontWeight: 700,
  },
  chartGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 },
  chartCard: { background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 12 },
  chartTitle: { margin: "0 0 8px", color: "#0f172a", fontSize: 16, fontWeight: 800 },
};
