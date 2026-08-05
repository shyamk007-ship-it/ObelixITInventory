"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2, Plus } from "lucide-react";
import { InventoryDataTable, InventoryHeader } from "../../../components/inventory";
import { fetchConsumables, fetchInventoryItems, inventoryTables, safeErrorMessage } from "../../../lib/inventory";
import { supabase } from "../../../lib/supabase";

export default function OfficeInventoryConsumablesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchConsumables>>>([]);
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchInventoryItems>>>([]);
  const [form, setForm] = useState({
    inventory_item_id: "",
    item_name: "",
    monthly_usage: "0",
    department: "IT",
    department_usage: "0",
    forecast_next_month: "0",
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [consumableRows, itemRows] = await Promise.all([fetchConsumables(300), fetchInventoryItems()]);
      setRows(consumableRows);
      setItems(itemRows);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load consumables."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const saveConsumable = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const departmentUsage = {
      [form.department]: Number(form.department_usage || 0),
    };

    const payload = {
      inventory_item_id: form.inventory_item_id ? Number(form.inventory_item_id) : null,
      item_name: form.item_name.trim() || "Consumable",
      monthly_usage: Number(form.monthly_usage || 0),
      department_usage: departmentUsage,
      forecast_next_month: Number(form.forecast_next_month || 0),
      status: "Active",
    };

    const { error: insertError } = await supabase.from(inventoryTables.consumables).insert([payload]);
    if (insertError) {
      setError(safeErrorMessage(insertError, "Unable to save consumable."));
      return;
    }

    setForm({ inventory_item_id: "", item_name: "", monthly_usage: "0", department: "IT", department_usage: "0", forecast_next_month: "0" });
    void loadData();
  };

  const tableRows = rows.map((row) => ({
    Item: row.item_name,
    "Linked Stock Item": row.inventory_item_id || "-",
    "Monthly Usage": row.monthly_usage || 0,
    "Department Usage": row.department_usage ? JSON.stringify(row.department_usage) : "-",
    "Consumption Trend": row.monthly_usage && row.forecast_next_month ? `${Math.round(((row.forecast_next_month - row.monthly_usage) / Math.max(row.monthly_usage, 1)) * 100)}%` : "-",
    Forecast: row.forecast_next_month || 0,
    Status: row.status || "Active",
  }));

  return (
    <section style={styles.page}>
      <InventoryHeader title="Consumable Management" subtitle="Dedicated consumables tracking for monthly usage, departmental consumption, trend monitoring, and demand forecasting." />

      <form style={styles.formCard} onSubmit={saveConsumable}>
        <h3 style={styles.title}><Plus size={14} /> Add Consumable</h3>
        <div style={styles.grid}>
          <select style={styles.input} value={form.inventory_item_id} onChange={(event) => setForm((prev) => ({ ...prev, inventory_item_id: event.target.value }))}>
            <option value="">Linked Inventory Item</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.item_name} ({item.sku})</option>
            ))}
          </select>
          <input style={styles.input} placeholder="Consumable Name" value={form.item_name} onChange={(event) => setForm((prev) => ({ ...prev, item_name: event.target.value }))} />
          <input style={styles.input} type="number" placeholder="Monthly Usage" value={form.monthly_usage} onChange={(event) => setForm((prev) => ({ ...prev, monthly_usage: event.target.value }))} />
          <select style={styles.input} value={form.department} onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}>
            {[
              "IT",
              "HR",
              "Finance",
              "Operations",
              "Admin",
            ].map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>
          <input style={styles.input} type="number" placeholder="Department Usage" value={form.department_usage} onChange={(event) => setForm((prev) => ({ ...prev, department_usage: event.target.value }))} />
          <input style={styles.input} type="number" placeholder="Forecast Next Month" value={form.forecast_next_month} onChange={(event) => setForm((prev) => ({ ...prev, forecast_next_month: event.target.value }))} />
        </div>
        <button type="submit" style={styles.button}>Save Consumable</button>
      </form>

      <InventoryDataTable
        columns={[
          "Item",
          "Linked Stock Item",
          "Monthly Usage",
          "Department Usage",
          "Consumption Trend",
          "Forecast",
          "Status",
        ]}
        rows={tableRows}
      />

      {isLoading ? <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Loading consumables...</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  formCard: { borderRadius: 14, border: "1px solid #dbeafe", background: "#fff", padding: 12, display: "grid", gap: 10 },
  title: { margin: 0, color: "#0f172a", fontSize: 15, fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 6 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 },
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

