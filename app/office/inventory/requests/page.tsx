"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2, Plus } from "lucide-react";
import { InventoryDataTable, InventoryHeader } from "../../../components/inventory";
import { fetchStockRequests, inventoryTables, safeErrorMessage } from "../../../lib/inventory";
import { supabase } from "../../../lib/supabase";

const statuses = ["Pending", "Manager Approved", "Inventory Approved", "Issued", "Rejected", "Returned"];

export default function InventoryRequestsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchStockRequests>>>([]);
  const [form, setForm] = useState({
    request_number: "",
    request_type: "Department",
    requester_department: "",
    priority: "Normal",
    required_date: "",
    notes: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRows(await fetchStockRequests(300));
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load stock requests."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const requestNumber = form.request_number.trim() || `REQ-${Date.now()}`;
    const { error: insertError } = await supabase.from(inventoryTables.requests).insert([
      {
        request_number: requestNumber,
        request_type: form.request_type,
        requester_department: form.requester_department || null,
        priority: form.priority,
        required_date: form.required_date || null,
        notes: form.notes || null,
        status: "Pending",
      },
    ]);

    if (insertError) {
      setError(safeErrorMessage(insertError, "Unable to create stock request."));
      return;
    }

    setForm({ request_number: "", request_type: "Department", requester_department: "", priority: "Normal", required_date: "", notes: "" });
    void loadData();
  };

  const updateStatus = async (id: number, status: string) => {
    const { error: updateError } = await supabase.from(inventoryTables.requests).update({ status }).eq("id", id);
    if (updateError) {
      setError(safeErrorMessage(updateError, "Unable to update request status."));
      return;
    }
    void loadData();
  };

  const summary = useMemo(() => {
    return {
      total: rows.length,
      pending: rows.filter((row) => String(row.status || "") === "Pending").length,
      approved: rows.filter((row) => String(row.status || "").includes("Approved")).length,
      rejected: rows.filter((row) => String(row.status || "") === "Rejected").length,
    };
  }, [rows]);

  const tableRows = rows.map((row) => ({
    "Request #": row.request_number,
    Type: row.request_type || "-",
    Department: row.requester_department || "-",
    Priority: row.priority || "Normal",
    "Required Date": row.required_date || "-",
    Status: row.status || "Pending",
    Notes: row.notes || "-",
    Created: row.created_at ? new Date(row.created_at).toLocaleString() : "-",
  }));

  return (
    <section style={styles.page}>
      <InventoryHeader title="Stock Requests" subtitle="Department and employee stock requests with manager approval and inventory approval workflows." />

      <div style={styles.summaryGrid}>
        <article style={styles.summaryCard}><p style={styles.label}>Total Requests</p><h3 style={styles.value}>{summary.total}</h3></article>
        <article style={styles.summaryCard}><p style={styles.label}>Pending</p><h3 style={styles.value}>{summary.pending}</h3></article>
        <article style={styles.summaryCard}><p style={styles.label}>Approved</p><h3 style={styles.value}>{summary.approved}</h3></article>
        <article style={styles.summaryCard}><p style={styles.label}>Rejected</p><h3 style={styles.value}>{summary.rejected}</h3></article>
      </div>

      <form style={styles.formCard} onSubmit={createRequest}>
        <h3 style={styles.title}><Plus size={14} /> Create Stock Request</h3>
        <div style={styles.grid}>
          <input style={styles.input} placeholder="Request Number (optional)" value={form.request_number} onChange={(event) => setForm((prev) => ({ ...prev, request_number: event.target.value }))} />
          <select style={styles.input} value={form.request_type} onChange={(event) => setForm((prev) => ({ ...prev, request_type: event.target.value }))}>
            <option value="Department">Department Request</option>
            <option value="Employee">Employee Request</option>
          </select>
          <input style={styles.input} placeholder="Department" value={form.requester_department} onChange={(event) => setForm((prev) => ({ ...prev, requester_department: event.target.value }))} />
          <select style={styles.input} value={form.priority} onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}>
            <option value="Low">Low</option>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <input style={styles.input} type="date" value={form.required_date} onChange={(event) => setForm((prev) => ({ ...prev, required_date: event.target.value }))} />
          <input style={styles.input} placeholder="Notes" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </div>
        <button type="submit" style={styles.button}>Save Request</button>
      </form>

      <div style={styles.actionRow}>
        {rows.slice(0, 6).map((row) => (
          <div key={row.id} style={styles.actionCard}>
            <p style={styles.actionTitle}>{row.request_number}</p>
            <p style={styles.actionMeta}>{row.requester_department || "Department"} • {row.priority || "Normal"}</p>
            <div style={styles.actionButtons}>
              {statuses.map((status) => (
                <button key={status} type="button" style={styles.linkButton} onClick={() => void updateStatus(row.id, status)}>{status}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <InventoryDataTable columns={["Request #", "Type", "Department", "Priority", "Required Date", "Status", "Notes", "Created"]} rows={tableRows} />

      {isLoading ? <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Loading requests...</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 },
  summaryCard: { borderRadius: 12, border: "1px solid #dbeafe", background: "#fff", padding: 10 },
  label: { margin: 0, color: "#475569", fontSize: 12, fontWeight: 700 },
  value: { margin: "5px 0 0", color: "#0f172a", fontSize: 24, fontWeight: 900 },
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
  actionRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 },
  actionCard: { borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fbff", padding: 10, display: "grid", gap: 8 },
  actionTitle: { margin: 0, fontSize: 14, fontWeight: 900, color: "#0f172a" },
  actionMeta: { margin: 0, fontSize: 12, color: "#475569" },
  actionButtons: { display: "flex", flexWrap: "wrap", gap: 6 },
  linkButton: { border: "1px solid #bfdbfe", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontSize: 11, fontWeight: 800, padding: "4px 8px", cursor: "pointer" },
  loading: { borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", padding: "8px 10px", display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 700 },
  error: { borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: "8px 10px", fontWeight: 700 },
};

