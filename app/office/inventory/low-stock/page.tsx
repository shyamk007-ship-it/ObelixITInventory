"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { InventoryDataTable, InventoryHeader } from "../../../components/inventory";
import { fetchInventoryItems, inventoryTables, safeErrorMessage } from "../../../lib/inventory";
import { supabase } from "../../../lib/supabase";

export default function InventoryLowStockPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchInventoryItems>>>([]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await fetchInventoryItems());
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load low stock center."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const lowStockRows = useMemo(() => {
    return items.filter((item) => Number(item.available_quantity || 0) <= Number(item.reorder_level || 0));
  }, [items]);

  const outOfStockRows = useMemo(() => {
    return items.filter((item) => Number(item.available_quantity || 0) <= 0);
  }, [items]);

  const criticalRows = useMemo(() => {
    return items.filter((item) => Number(item.available_quantity || 0) <= Number(item.safety_stock || 0));
  }, [items]);

  const generatePurchaseRequest = async () => {
    if (!lowStockRows.length) return;

    const requestNumber = `AUTO-REQ-${Date.now()}`;
    const notes = lowStockRows
      .slice(0, 10)
      .map((row) => `${row.sku}:${Math.max(0, Number(row.reorder_level || 0) - Number(row.available_quantity || 0))}`)
      .join(", ");

    const { error: insertError } = await supabase.from(inventoryTables.requests).insert([
      {
        request_number: requestNumber,
        request_type: "Auto Purchase Recommendation",
        requester_department: "Inventory",
        status: "Pending",
        priority: "High",
        notes: `Auto generated from Low Stock Center: ${notes}`,
      },
    ]);

    if (insertError) {
      setError(safeErrorMessage(insertError, "Unable to auto generate purchase request."));
      return;
    }

    setError(null);
  };

  const tableRows = lowStockRows.map((row) => ({
    SKU: row.sku,
    Item: row.item_name,
    Category: row.category || "-",
    Warehouse: row.warehouse_id || "-",
    Available: row.available_quantity,
    Reorder: row.reorder_level || 0,
    Safety: row.safety_stock || 0,
    Recommendation: `Order ${Math.max(0, Number(row.reorder_level || 0) - Number(row.available_quantity || 0))}`,
    Supplier: row.supplier_id || "-",
    "Transfer Recommendation": row.warehouse_id ? `Check warehouse distribution for item ${row.sku}` : "Assign warehouse",
  }));

  return (
    <section style={styles.page}>
      <InventoryHeader title="Low Stock Center" subtitle="Central action hub for low stock, out-of-stock, and critical inventory with purchase, supplier, and transfer recommendations." />

      <div style={styles.summaryGrid}>
        <article style={styles.summaryCard}><p style={styles.label}>Below Reorder Level</p><h3 style={styles.value}>{lowStockRows.length}</h3></article>
        <article style={styles.summaryCard}><p style={styles.label}>Out of Stock</p><h3 style={styles.value}>{outOfStockRows.length}</h3></article>
        <article style={styles.summaryCard}><p style={styles.label}>Critical Stock</p><h3 style={styles.value}>{criticalRows.length}</h3></article>
        <article style={styles.summaryCard}><p style={styles.label}>Auto Actions</p><button type="button" style={styles.actionButton} onClick={() => void generatePurchaseRequest()}>Auto Generate Purchase Request</button></article>
      </div>

      <InventoryDataTable
        columns={[
          "SKU",
          "Item",
          "Category",
          "Warehouse",
          "Available",
          "Reorder",
          "Safety",
          "Recommendation",
          "Supplier",
          "Transfer Recommendation",
        ]}
        rows={tableRows}
      />

      {isLoading ? <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Loading low stock recommendations...</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 },
  summaryCard: { borderRadius: 12, border: "1px solid #dbeafe", background: "#fff", padding: 10, display: "grid", gap: 6 },
  label: { margin: 0, color: "#475569", fontSize: 12, fontWeight: 700 },
  value: { margin: 0, color: "#0f172a", fontSize: 24, fontWeight: 900 },
  actionButton: { border: "1px solid #1d4ed8", background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "white", borderRadius: 10, padding: "8px 10px", fontWeight: 800, fontSize: 12, cursor: "pointer" },
  loading: { borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", padding: "8px 10px", display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 700 },
  error: { borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: "8px 10px", fontWeight: 700 },
};

