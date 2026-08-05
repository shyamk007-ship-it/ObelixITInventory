"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2, Plus } from "lucide-react";
import { InventoryDataTable, InventoryHeader } from "../../../components/inventory";
import { fetchCycleCounts, inventoryTables, safeErrorMessage } from "../../../lib/inventory";
import { supabase } from "../../../lib/supabase";

export default function InventoryCycleCountPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchCycleCounts>>>([]);
  const [form, setForm] = useState({
    count_number: "",
    abc_class: "A",
    count_type: "Scheduled",
    scheduled_date: "",
    notes: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRows(await fetchCycleCounts(300));
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load cycle counts."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createCount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      count_number: form.count_number.trim() || `CC-${Date.now()}`,
      abc_class: form.abc_class,
      count_type: form.count_type,
      scheduled_date: form.scheduled_date || null,
      status: "Scheduled",
      variance_value: 0,
      notes: form.notes || null,
    };

    const { error: insertError } = await supabase.from(inventoryTables.cycleCounts).insert([payload]);
    if (insertError) {
      setError(safeErrorMessage(insertError, "Unable to create cycle count session."));
      return;
    }

    setForm({ count_number: "", abc_class: "A", count_type: "Scheduled", scheduled_date: "", notes: "" });
    void loadData();
  };

  const updateStatus = async (id: number, status: string) => {
    const { error: updateError } = await supabase.from(inventoryTables.cycleCounts).update({ status }).eq("id", id);
    if (updateError) {
      setError(safeErrorMessage(updateError, "Unable to update cycle count status."));
      return;
    }
    void loadData();
  };

  const tableRows = rows.map((row) => ({
    "Count #": row.count_number,
    "ABC Analysis": row.abc_class || "A",
    Type: row.count_type || "Scheduled",
    "Scheduled Count": row.scheduled_date || "-",
    Status: row.status || "Scheduled",
    "Variance Analysis": row.variance_value || 0,
    "Approval Workflow": row.approved_by_employee_id || "Pending",
    Notes: row.notes || "-",
    History: row.created_at ? new Date(row.created_at).toLocaleString() : "-",
  }));

  return (
    <section style={styles.page}>
      <InventoryHeader title="Cycle Count" subtitle="ABC-driven random and scheduled cycle counts with variance analysis, approval workflows, and historical traceability." />

      <form style={styles.formCard} onSubmit={createCount}>
        <h3 style={styles.title}><Plus size={14} /> New Cycle Count Session</h3>
        <div style={styles.grid}>
          <input style={styles.input} placeholder="Count Number" value={form.count_number} onChange={(event) => setForm((prev) => ({ ...prev, count_number: event.target.value }))} />
          <select style={styles.input} value={form.abc_class} onChange={(event) => setForm((prev) => ({ ...prev, abc_class: event.target.value }))}>
            <option value="A">A - High Value</option>
            <option value="B">B - Medium Value</option>
            <option value="C">C - Low Value</option>
          </select>
          <select style={styles.input} value={form.count_type} onChange={(event) => setForm((prev) => ({ ...prev, count_type: event.target.value }))}>
            <option value="Scheduled">Scheduled Count</option>
            <option value="Random">Random Cycle Count</option>
          </select>
          <input style={styles.input} type="date" value={form.scheduled_date} onChange={(event) => setForm((prev) => ({ ...prev, scheduled_date: event.target.value }))} />
          <input style={styles.input} placeholder="Notes" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </div>
        <button type="submit" style={styles.button}>Create Session</button>
      </form>

      <div style={styles.actionWrap}>
        {rows.slice(0, 6).map((row) => (
          <article key={row.id} style={styles.actionCard}>
            <p style={styles.actionTitle}>{row.count_number}</p>
            <div style={styles.actionButtons}>
              {["Scheduled", "In Progress", "Variance Review", "Approved", "Closed"].map((status) => (
                <button key={status} type="button" style={styles.linkButton} onClick={() => void updateStatus(row.id, status)}>{status}</button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <InventoryDataTable columns={["Count #", "ABC Analysis", "Type", "Scheduled Count", "Status", "Variance Analysis", "Approval Workflow", "Notes", "History"]} rows={tableRows} />

      {isLoading ? <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Loading cycle count sessions...</div> : null}
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

