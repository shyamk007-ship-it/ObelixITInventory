"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2, Plus } from "lucide-react";
import { InventoryDataTable, InventoryHeader } from "../../../components/inventory";
import { fetchInventorySettings, inventoryTables, safeErrorMessage } from "../../../lib/inventory";
import { supabase } from "../../../lib/supabase";

const defaultSettings = [
  { key: "inventory_units", value: "Nos,Box,Pack,Kg,Litre" },
  { key: "default_warehouse", value: "MAIN" },
  { key: "currency", value: "USD" },
  { key: "tax", value: "0" },
  { key: "barcode_format", value: "CODE128" },
  { key: "qr_format", value: "URL" },
  { key: "approval_workflow", value: "manager>inventory" },
  { key: "notification_rules", value: "low_stock,out_of_stock,pending_transfer" },
];

export default function InventorySettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchInventorySettings>>>([]);
  const [form, setForm] = useState({ key: "", value: "", value_type: "text" });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRows(await fetchInventorySettings());
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load inventory settings."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const seedDefaults = async () => {
    const payload = defaultSettings.map((row) => ({ key: row.key, value: row.value, value_type: "text" }));
    const { error: upsertError } = await supabase.from(inventoryTables.settings).upsert(payload, { onConflict: "key" });
    if (upsertError) {
      setError(safeErrorMessage(upsertError, "Unable to seed default settings."));
      return;
    }
    void loadData();
  };

  const saveSetting = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      key: form.key.trim(),
      value: form.value,
      value_type: form.value_type,
    };

    if (!payload.key) return;

    const { error: upsertError } = await supabase.from(inventoryTables.settings).upsert([payload], { onConflict: "key" });
    if (upsertError) {
      setError(safeErrorMessage(upsertError, "Unable to save setting."));
      return;
    }

    setForm({ key: "", value: "", value_type: "text" });
    void loadData();
  };

  const tableRows = rows.map((row) => ({
    Setting: row.key,
    Value: row.value,
    Type: row.value_type || "text",
    Updated: row.updated_at ? new Date(row.updated_at).toLocaleString() : "-",
  }));

  return (
    <section style={styles.page}>
      <InventoryHeader title="Inventory Settings" subtitle="Configure inventory units, warehouses, approval paths, barcode settings, currency, tax, default warehouse, and notification rules." />

      <div style={styles.toolbar}>
        <button type="button" style={styles.secondaryButton} onClick={() => void seedDefaults()}>Seed Default Settings</button>
      </div>

      <form style={styles.formCard} onSubmit={saveSetting}>
        <h3 style={styles.title}><Plus size={14} /> Save Setting</h3>
        <div style={styles.grid}>
          <input style={styles.input} placeholder="Setting Key" value={form.key} onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))} />
          <input style={styles.input} placeholder="Value" value={form.value} onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))} />
          <select style={styles.input} value={form.value_type} onChange={(event) => setForm((prev) => ({ ...prev, value_type: event.target.value }))}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="json">JSON</option>
          </select>
        </div>
        <button type="submit" style={styles.button}>Save</button>
      </form>

      <InventoryDataTable columns={["Setting", "Value", "Type", "Updated"]} rows={tableRows} />

      {isLoading ? <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Loading settings...</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  toolbar: { display: "flex", gap: 8 },
  secondaryButton: { border: "1px solid #bfdbfe", borderRadius: 10, background: "#eff6ff", color: "#1d4ed8", fontWeight: 800, fontSize: 12, padding: "8px 10px", cursor: "pointer" },
  formCard: { borderRadius: 14, border: "1px solid #dbeafe", background: "#fff", padding: 12, display: "grid", gap: 10 },
  title: { margin: 0, color: "#0f172a", fontSize: 15, fontWeight: 900, display: "inline-flex", gap: 6, alignItems: "center" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 },
  input: { border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 9px", fontSize: 13 },
  button: {
    border: "1px solid #1d4ed8",
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "white",
    borderRadius: 10,
    padding: "8px 11px",
    fontWeight: 800,
    fontSize: 12,
    width: "fit-content",
    cursor: "pointer",
  },
  loading: { borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", padding: "8px 10px", display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 700 },
  error: { borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: "8px 10px", fontWeight: 700 },
};

