"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import OfficeAssetModuleNav from "../../../components/office/OfficeAssetModuleNav";
import { supabase } from "../../../lib/supabase";

type AssetOption = { id: number; asset_name: string; asset_tag: string; status?: string | null };
type DisposalRow = {
  id: number;
  asset_id: number;
  disposal_date?: string | null;
  method?: string | null;
  sale_value?: number | null;
  remarks?: string | null;
  disposed_by?: string | null;
  assets?: { asset_name?: string | null; asset_tag?: string | null } | null;
};

export default function OfficeAssetDisposalPage() {
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [rows, setRows] = useState<DisposalRow[]>([]);
  const [form, setForm] = useState({ asset_id: "", disposal_date: new Date().toISOString().slice(0, 10), method: "Scrap", sale_value: "", remarks: "" });
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const load = async () => {
    const [assetResponse, disposalResponse] = await Promise.all([
      supabase.from("assets").select("id, asset_name, asset_tag, status").is("vessel_id", null).order("asset_name", { ascending: true }),
      supabase.from("asset_disposals").select("id, asset_id, disposal_date, method, sale_value, remarks, disposed_by, assets(asset_name, asset_tag)").order("disposal_date", { ascending: false }),
    ]);

    if (!assetResponse.error) {
      setAssets((assetResponse.data as AssetOption[]) || []);
    }

    if (!disposalResponse.error) {
      setRows((disposalResponse.data as DisposalRow[]) || []);
    } else {
      setRows([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createDisposal = async () => {
    if (!form.asset_id) {
      showToast("Select an asset.");
      return;
    }

    const payload = {
      asset_id: Number(form.asset_id),
      disposal_date: form.disposal_date || null,
      method: form.method || null,
      sale_value: form.sale_value ? Number(form.sale_value) : null,
      remarks: form.remarks || null,
      disposed_by: "Office Admin",
    };

    const disposalResponse = await supabase.from("asset_disposals").insert([payload]);
    if (disposalResponse.error) {
      showToast("Run office_asset_management_schema.sql to enable disposal records.");
      return;
    }

    const assetResponse = await supabase.from("assets").update({ status: "Retired", currently_assigned_to: null }).eq("id", Number(form.asset_id));
    if (assetResponse.error) {
      showToast(assetResponse.error.message);
      return;
    }

    showToast("Disposal recorded and asset retired.");
    setForm({ asset_id: "", disposal_date: new Date().toISOString().slice(0, 10), method: "Scrap", sale_value: "", remarks: "" });
    await load();
  };

  const totalRecovery = useMemo(() => rows.reduce((sum, row) => sum + Number(row.sale_value || 0), 0), [rows]);

  const eligibleAssets = assets.filter((item) => item.status !== "Retired");

  return (
    <div style={styles.page}>
      <OfficeAssetModuleNav />
      <section style={styles.headerCard}>
        <div>
          <p style={styles.eyebrow}>Disposal</p>
          <h2 style={styles.title}>Asset Disposal Management</h2>
          <p style={styles.subtitle}>Retire assets with controlled disposal records and recovery-value tracking.</p>
        </div>
        <div style={styles.statRow}>
          <Stat label="Disposal Records" value={rows.length} />
          <Stat label="Recovery Value" value={`$${totalRecovery.toLocaleString()}`} />
        </div>
      </section>

      <section style={styles.grid}>
        <article style={styles.card}>
          <h3 style={styles.cardTitle}>Record Disposal</h3>
          <select value={form.asset_id} onChange={(event) => setForm((prev) => ({ ...prev, asset_id: event.target.value }))} style={styles.input}>
            <option value="">Select asset</option>
            {eligibleAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>{asset.asset_name} ({asset.asset_tag})</option>
            ))}
          </select>
          <input type="date" value={form.disposal_date} onChange={(event) => setForm((prev) => ({ ...prev, disposal_date: event.target.value }))} style={styles.input} />
          <select value={form.method} onChange={(event) => setForm((prev) => ({ ...prev, method: event.target.value }))} style={styles.input}>
            <option value="Scrap">Scrap</option>
            <option value="Recycle">Recycle</option>
            <option value="Auction">Auction</option>
            <option value="Donation">Donation</option>
          </select>
          <input type="number" value={form.sale_value} onChange={(event) => setForm((prev) => ({ ...prev, sale_value: event.target.value }))} placeholder="Sale / recovery value" style={styles.input} />
          <textarea value={form.remarks} onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))} placeholder="Disposal remarks" style={{ ...styles.input, minHeight: 90 }} />
          <button style={styles.primaryButton} onClick={() => void createDisposal()}>Record Disposal</button>
        </article>

        <article style={styles.card}>
          <h3 style={styles.cardTitle}>Disposal Register</h3>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Asset</th>
                  <th style={styles.th}>Asset ID</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Method</th>
                  <th style={styles.th}>Recovery</th>
                  <th style={styles.th}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={6} style={styles.empty}>No disposal records found.</td></tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td style={styles.td}>{row.assets?.asset_name || "-"}</td>
                      <td style={styles.td}>{row.assets?.asset_tag || "-"}</td>
                      <td style={styles.td}>{row.disposal_date ? new Date(row.disposal_date).toLocaleDateString() : "-"}</td>
                      <td style={styles.td}>{row.method || "-"}</td>
                      <td style={styles.td}>${Number(row.sale_value || 0).toLocaleString()}</td>
                      <td style={styles.td}>{row.remarks || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
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
  statCard: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, minWidth: 140 },
  statLabel: { margin: 0, fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 },
  statValue: { margin: "6px 0 0", color: "#0f172a", fontSize: 22, fontWeight: 900 },
  grid: { display: "grid", gridTemplateColumns: "minmax(260px, 360px) 1fr", gap: 12 },
  card: { background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 12, display: "grid", gap: 8 },
  cardTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 800 },
  input: { width: "100%", borderRadius: 10, border: "1px solid #cbd5e1", padding: "10px 12px", fontSize: 13, background: "white" },
  primaryButton: { border: "none", borderRadius: 10, background: "#2563eb", color: "white", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
  th: { textAlign: "left", padding: 10, background: "#f8fafc", fontSize: 12, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.06em" },
  td: { padding: 10, borderTop: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, verticalAlign: "top" },
  empty: { textAlign: "center", padding: 20, color: "#64748b" },
  toast: { position: "fixed", right: 16, bottom: 16, background: "#0f172a", color: "white", borderRadius: 10, padding: "10px 14px", fontWeight: 700, fontSize: 13 },
};
