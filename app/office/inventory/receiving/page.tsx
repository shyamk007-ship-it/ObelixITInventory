"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2, Plus } from "lucide-react";
import { InventoryDataTable, InventoryHeader } from "../../../components/inventory";
import { fetchPurchaseReceipts, fetchSuppliers, inventoryTables, safeErrorMessage } from "../../../lib/inventory";
import { supabase } from "../../../lib/supabase";

export default function InventoryReceivingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchPurchaseReceipts>>>([]);
  const [suppliers, setSuppliers] = useState<Awaited<ReturnType<typeof fetchSuppliers>>>([]);
  const [form, setForm] = useState({
    grn_number: "",
    po_number: "",
    supplier_id: "",
    receipt_date: "",
    invoice_number: "",
    invoice_url: "",
    delivery_note_url: "",
    status: "Pending",
    remarks: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [receiptRows, supplierRows] = await Promise.all([fetchPurchaseReceipts(300), fetchSuppliers()]);
      setRows(receiptRows);
      setSuppliers(supplierRows);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load GRN records."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createReceipt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      grn_number: form.grn_number.trim() || `GRN-${Date.now()}`,
      po_number: form.po_number || null,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      receipt_date: form.receipt_date || null,
      invoice_number: form.invoice_number || null,
      invoice_url: form.invoice_url || null,
      delivery_note_url: form.delivery_note_url || null,
      status: form.status,
      remarks: form.remarks || null,
    };

    const { error: insertError } = await supabase.from(inventoryTables.receipts).insert([payload]);
    if (insertError) {
      setError(safeErrorMessage(insertError, "Unable to create GRN receipt."));
      return;
    }

    setForm({ grn_number: "", po_number: "", supplier_id: "", receipt_date: "", invoice_number: "", invoice_url: "", delivery_note_url: "", status: "Pending", remarks: "" });
    void loadData();
  };

  const updateStatus = async (id: number, status: string) => {
    const { error: updateError } = await supabase.from(inventoryTables.receipts).update({ status }).eq("id", id);
    if (updateError) {
      setError(safeErrorMessage(updateError, "Unable to update GRN status."));
      return;
    }
    void loadData();
  };

  const supplierMap = useMemo(() => {
    const map = new Map<number, string>();
    suppliers.forEach((supplier) => map.set(supplier.id, supplier.name));
    return map;
  }, [suppliers]);

  const tableRows = rows.map((row) => ({
    "GRN #": row.grn_number,
    "PO #": row.po_number || "-",
    Supplier: supplierMap.get(row.supplier_id || 0) || "-",
    "Receipt Date": row.receipt_date || "-",
    "Invoice #": row.invoice_number || "-",
    Status: row.status || "Pending",
    Remarks: row.remarks || "-",
    Created: row.created_at ? new Date(row.created_at).toLocaleString() : "-",
  }));

  return (
    <section style={styles.page}>
      <InventoryHeader title="Purchase Receiving (GRN)" subtitle="Receive purchase orders, handle partial or complete receipts, reject damaged items, and keep GRN documentation audit-ready." />

      <form style={styles.formCard} onSubmit={createReceipt}>
        <h3 style={styles.title}><Plus size={14} /> Create GRN</h3>
        <div style={styles.grid}>
          <input style={styles.input} placeholder="GRN Number" value={form.grn_number} onChange={(event) => setForm((prev) => ({ ...prev, grn_number: event.target.value }))} />
          <input style={styles.input} placeholder="PO Number" value={form.po_number} onChange={(event) => setForm((prev) => ({ ...prev, po_number: event.target.value }))} />
          <select style={styles.input} value={form.supplier_id} onChange={(event) => setForm((prev) => ({ ...prev, supplier_id: event.target.value }))}>
            <option value="">Supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
          <input style={styles.input} type="date" value={form.receipt_date} onChange={(event) => setForm((prev) => ({ ...prev, receipt_date: event.target.value }))} />
          <input style={styles.input} placeholder="Invoice Number" value={form.invoice_number} onChange={(event) => setForm((prev) => ({ ...prev, invoice_number: event.target.value }))} />
          <select style={styles.input} value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial Receive</option>
            <option value="Completed">Complete Receive</option>
            <option value="Rejected">Rejected Items</option>
            <option value="Damaged">Damaged Items</option>
          </select>
          <input style={styles.input} placeholder="Invoice URL" value={form.invoice_url} onChange={(event) => setForm((prev) => ({ ...prev, invoice_url: event.target.value }))} />
          <input style={styles.input} placeholder="Delivery Note URL" value={form.delivery_note_url} onChange={(event) => setForm((prev) => ({ ...prev, delivery_note_url: event.target.value }))} />
          <input style={styles.input} placeholder="Remarks" value={form.remarks} onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))} />
        </div>
        <button type="submit" style={styles.button}>Save GRN</button>
      </form>

      <div style={styles.actionWrap}>
        {rows.slice(0, 6).map((row) => (
          <article key={row.id} style={styles.actionCard}>
            <p style={styles.actionTitle}>{row.grn_number}</p>
            <p style={styles.actionMeta}>{row.po_number || "No PO"} • {supplierMap.get(row.supplier_id || 0) || "Supplier"}</p>
            <div style={styles.actionButtons}>
              {["Pending", "Partial", "Completed", "Rejected", "Damaged"].map((status) => (
                <button key={status} type="button" style={styles.linkButton} onClick={() => void updateStatus(row.id, status)}>{status}</button>
              ))}
              <button type="button" style={styles.linkButton} onClick={() => window.print()}>Print GRN</button>
            </div>
          </article>
        ))}
      </div>

      <InventoryDataTable columns={["GRN #", "PO #", "Supplier", "Receipt Date", "Invoice #", "Status", "Remarks", "Created"]} rows={tableRows} />

      {isLoading ? <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Loading GRN records...</div> : null}
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
  actionWrap: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 },
  actionCard: { borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fbff", padding: 10, display: "grid", gap: 8 },
  actionTitle: { margin: 0, fontSize: 14, fontWeight: 900, color: "#0f172a" },
  actionMeta: { margin: 0, fontSize: 12, color: "#475569" },
  actionButtons: { display: "flex", flexWrap: "wrap", gap: 6 },
  linkButton: { border: "1px solid #bfdbfe", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontSize: 11, fontWeight: 800, padding: "4px 8px", cursor: "pointer" },
  loading: { borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", padding: "8px 10px", display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 700 },
  error: { borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: "8px 10px", fontWeight: 700 },
};

