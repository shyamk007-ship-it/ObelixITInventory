"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { InventoryDataTable, InventoryHeader } from "../../../components/inventory";
import {
  fetchInventoryItems,
  fetchStockTransfers,
  fetchWarehouses,
  inventoryTables,
  safeErrorMessage,
} from "../../../lib/inventory";
import { supabase } from "../../../lib/supabase";

export default function InventoryTransfersPage() {
  const searchParams = useSearchParams();
  const initialItem = searchParams.get("item") || "";

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchStockTransfers>>>([]);
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchInventoryItems>>>([]);
  const [warehouses, setWarehouses] = useState<Awaited<ReturnType<typeof fetchWarehouses>>>([]);
  const [form, setForm] = useState({
    transfer_number: "",
    inventory_item_id: initialItem,
    from_warehouse_id: "",
    to_warehouse_id: "",
    quantity: "1",
    transfer_type: "Warehouse to Warehouse",
    notes: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [transferRows, itemRows, warehouseRows] = await Promise.all([
        fetchStockTransfers(250),
        fetchInventoryItems(),
        fetchWarehouses(),
      ]);
      setRows(transferRows);
      setItems(itemRows);
      setWarehouses(warehouseRows);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load transfers."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const warehouseMap = useMemo(() => {
    const map = new Map<number, string>();
    warehouses.forEach((warehouse) => map.set(warehouse.id, warehouse.name));
    return map;
  }, [warehouses]);

  const createTransfer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      transfer_number: form.transfer_number.trim() || `TRF-${Date.now()}`,
      inventory_item_id: Number(form.inventory_item_id || 0),
      from_warehouse_id: Number(form.from_warehouse_id || 0),
      to_warehouse_id: Number(form.to_warehouse_id || 0),
      quantity: Number(form.quantity || 0),
      transfer_type: form.transfer_type,
      status: "Pending",
      notes: form.notes || null,
    };

    if (!payload.inventory_item_id || !payload.from_warehouse_id || !payload.to_warehouse_id || payload.quantity <= 0) {
      setError("Item, source warehouse, target warehouse, and positive quantity are required.");
      return;
    }

    const { error: insertError } = await supabase.from(inventoryTables.transfers).insert([payload]);
    if (insertError) {
      setError(safeErrorMessage(insertError, "Unable to create stock transfer."));
      return;
    }

    setForm({
      transfer_number: "",
      inventory_item_id: form.inventory_item_id,
      from_warehouse_id: "",
      to_warehouse_id: "",
      quantity: "1",
      transfer_type: "Warehouse to Warehouse",
      notes: "",
    });
    void loadData();
  };

  const updateStatus = async (id: number, status: string) => {
    const { error: updateError } = await supabase.from(inventoryTables.transfers).update({ status }).eq("id", id);
    if (updateError) {
      setError(safeErrorMessage(updateError, "Unable to update transfer status."));
      return;
    }
    void loadData();
  };

  const tableRows = rows.map((row) => ({
    "Transfer #": row.transfer_number,
    Item: row.inventory_items?.item_name || row.inventory_item_id,
    "From Warehouse": warehouseMap.get(row.from_warehouse_id) || row.from_warehouse_id,
    "To Warehouse": warehouseMap.get(row.to_warehouse_id) || row.to_warehouse_id,
    Quantity: row.quantity,
    "Transfer Type": row.transfer_type || "Warehouse",
    Status: row.status || "Pending",
    Notes: row.notes || "-",
    Created: row.created_at ? new Date(row.created_at).toLocaleString() : "-",
  }));

  return (
    <section style={styles.page}>
      <InventoryHeader title="Stock Transfers" subtitle="Warehouse-to-warehouse, department, and employee transfer workflows with approvals and transfer tracking." />

      <form style={styles.formCard} onSubmit={createTransfer}>
        <h3 style={styles.title}><Plus size={14} /> Create Transfer</h3>
        <div style={styles.grid}>
          <input style={styles.input} placeholder="Transfer Number (optional)" value={form.transfer_number} onChange={(event) => setForm((prev) => ({ ...prev, transfer_number: event.target.value }))} />
          <select style={styles.input} value={form.inventory_item_id} onChange={(event) => setForm((prev) => ({ ...prev, inventory_item_id: event.target.value }))}>
            <option value="">Select Item</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.item_name} ({item.sku})</option>
            ))}
          </select>
          <select style={styles.input} value={form.from_warehouse_id} onChange={(event) => setForm((prev) => ({ ...prev, from_warehouse_id: event.target.value }))}>
            <option value="">From Warehouse</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
            ))}
          </select>
          <select style={styles.input} value={form.to_warehouse_id} onChange={(event) => setForm((prev) => ({ ...prev, to_warehouse_id: event.target.value }))}>
            <option value="">To Warehouse</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
            ))}
          </select>
          <input style={styles.input} type="number" min={1} placeholder="Quantity" value={form.quantity} onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))} />
          <select style={styles.input} value={form.transfer_type} onChange={(event) => setForm((prev) => ({ ...prev, transfer_type: event.target.value }))}>
            <option value="Warehouse to Warehouse">Warehouse to Warehouse</option>
            <option value="Department Transfer">Department Transfer</option>
            <option value="Employee Transfer">Employee Transfer</option>
          </select>
          <input style={styles.input} placeholder="Notes" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </div>
        <button type="submit" style={styles.button}>Save Transfer</button>
      </form>

      <div style={styles.approvalWrap}>
        {rows.slice(0, 6).map((row) => (
          <article key={row.id} style={styles.approvalCard}>
            <p style={styles.approvalTitle}>{row.transfer_number}</p>
            <p style={styles.approvalMeta}>{row.inventory_items?.item_name || row.inventory_item_id} • Qty {row.quantity}</p>
            <div style={styles.approvalButtons}>
              {[
                "Pending",
                "Approved",
                "In Transit",
                "Completed",
                "Rejected",
              ].map((status) => (
                <button key={status} type="button" style={styles.linkButton} onClick={() => void updateStatus(row.id, status)}>{status}</button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <InventoryDataTable
        columns={["Transfer #", "Item", "From Warehouse", "To Warehouse", "Quantity", "Transfer Type", "Status", "Notes", "Created"]}
        rows={tableRows}
      />

      {isLoading ? <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Loading transfers...</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  formCard: { borderRadius: 14, border: "1px solid #dbeafe", background: "#fff", padding: 12, display: "grid", gap: 10 },
  title: { margin: 0, color: "#0f172a", fontSize: 15, fontWeight: 900, display: "inline-flex", gap: 6, alignItems: "center" },
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
  approvalWrap: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 },
  approvalCard: { borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fbff", padding: 10, display: "grid", gap: 8 },
  approvalTitle: { margin: 0, fontSize: 14, fontWeight: 900, color: "#0f172a" },
  approvalMeta: { margin: 0, fontSize: 12, color: "#475569" },
  approvalButtons: { display: "flex", flexWrap: "wrap", gap: 6 },
  linkButton: { border: "1px solid #bfdbfe", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontSize: 11, fontWeight: 800, padding: "4px 8px", cursor: "pointer" },
  loading: { borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", padding: "8px 10px", display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 700 },
  error: { borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: "8px 10px", fontWeight: 700 },
};

