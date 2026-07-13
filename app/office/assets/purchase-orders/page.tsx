"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import OfficeAssetModuleNav from "../../../components/office/OfficeAssetModuleNav";
import { supabase } from "../../../lib/supabase";

type PurchaseOrderRow = {
  id: number;
  po_number: string;
  vendor_name?: string | null;
  purchase_date?: string | null;
  total_amount?: number | null;
  status?: string | null;
  invoice_url?: string | null;
  remarks?: string | null;
};

export default function OfficeAssetPurchaseOrdersPage() {
  const [rows, setRows] = useState<PurchaseOrderRow[]>([]);
  const [form, setForm] = useState({ po_number: "", vendor_name: "", purchase_date: "", total_amount: "", status: "Draft", remarks: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const load = async () => {
    const response = await supabase
      .from("asset_purchase_orders")
      .select("id, po_number, vendor_name, purchase_date, total_amount, status, invoice_url, remarks")
      .order("purchase_date", { ascending: false });

    if (response.error) {
      setRows([]);
      return;
    }

    setRows((response.data as PurchaseOrderRow[]) || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const uploadInvoice = async (): Promise<string | null> => {
    if (!invoiceFile) return null;
    setUploading(true);
    const path = `purchase-orders/${Date.now()}-${invoiceFile.name}`;
    const upload = await supabase.storage.from("asset-documents").upload(path, invoiceFile, { upsert: true });
    setUploading(false);
    if (upload.error) return null;
    const publicUrl = supabase.storage.from("asset-documents").getPublicUrl(path).data.publicUrl;
    return publicUrl;
  };

  const save = async () => {
    if (!form.po_number.trim() || !form.vendor_name.trim()) {
      showToast("PO number and vendor are required.");
      return;
    }

    const invoiceUrl = await uploadInvoice();
    const payload = {
      po_number: form.po_number,
      vendor_name: form.vendor_name,
      purchase_date: form.purchase_date || null,
      total_amount: form.total_amount ? Number(form.total_amount) : null,
      status: form.status || "Draft",
      invoice_url: invoiceUrl,
      remarks: form.remarks || null,
    };

    if (editingId) {
      const response = await supabase.from("asset_purchase_orders").update(payload).eq("id", editingId);
      if (response.error) {
        showToast("Run office_asset_management_schema.sql to enable purchase order management.");
        return;
      }
      showToast("Purchase order updated.");
    } else {
      const response = await supabase.from("asset_purchase_orders").insert([payload]);
      if (response.error) {
        showToast("Run office_asset_management_schema.sql to enable purchase order management.");
        return;
      }
      showToast("Purchase order created.");
    }

    setEditingId(null);
    setInvoiceFile(null);
    setForm({ po_number: "", vendor_name: "", purchase_date: "", total_amount: "", status: "Draft", remarks: "" });
    await load();
  };

  const remove = async (row: PurchaseOrderRow) => {
    if (!window.confirm(`Delete purchase order ${row.po_number}?`)) return;
    const response = await supabase.from("asset_purchase_orders").delete().eq("id", row.id);
    if (response.error) {
      showToast("Unable to delete purchase order.");
      return;
    }
    showToast("Purchase order deleted.");
    await load();
  };

  const totalValue = useMemo(() => rows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0), [rows]);

  return (
    <div style={styles.page}>
      <OfficeAssetModuleNav />
      <section style={styles.headerCard}>
        <div>
          <p style={styles.eyebrow}>Purchase Orders</p>
          <h2 style={styles.title}>PO Management</h2>
          <p style={styles.subtitle}>Manage office procurement, vendor purchases, and invoice documentation.</p>
        </div>
        <div style={styles.kpiRow}>
          <Kpi label="PO Count" value={rows.length} />
          <Kpi label="PO Value" value={`$${totalValue.toLocaleString()}`} />
        </div>
      </section>

      <section style={styles.grid}>
        <article style={styles.card}>
          <h3 style={styles.cardTitle}>{editingId ? "Edit PO" : "Create PO"}</h3>
          <input value={form.po_number} onChange={(event) => setForm((prev) => ({ ...prev, po_number: event.target.value }))} placeholder="PO Number" style={styles.input} />
          <input value={form.vendor_name} onChange={(event) => setForm((prev) => ({ ...prev, vendor_name: event.target.value }))} placeholder="Vendor" style={styles.input} />
          <input type="date" value={form.purchase_date} onChange={(event) => setForm((prev) => ({ ...prev, purchase_date: event.target.value }))} style={styles.input} />
          <input type="number" value={form.total_amount} onChange={(event) => setForm((prev) => ({ ...prev, total_amount: event.target.value }))} placeholder="Total Amount" style={styles.input} />
          <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} style={styles.input}>
            <option value="Draft">Draft</option>
            <option value="Approved">Approved</option>
            <option value="Ordered">Ordered</option>
            <option value="Received">Received</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <label style={styles.fileLabel}>
            Invoice Upload
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setInvoiceFile(event.target.files?.[0] || null)} style={styles.input} />
          </label>
          <textarea value={form.remarks} onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))} placeholder="Remarks" style={{ ...styles.input, minHeight: 90 }} />
          <div style={styles.actions}>
            <button style={styles.secondaryButton} onClick={() => { setEditingId(null); setInvoiceFile(null); setForm({ po_number: "", vendor_name: "", purchase_date: "", total_amount: "", status: "Draft", remarks: "" }); }}>Clear</button>
            <button style={styles.primaryButton} onClick={() => void save()}>{uploading ? "Uploading..." : editingId ? "Save Changes" : "Create PO"}</button>
          </div>
        </article>

        <article style={styles.card}>
          <h3 style={styles.cardTitle}>Purchase Order Registry</h3>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>PO Number</th>
                  <th style={styles.th}>Vendor</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Invoice</th>
                  <th style={styles.th}>Remarks</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} style={styles.empty}>No purchase orders found.</td></tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td style={styles.td}>{row.po_number}</td>
                      <td style={styles.td}>{row.vendor_name || "-"}</td>
                      <td style={styles.td}>{row.purchase_date ? new Date(row.purchase_date).toLocaleDateString() : "-"}</td>
                      <td style={styles.td}>${Number(row.total_amount || 0).toLocaleString()}</td>
                      <td style={styles.td}>{row.status || "-"}</td>
                      <td style={styles.td}>{row.invoice_url ? <a href={row.invoice_url} target="_blank" rel="noreferrer" style={styles.link}>Open</a> : "-"}</td>
                      <td style={styles.td}>{row.remarks || "-"}</td>
                      <td style={styles.td}>
                        <div style={styles.actionCol}>
                          <button style={styles.actionButton} onClick={() => { setEditingId(row.id); setForm({ po_number: row.po_number, vendor_name: row.vendor_name || "", purchase_date: row.purchase_date || "", total_amount: String(row.total_amount || ""), status: row.status || "Draft", remarks: row.remarks || "" }); }}>Edit</button>
                          <button style={styles.actionDangerButton} onClick={() => void remove(row)}>Delete</button>
                        </div>
                      </td>
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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.kpiCard}>
      <p style={styles.kpiLabel}>{label}</p>
      <p style={styles.kpiValue}>{value}</p>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 14 },
  headerCard: { background: "white", borderRadius: 14, border: "1px solid #dbeafe", padding: 14, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  eyebrow: { margin: 0, color: "#0369a1", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" },
  title: { margin: "6px 0", color: "#0f172a", fontWeight: 900, fontSize: 24 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 700 },
  kpiRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  kpiCard: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, minWidth: 140 },
  kpiLabel: { margin: 0, fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 },
  kpiValue: { margin: "6px 0 0", fontSize: 22, color: "#0f172a", fontWeight: 900 },
  grid: { display: "grid", gridTemplateColumns: "minmax(260px, 380px) 1fr", gap: 12 },
  card: { background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 12, display: "grid", gap: 8 },
  cardTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 800 },
  input: { width: "100%", borderRadius: 10, border: "1px solid #cbd5e1", padding: "10px 12px", fontSize: 13, background: "white" },
  fileLabel: { display: "grid", gap: 6, color: "#334155", fontWeight: 700, fontSize: 13 },
  actions: { display: "flex", justifyContent: "flex-end", gap: 8 },
  primaryButton: { border: "none", borderRadius: 10, background: "#2563eb", color: "white", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  secondaryButton: { border: "1px solid #cbd5e1", borderRadius: 10, background: "#f8fafc", color: "#0f172a", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
  th: { textAlign: "left", padding: 10, background: "#f8fafc", fontSize: 12, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.06em" },
  td: { padding: 10, borderTop: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, verticalAlign: "top" },
  empty: { textAlign: "center", padding: 20, color: "#64748b" },
  link: { color: "#1d4ed8", fontWeight: 700, textDecoration: "none" },
  actionCol: { display: "grid", gap: 6 },
  actionButton: { border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", color: "#0f172a", padding: "6px 8px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  actionDangerButton: { border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", padding: "6px 8px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  toast: { position: "fixed", right: 16, bottom: 16, background: "#0f172a", color: "white", borderRadius: 10, padding: "10px 14px", fontWeight: 700, fontSize: 13 },
};
