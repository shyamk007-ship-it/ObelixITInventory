"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2, Plus } from "lucide-react";
import { InventoryDataTable, InventoryHeader } from "../../../components/inventory";
import { fetchInventoryAudits, fetchWarehouses, inventoryTables, safeErrorMessage } from "../../../lib/inventory";
import { supabase } from "../../../lib/supabase";

export default function InventoryAuditPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchInventoryAudits>>>([]);
  const [warehouses, setWarehouses] = useState<Awaited<ReturnType<typeof fetchWarehouses>>>([]);
  const [form, setForm] = useState({
    audit_number: "",
    warehouse_id: "",
    audit_date: "",
    signature_name: "",
    notes: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [auditRows, warehouseRows] = await Promise.all([fetchInventoryAudits(250), fetchWarehouses()]);
      setRows(auditRows);
      setWarehouses(warehouseRows);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load inventory audits."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createAudit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      audit_number: form.audit_number.trim() || `AUD-${Date.now()}`,
      warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
      audit_date: form.audit_date || null,
      status: "Scheduled",
      variance_count: 0,
      missing_count: 0,
      damaged_count: 0,
      signature_name: form.signature_name || null,
      notes: form.notes || null,
    };

    const { error: insertError } = await supabase.from(inventoryTables.audits).insert([payload]);
    if (insertError) {
      setError(safeErrorMessage(insertError, "Unable to create audit session."));
      return;
    }

    setForm({ audit_number: "", warehouse_id: "", audit_date: "", signature_name: "", notes: "" });
    void loadData();
  };

  const updateStatus = async (id: number, status: string) => {
    const { error: updateError } = await supabase.from(inventoryTables.audits).update({ status }).eq("id", id);
    if (updateError) {
      setError(safeErrorMessage(updateError, "Unable to update audit status."));
      return;
    }
    void loadData();
  };

  const tableRows = rows.map((row) => ({
    "Audit #": row.audit_number,
    Warehouse: warehouses.find((warehouse) => warehouse.id === row.warehouse_id)?.name || row.warehouse_id || "-",
    "Audit Date": row.audit_date || "-",
    Status: row.status || "Scheduled",
    "Variance Reports": row.variance_count || 0,
    "Missing Items": row.missing_count || 0,
    "Damaged Items": row.damaged_count || 0,
    "Digital Signature": row.signature_name || "-",
    Notes: row.notes || "-",
    History: row.created_at ? new Date(row.created_at).toLocaleString() : "-",
  }));

  return (
    <section style={styles.page}>
      <InventoryHeader title="Inventory Audit" subtitle="Physical verification sessions with variance reporting, damaged/missing item controls, digital signoff, and audit history." />

      <form style={styles.formCard} onSubmit={createAudit}>
        <h3 style={styles.title}><Plus size={14} /> Start Audit Session</h3>
        <div style={styles.grid}>
          <input style={styles.input} placeholder="Audit Number" value={form.audit_number} onChange={(event) => setForm((prev) => ({ ...prev, audit_number: event.target.value }))} />
          <select style={styles.input} value={form.warehouse_id} onChange={(event) => setForm((prev) => ({ ...prev, warehouse_id: event.target.value }))}>
            <option value="">Warehouse</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
            ))}
          </select>
          <input style={styles.input} type="date" value={form.audit_date} onChange={(event) => setForm((prev) => ({ ...prev, audit_date: event.target.value }))} />
          <input style={styles.input} placeholder="Digital Signature Name" value={form.signature_name} onChange={(event) => setForm((prev) => ({ ...prev, signature_name: event.target.value }))} />
          <input style={styles.input} placeholder="Notes" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </div>
        <button type="submit" style={styles.button}>Create Audit</button>
      </form>

      <div style={styles.actionWrap}>
        {rows.slice(0, 6).map((row) => (
          <article key={row.id} style={styles.actionCard}>
            <p style={styles.actionTitle}>{row.audit_number}</p>
            <div style={styles.actionButtons}>
              {["Scheduled", "In Progress", "Pending Approval", "Approved", "Closed"].map((status) => (
                <button key={status} type="button" style={styles.linkButton} onClick={() => void updateStatus(row.id, status)}>{status}</button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <InventoryDataTable
        columns={[
          "Audit #",
          "Warehouse",
          "Audit Date",
          "Status",
          "Variance Reports",
          "Missing Items",
          "Damaged Items",
          "Digital Signature",
          "Notes",
          "History",
        ]}
        rows={tableRows}
      />

      {isLoading ? <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Loading inventory audits...</div> : null}
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
  actionWrap: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 8 },
  actionCard: { borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fbff", padding: 10, display: "grid", gap: 8 },
  actionTitle: { margin: 0, fontSize: 14, fontWeight: 900, color: "#0f172a" },
  actionButtons: { display: "flex", flexWrap: "wrap", gap: 6 },
  linkButton: { border: "1px solid #bfdbfe", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontSize: 11, fontWeight: 800, padding: "4px 8px", cursor: "pointer" },
  loading: { borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", padding: "8px 10px", display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 700 },
  error: { borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: "8px 10px", fontWeight: 700 },
};

