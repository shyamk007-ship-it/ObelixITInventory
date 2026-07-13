"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import OfficeAssetModuleNav from "../../../components/office/OfficeAssetModuleNav";
import { supabase } from "../../../lib/supabase";

type ReturnRow = {
  id: number;
  asset_id: number;
  employee_id: number;
  status: "Assigned" | "Returned" | "Lost" | "Damaged";
  assigned_date?: string | null;
  expected_return_date?: string | null;
  actual_return_date?: string | null;
  notes?: string | null;
  assets?: { asset_name?: string | null; asset_tag?: string | null } | null;
  employees?: { full_name?: string | null } | null;
};

export default function OfficeAssetReturnsPage() {
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const load = async () => {
    const response = await supabase
      .from("assignment_records")
      .select("id, asset_id, employee_id, status, assigned_date, expected_return_date, actual_return_date, notes, assets(asset_name, asset_tag, vessel_id), employees(full_name)")
      .eq("status", "Assigned")
      .order("assigned_date", { ascending: false });

    if (response.error) {
      setRows([]);
      return;
    }

    const filtered = ((response.data || []) as Array<any>).filter((row) => !row.assets?.vessel_id);
    setRows(filtered as ReturnRow[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const processReturn = async (row: ReturnRow, outcome: "Returned" | "Lost" | "Damaged") => {
    const now = new Date().toISOString().slice(0, 10);

    const updateAssignment = await supabase
      .from("assignment_records")
      .update({ status: outcome, actual_return_date: now })
      .eq("id", row.id);

    if (updateAssignment.error) {
      showToast(updateAssignment.error.message);
      return;
    }

    const assetStatus = outcome === "Returned" ? "Available" : outcome;
    const updateAsset = await supabase
      .from("assets")
      .update({ status: assetStatus, currently_assigned_to: null })
      .eq("id", row.asset_id);

    if (updateAsset.error) {
      showToast(updateAsset.error.message);
      return;
    }

    showToast(`Asset marked as ${outcome}.`);
    await load();
  };

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.assets?.asset_name, row.assets?.asset_tag, row.employees?.full_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [rows, search]);

  return (
    <div style={styles.page}>
      <OfficeAssetModuleNav />
      <section style={styles.headerCard}>
        <div>
          <p style={styles.eyebrow}>Asset Returns</p>
          <h2 style={styles.title}>Return Workflow</h2>
          <p style={styles.subtitle}>Process returns and automatically update asset inventory status for office assets.</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Pending Returns</p>
          <p style={styles.statValue}>{rows.length}</p>
        </div>
      </section>

      <section style={styles.card}>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by asset or employee" style={styles.input} />
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Asset</th>
                <th style={styles.th}>Asset ID</th>
                <th style={styles.th}>Assigned To</th>
                <th style={styles.th}>Assigned Date</th>
                <th style={styles.th}>Expected Return</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr><td colSpan={6} style={styles.empty}>No pending returns.</td></tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td style={styles.td}>{row.assets?.asset_name || "-"}</td>
                    <td style={styles.td}>{row.assets?.asset_tag || "-"}</td>
                    <td style={styles.td}>{row.employees?.full_name || "-"}</td>
                    <td style={styles.td}>{row.assigned_date ? new Date(row.assigned_date).toLocaleDateString() : "-"}</td>
                    <td style={styles.td}>{row.expected_return_date ? new Date(row.expected_return_date).toLocaleDateString() : "-"}</td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button style={styles.actionButton} onClick={() => void processReturn(row, "Returned")}>Mark Returned</button>
                        <button style={styles.actionWarningButton} onClick={() => void processReturn(row, "Damaged")}>Mark Damaged</button>
                        <button style={styles.actionDangerButton} onClick={() => void processReturn(row, "Lost")}>Mark Lost</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 14 },
  headerCard: { background: "white", borderRadius: 14, border: "1px solid #dbeafe", padding: 14, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  eyebrow: { margin: 0, color: "#0369a1", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" },
  title: { margin: "6px 0", color: "#0f172a", fontWeight: 900, fontSize: 24 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 700 },
  statCard: { border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc", minWidth: 140 },
  statLabel: { margin: 0, fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 },
  statValue: { margin: "6px 0 0", color: "#0f172a", fontSize: 24, fontWeight: 900 },
  card: { background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 12, display: "grid", gap: 8 },
  input: { width: "100%", borderRadius: 10, border: "1px solid #cbd5e1", padding: "10px 12px", fontSize: 13 },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 800 },
  th: { textAlign: "left", padding: 10, background: "#f8fafc", fontSize: 12, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.06em" },
  td: { padding: 10, borderTop: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, verticalAlign: "top" },
  empty: { textAlign: "center", padding: 20, color: "#64748b" },
  actions: { display: "grid", gap: 6 },
  actionButton: { border: "1px solid #bbf7d0", borderRadius: 8, background: "#dcfce7", color: "#166534", padding: "6px 8px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  actionWarningButton: { border: "1px solid #fde68a", borderRadius: 8, background: "#fef3c7", color: "#92400e", padding: "6px 8px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  actionDangerButton: { border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", padding: "6px 8px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  toast: { position: "fixed", right: 16, bottom: 16, background: "#0f172a", color: "white", borderRadius: 10, padding: "10px 14px", fontWeight: 700, fontSize: 13 },
};
