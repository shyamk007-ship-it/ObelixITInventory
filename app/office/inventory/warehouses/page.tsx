"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2, Plus } from "lucide-react";
import { InventoryHeader } from "../../../components/inventory";
import { fetchInventoryItems, fetchWarehouses, inventoryTables, safeErrorMessage } from "../../../lib/inventory";
import { supabase } from "../../../lib/supabase";
import { useToast } from "../../../hooks/useInventoryModule";

export default function InventoryWarehousesPage() {
  const { toast, showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<Awaited<ReturnType<typeof fetchWarehouses>>>([]);
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchInventoryItems>>>([]);
  const [form, setForm] = useState({ code: "", name: "", location: "", capacity_units: "0", status: "Active" });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [warehouseRows, itemRows] = await Promise.all([fetchWarehouses(), fetchInventoryItems()]);
      setWarehouses(warehouseRows);
      setItems(itemRows);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load warehouses."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const summary = useMemo(() => {
    const totalCapacity = warehouses.reduce((sum, row) => sum + Number(row.capacity_units || 0), 0);
    const totalQty = items.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    return { totalCapacity, totalQty };
  }, [warehouses, items]);

  const createWarehouse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.code.trim() || !form.name.trim()) {
      showToast("Code and name are required.");
      return;
    }

    const { error: insertError } = await supabase.from(inventoryTables.warehouses).insert([
      {
        code: form.code.trim(),
        name: form.name.trim(),
        location: form.location.trim() || null,
        capacity_units: Number(form.capacity_units || 0),
        status: form.status,
      },
    ]);

    if (insertError) {
      showToast(safeErrorMessage(insertError, "Unable to create warehouse."));
      return;
    }

    setForm({ code: "", name: "", location: "", capacity_units: "0", status: "Active" });
    showToast("Warehouse created.");
    void loadData();
  };

  const toggleStatus = async (warehouseId: number, currentStatus: string | null | undefined) => {
    const nextStatus = String(currentStatus || "Active") === "Active" ? "Inactive" : "Active";
    const { error: updateError } = await supabase.from(inventoryTables.warehouses).update({ status: nextStatus }).eq("id", warehouseId);
    if (updateError) {
      showToast(safeErrorMessage(updateError, "Unable to update warehouse status."));
      return;
    }
    showToast("Warehouse status updated.");
    void loadData();
  };

  return (
    <section style={styles.page}>
      <InventoryHeader title="Warehouse Management" subtitle="Manage warehouse network, capacities, storage readiness, and transfer points." />

      <div style={styles.kpis}>
        <article style={styles.kpi}><p style={styles.kpiLabel}>Warehouses</p><h3 style={styles.kpiValue}>{warehouses.length}</h3></article>
        <article style={styles.kpi}><p style={styles.kpiLabel}>Total Capacity</p><h3 style={styles.kpiValue}>{summary.totalCapacity}</h3></article>
        <article style={styles.kpi}><p style={styles.kpiLabel}>Stock Quantity</p><h3 style={styles.kpiValue}>{summary.totalQty}</h3></article>
        <article style={styles.kpi}><p style={styles.kpiLabel}>Utilization</p><h3 style={styles.kpiValue}>{summary.totalCapacity ? Math.round((summary.totalQty / summary.totalCapacity) * 100) : 0}%</h3></article>
      </div>

      <form style={styles.formCard} onSubmit={createWarehouse}>
        <h3 style={styles.title}><Plus size={14} /> Add Warehouse</h3>
        <div style={styles.formGrid}>
          <input style={styles.input} placeholder="Code" value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
          <input style={styles.input} placeholder="Warehouse Name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <input style={styles.input} placeholder="Location" value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} />
          <input style={styles.input} type="number" placeholder="Capacity Units" value={form.capacity_units} onChange={(event) => setForm((prev) => ({ ...prev, capacity_units: event.target.value }))} />
          <select style={styles.input} value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="Active">Active</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <button type="submit" style={styles.button}>Save Warehouse</button>
      </form>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["Code", "Name", "Location", "Capacity", "Inventory Count", "Stock Value", "Manager", "Status", "Actions"].map((header) => (
                <th key={header} style={styles.th}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {warehouses.map((warehouse, index) => {
              const warehouseItems = items.filter((row) => row.warehouse_id === warehouse.id);
              const inventoryCount = warehouseItems.length;
              const stockValue = warehouseItems.reduce((sum, row) => sum + Number(row.available_quantity || 0) * Number(row.purchase_cost || 0), 0);

              return (
                <tr key={warehouse.id} style={index % 2 ? styles.altRow : undefined}>
                  <td style={styles.td}>{warehouse.code}</td>
                  <td style={styles.td}>{warehouse.name}</td>
                  <td style={styles.td}>{warehouse.location || "-"}</td>
                  <td style={styles.td}>{warehouse.capacity_units || 0}</td>
                  <td style={styles.td}>{inventoryCount}</td>
                  <td style={styles.td}>${stockValue.toLocaleString()}</td>
                  <td style={styles.td}>{warehouse.manager_employee_id || "-"}</td>
                  <td style={styles.td}><span style={styles.badge}>{warehouse.status || "Active"}</span></td>
                  <td style={styles.td}><button type="button" style={styles.linkButton} onClick={() => void toggleStatus(warehouse.id, warehouse.status)}>Toggle Status</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isLoading ? <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Loading warehouse dashboard...</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
      {toast ? <div style={styles.toast}>{toast}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 },
  kpi: {
    borderRadius: 12,
    border: "1px solid #dbeafe",
    background: "#fff",
    padding: 10,
    boxShadow: "0 12px 22px rgba(15, 23, 42, 0.05)",
  },
  kpiLabel: { margin: 0, color: "#475569", fontSize: 12, fontWeight: 700 },
  kpiValue: { margin: "4px 0 0", color: "#0f172a", fontSize: 24, fontWeight: 900 },
  formCard: { borderRadius: 14, border: "1px solid #dbeafe", background: "#fff", padding: 12, display: "grid", gap: 10 },
  title: { margin: 0, color: "#0f172a", fontSize: 15, fontWeight: 900, display: "inline-flex", gap: 6, alignItems: "center" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 },
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
  tableWrap: { borderRadius: 14, border: "1px solid #dbeafe", background: "#fff", overflow: "auto" },
  table: { borderCollapse: "collapse", width: "100%", minWidth: 980 },
  th: { textAlign: "left", padding: "10px", fontSize: 11, color: "#1e3a8a", textTransform: "uppercase", borderBottom: "1px solid #bfdbfe" },
  td: { padding: "9px 10px", fontSize: 12, color: "#0f172a", borderBottom: "1px solid #e2e8f0" },
  altRow: { background: "#f8fbff" },
  badge: { borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 800, background: "#e0f2fe", color: "#0c4a6e", border: "1px solid #bae6fd" },
  linkButton: { border: "none", background: "transparent", color: "#2563eb", fontWeight: 800, cursor: "pointer" },
  loading: { borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", padding: "8px 10px", display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 700 },
  error: { borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: "8px 10px", fontWeight: 700 },
  toast: { position: "fixed", right: 24, bottom: 24, borderRadius: 10, background: "#1d4ed8", color: "white", padding: "10px 12px", fontWeight: 700, fontSize: 12 },
};

