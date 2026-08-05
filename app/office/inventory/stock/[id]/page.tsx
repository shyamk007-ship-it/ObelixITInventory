"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { InventoryHeader, InventoryTimeline } from "../../../../components/inventory";
import { fetchInventoryItems, fetchStockMovements, safeErrorMessage } from "../../../../lib/inventory";
import { supabase } from "../../../../lib/supabase";

type ItemRow = Awaited<ReturnType<typeof fetchInventoryItems>>[number];

type PurchaseRow = {
  id: number;
  po_number?: string | null;
  vendor_name?: string | null;
  purchase_date?: string | null;
  total_amount?: number | null;
  status?: string | null;
};

type AssignmentRow = {
  id: number;
  status?: string | null;
  assigned_date?: string | null;
  employees?: { full_name?: string | null } | null;
};

export default function InventoryItemDetailsPage() {
  const params = useParams<{ id: string }>();
  const itemId = Number(params?.id || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<ItemRow | null>(null);
  const [movements, setMovements] = useState<Awaited<ReturnType<typeof fetchStockMovements>>>([]);
  const [purchaseRows, setPurchaseRows] = useState<PurchaseRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [items, movementRows, poResponse, assignmentResponse] = await Promise.all([
          fetchInventoryItems(),
          fetchStockMovements(400),
          supabase.from("asset_purchase_orders").select("id, po_number, vendor_name, purchase_date, total_amount, status").order("purchase_date", { ascending: false }).limit(20),
          supabase.from("assignment_records").select("id, status, assigned_date, employees(full_name)").eq("asset_id", itemId).order("assigned_date", { ascending: false }).limit(20),
        ]);

        if (!active) return;
        setItem(items.find((row) => row.id === itemId) || null);
        setMovements(movementRows.filter((row) => row.inventory_item_id === itemId));
        setPurchaseRows((poResponse.data || []) as PurchaseRow[]);
        setAssignments((assignmentResponse.data || []) as AssignmentRow[]);
      } catch (loadError) {
        if (!active) return;
        setError(safeErrorMessage(loadError, "Unable to load inventory item details."));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    if (itemId > 0) {
      void load();
    } else {
      setIsLoading(false);
      setError("Invalid inventory item id.");
    }

    return () => {
      active = false;
    };
  }, [itemId]);

  const movementTimeline = useMemo(() => {
    return movements.map((movement) => ({
      label: `${movement.movement_type} • Qty ${movement.quantity}`,
      detail: `${movement.reference_number || "No Ref"} • ${movement.status || "Posted"}`,
      when: movement.created_at ? new Date(movement.created_at).toLocaleString() : "-",
    }));
  }, [movements]);

  const activityTimeline = useMemo(() => {
    const assignmentEvents = assignments.map((row) => ({
      label: `Asset Link: ${row.status || "Assigned"}`,
      detail: row.employees?.full_name || "Employee",
      when: row.assigned_date || "-",
    }));

    const purchaseEvents = purchaseRows.map((row) => ({
      label: `Purchase: ${row.po_number || "PO"}`,
      detail: `${row.vendor_name || "Vendor"} • ${row.status || "Draft"}`,
      when: row.purchase_date || "-",
    }));

    return [...assignmentEvents, ...purchaseEvents].slice(0, 12);
  }, [assignments, purchaseRows]);

  if (isLoading) {
    return (
      <section style={styles.page}>
        <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Loading inventory item...</div>
      </section>
    );
  }

  if (error || !item) {
    return (
      <section style={styles.page}>
        <InventoryHeader title="Inventory Item" subtitle="Detailed stock intelligence and lifecycle traceability." />
        <p style={styles.error}>{error || "Item not found."}</p>
      </section>
    );
  }

  const inventoryValue = Number(item.available_quantity || 0) * Number(item.purchase_cost || 0);

  return (
    <section style={styles.page}>
      <InventoryHeader
        title={item.item_name}
        subtitle={`SKU ${item.sku} • Category ${item.category || "Uncategorized"} • Warehouse ${item.warehouse_id || "N/A"}`}
      />

      <div style={styles.grid}>
        <article style={styles.card}>
          <h3 style={styles.title}>General Information</h3>
          <p style={styles.row}><strong>SKU:</strong> {item.sku}</p>
          <p style={styles.row}><strong>Barcode:</strong> {item.barcode || "-"}</p>
          <p style={styles.row}><strong>QR Code:</strong> {item.qr_code || "-"}</p>
          <p style={styles.row}><strong>Item Name:</strong> {item.item_name}</p>
          <p style={styles.row}><strong>Category:</strong> {item.category || "-"}</p>
          <p style={styles.row}><strong>Brand:</strong> {item.brand || "-"}</p>
          <p style={styles.row}><strong>Model:</strong> {item.model || "-"}</p>
          <p style={styles.row}><strong>Status:</strong> {item.status || "Active"}</p>
        </article>

        <article style={styles.card}>
          <h3 style={styles.title}>Specifications</h3>
          <p style={styles.row}>{item.specifications || "No specification text added."}</p>
          <h4 style={styles.subtitle}>Warehouse Details</h4>
          <p style={styles.row}><strong>Warehouse:</strong> {item.warehouse_id || "-"}</p>
          <p style={styles.row}><strong>Bin Location:</strong> {item.bin_id || "-"}</p>
          <p style={styles.row}><strong>Unit:</strong> {item.unit || "Nos"}</p>
        </article>

        <article style={styles.card}>
          <h3 style={styles.title}>Stock Levels</h3>
          <p style={styles.row}><strong>Quantity:</strong> {item.quantity}</p>
          <p style={styles.row}><strong>Reserved Quantity:</strong> {item.reserved_quantity}</p>
          <p style={styles.row}><strong>Available Quantity:</strong> {item.available_quantity}</p>
          <p style={styles.row}><strong>Minimum Stock:</strong> {item.min_stock || 0}</p>
          <p style={styles.row}><strong>Maximum Stock:</strong> {item.max_stock || 0}</p>
          <p style={styles.row}><strong>Safety Stock:</strong> {item.safety_stock || 0}</p>
          <p style={styles.row}><strong>Reorder Level:</strong> {item.reorder_level || 0}</p>
        </article>

        <article style={styles.card}>
          <h3 style={styles.title}>Supplier & Purchase</h3>
          <p style={styles.row}><strong>Supplier Id:</strong> {item.supplier_id || "-"}</p>
          <p style={styles.row}><strong>Purchase Cost:</strong> ${Number(item.purchase_cost || 0).toLocaleString()}</p>
          <p style={styles.row}><strong>Inventory Value:</strong> ${inventoryValue.toLocaleString()}</p>
          <h4 style={styles.subtitle}>Purchase History</h4>
          {purchaseRows.slice(0, 6).map((row) => (
            <p key={row.id} style={styles.row}>{row.po_number || "PO"} • {row.vendor_name || "Vendor"} • ${Number(row.total_amount || 0).toLocaleString()}</p>
          ))}
        </article>

        <article style={styles.card}>
          <h3 style={styles.title}>Images & Documents</h3>
          <p style={styles.row}><strong>Images:</strong> {(item.images || []).length}</p>
          <p style={styles.row}><strong>Documents:</strong> {(item.documents || []).length}</p>
          <p style={styles.row}><strong>Attachments:</strong> {(item.documents || []).join(", ") || "None"}</p>
          <p style={styles.row}><strong>Notes:</strong> {item.notes || "-"}</p>
        </article>

        <article style={styles.card}>
          <h3 style={styles.title}>Linked Assets</h3>
          <p style={styles.row}><strong>Asset Link:</strong> {item.asset_id || "Not linked"}</p>
          <p style={styles.row}><strong>Activity Log:</strong> {item.updated_at ? new Date(item.updated_at).toLocaleString() : "-"}</p>
          <p style={styles.row}><strong>Audit History:</strong> Movement and assignment events shown in timelines.</p>
        </article>
      </div>

      <div style={styles.timelineGrid}>
        <InventoryTimeline title="Stock Movement Timeline" rows={movementTimeline} />
        <InventoryTimeline title="Activity Log" rows={activityTimeline} />
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 10,
  },
  card: {
    borderRadius: 14,
    border: "1px solid #dbeafe",
    background: "#ffffff",
    boxShadow: "0 14px 26px rgba(15, 23, 42, 0.06)",
    padding: 12,
    display: "grid",
    gap: 6,
    alignContent: "start",
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 900,
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#1e3a8a",
    fontSize: 13,
    fontWeight: 800,
  },
  row: {
    margin: 0,
    color: "#334155",
    fontSize: 13,
    lineHeight: 1.5,
  },
  timelineGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 10,
  },
  loading: {
    borderRadius: 10,
    padding: "8px 10px",
    border: "1px solid #bfdbfe",
    color: "#1e3a8a",
    background: "#eff6ff",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 700,
  },
  error: {
    borderRadius: 10,
    padding: "8px 10px",
    border: "1px solid #fecaca",
    color: "#9f1239",
    background: "#fff1f2",
    fontWeight: 700,
  },
};
