"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import OfficeAssetModuleNav from "../../../components/office/OfficeAssetModuleNav";
import { supabase } from "../../../lib/supabase";

type WarrantyAssetRow = {
  id: number;
  asset_name: string;
  asset_tag: string;
  category?: string | null;
  warranty_expiry?: string | null;
  status?: string | null;
};

export default function OfficeAssetWarrantyPage() {
  const [rows, setRows] = useState<WarrantyAssetRow[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const response = await supabase
        .from("assets")
        .select("id, asset_name, asset_tag, category, warranty_expiry, status")
        .is("vessel_id", null)
        .order("warranty_expiry", { ascending: true });
      setRows((response.data as WarrantyAssetRow[]) || []);
    };

    void load();
  }, []);

  const summary = useMemo(() => {
    const now = Date.now();
    let expiring30 = 0;
    let expiring60 = 0;
    let expired = 0;

    rows.forEach((row) => {
      if (!row.warranty_expiry) return;
      const days = (new Date(row.warranty_expiry).getTime() - now) / (1000 * 60 * 60 * 24);
      if (days < 0) expired += 1;
      if (days >= 0 && days <= 30) expiring30 += 1;
      if (days > 30 && days <= 60) expiring60 += 1;
    });

    return { total: rows.length, expiring30, expiring60, expired };
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => [row.asset_name, row.asset_tag, row.category].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)));
  }, [rows, search]);

  const badge = (value?: string | null) => {
    if (!value) return { label: "No Warranty", style: styles.badgeMuted };
    const days = (new Date(value).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (days < 0) return { label: "Expired", style: styles.badgeDanger };
    if (days <= 30) return { label: "Expiring <= 30 days", style: styles.badgeWarning };
    if (days <= 60) return { label: "Expiring <= 60 days", style: styles.badgeInfo };
    return { label: "Active", style: styles.badgeSuccess };
  };

  return (
    <div style={styles.page}>
      <OfficeAssetModuleNav />
      <section style={styles.headerCard}>
        <div>
          <p style={styles.eyebrow}>Warranty</p>
          <h2 style={styles.title}>Warranty Tracking</h2>
          <p style={styles.subtitle}>Monitor upcoming expiries and prioritize renewals before service impact.</p>
        </div>
        <div style={styles.statRow}>
          <Stat label="Total" value={summary.total} />
          <Stat label="Expiring 30d" value={summary.expiring30} />
          <Stat label="Expiring 60d" value={summary.expiring60} />
          <Stat label="Expired" value={summary.expired} />
        </div>
      </section>

      <section style={styles.card}>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search asset, id, category" style={styles.input} />
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Asset</th>
                <th style={styles.th}>Asset ID</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Warranty Expiry</th>
                <th style={styles.th}>Warranty State</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={styles.empty}>No assets found.</td></tr>
              ) : (
                filtered.map((row) => {
                  const state = badge(row.warranty_expiry);
                  return (
                    <tr key={row.id}>
                      <td style={styles.td}>{row.asset_name}</td>
                      <td style={styles.td}>{row.asset_tag}</td>
                      <td style={styles.td}>{row.category || "-"}</td>
                      <td style={styles.td}>{row.status || "-"}</td>
                      <td style={styles.td}>{row.warranty_expiry ? new Date(row.warranty_expiry).toLocaleDateString() : "-"}</td>
                      <td style={styles.td}><span style={{ ...styles.badge, ...state.style }}>{state.label}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statLabel}>{label}</p>
      <p style={styles.statValue}>{value}</p>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 14 },
  headerCard: { background: "white", borderRadius: 14, border: "1px solid #dbeafe", padding: 14, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  eyebrow: { margin: 0, color: "#0369a1", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" },
  title: { margin: "6px 0", color: "#0f172a", fontWeight: 900, fontSize: 24 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 700 },
  statRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  statCard: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, minWidth: 120 },
  statLabel: { margin: 0, fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 },
  statValue: { margin: "6px 0 0", color: "#0f172a", fontSize: 22, fontWeight: 900 },
  card: { background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 12, display: "grid", gap: 8 },
  input: { width: "100%", borderRadius: 10, border: "1px solid #cbd5e1", padding: "10px 12px", fontSize: 13 },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
  th: { textAlign: "left", padding: 10, background: "#f8fafc", fontSize: 12, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.06em" },
  td: { padding: 10, borderTop: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, verticalAlign: "top" },
  empty: { textAlign: "center", padding: 20, color: "#64748b" },
  badge: { display: "inline-flex", borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 700 },
  badgeSuccess: { background: "#dcfce7", color: "#166534" },
  badgeInfo: { background: "#dbeafe", color: "#1e3a8a" },
  badgeWarning: { background: "#fef3c7", color: "#92400e" },
  badgeDanger: { background: "#fee2e2", color: "#991b1b" },
  badgeMuted: { background: "#e2e8f0", color: "#334155" },
};
