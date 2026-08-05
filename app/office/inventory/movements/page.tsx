"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { InventoryDataTable, InventoryHeader } from "../../../components/inventory";
import { fetchInventoryItems, fetchStockMovements, inventoryTables, safeErrorMessage } from "../../../lib/inventory";
import { supabase } from "../../../lib/supabase";

const movementTypes = ["Receive", "Issue", "Transfer", "Return", "Adjustment", "Damage", "Lost", "Disposal"] as const;

export default function InventoryMovementsPage() {
  const searchParams = useSearchParams();
  const initialItem = searchParams.get("item") || "";
  const initialType = searchParams.get("type") || "Receive";

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movements, setMovements] = useState<Awaited<ReturnType<typeof fetchStockMovements>>>([]);
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchInventoryItems>>>([]);
  const [form, setForm] = useState({
    inventory_item_id: initialItem,
    movement_type: movementTypes.includes(initialType as any) ? initialType : "Receive",
    quantity: "1",
    reference_number: "",
    status: "Posted",
    notes: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [movementRows, itemRows] = await Promise.all([fetchStockMovements(500), fetchInventoryItems()]);
      setMovements(movementRows);
      setItems(itemRows);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load stock movements."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createMovement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      inventory_item_id: Number(form.inventory_item_id || 0),
      movement_type: form.movement_type,
      quantity: Number(form.quantity || 0),
      reference_number: form.reference_number || null,
      status: form.status,
      notes: form.notes || null,
      created_by: "inventory-module",
    };

    if (!payload.inventory_item_id || payload.quantity <= 0) {
      setError("Item and positive quantity are required.");
      return;
    }

    const { error: insertError } = await supabase.from(inventoryTables.movements).insert([payload]);
    if (insertError) {
      setError(safeErrorMessage(insertError, "Unable to create stock movement."));
      return;
    }

    setForm({
      inventory_item_id: form.inventory_item_id,
      movement_type: "Receive",
      quantity: "1",
      reference_number: "",
      status: "Posted",
      notes: "",
    });
    setError(null);
    void loadData();
  };

  const rows = useMemo(() => {
    return movements.map((row) => ({
      Date: row.created_at ? new Date(row.created_at).toLocaleString() : "-",
      Type: row.movement_type,
      SKU: row.inventory_items?.sku || "-",
      "Item Name": row.inventory_items?.item_name || row.inventory_item_id,
      Quantity: row.quantity,
      Warehouse: row.warehouses?.name || row.warehouse_id || "-",
      "Reference Number": row.reference_number || "-",
      Notes: row.notes || "-",
      Status: row.status || "Posted",
      User: row.created_by || "system",
    }));
  }, [movements]);

  return (
    <section style={styles.page}>
      <InventoryHeader title="Stock Movements" subtitle="Track every inventory transaction with movement type, warehouse, quantity, reference, status, and user traceability." />

      <form style={styles.formCard} onSubmit={createMovement}>
        <h3 style={styles.title}><Plus size={14} /> Record Movement</h3>
        <div style={styles.grid}>
          <select style={styles.input} value={form.inventory_item_id} onChange={(event) => setForm((prev) => ({ ...prev, inventory_item_id: event.target.value }))}>
            <option value="">Select Item</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.item_name} ({item.sku})</option>
            ))}
          </select>
          <select style={styles.input} value={form.movement_type} onChange={(event) => setForm((prev) => ({ ...prev, movement_type: event.target.value }))}>
            {movementTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input style={styles.input} type="number" min={1} placeholder="Quantity" value={form.quantity} onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))} />
          <input style={styles.input} placeholder="Reference Number" value={form.reference_number} onChange={(event) => setForm((prev) => ({ ...prev, reference_number: event.target.value }))} />
          <input style={styles.input} placeholder="Status" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} />
          <input style={styles.input} placeholder="Notes" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </div>
        <button type="submit" style={styles.button}>Save Movement</button>
      </form>

      <InventoryDataTable
        columns={["Date", "Type", "SKU", "Item Name", "Quantity", "Warehouse", "Reference Number", "Notes", "Status", "User"]}
        rows={rows}
      />

      {isLoading ? <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Loading movements...</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  formCard: { borderRadius: 14, border: "1px solid #dbeafe", background: "#fff", padding: 12, display: "grid", gap: 10 },
  title: { margin: 0, color: "#0f172a", fontSize: 15, fontWeight: 900, display: "inline-flex", gap: 6, alignItems: "center" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 },
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

