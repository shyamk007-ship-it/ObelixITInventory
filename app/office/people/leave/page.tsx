"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { fetchEmployees, fetchLeaves, safeErrorMessage } from "../../../lib/people";
import { supabase } from "../../../lib/supabase";
import { usePeoplePermissions, useToast } from "../../../hooks/usePeopleModule";
import { PeopleHeader, StatCard } from "../../../components/people";

const leaveTypes = ["Casual", "Sick", "Earned", "Maternity", "Paternity", "Unpaid"] as const;

export default function PeopleLeavePage() {
  const permissions = usePeoplePermissions();
  const { toast, showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Awaited<ReturnType<typeof fetchEmployees>>>([]);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchLeaves>>>([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [form, setForm] = useState({
    employee_id: "",
    leave_type: "Casual",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [employeeRows, leaveRows] = await Promise.all([fetchEmployees(), fetchLeaves()]);
      setEmployees(employeeRows);
      setRows(leaveRows);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load leave data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const summary = useMemo(() => {
    return {
      pending: rows.filter((row) => row.status === "Pending").length,
      approved: rows.filter((row) => row.status === "Approved").length,
      rejected: rows.filter((row) => row.status === "Rejected").length,
      totalDays: rows.reduce((sum, row) => sum + Number(row.total_days || 0), 0),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    if (selectedStatus === "all") return rows;
    return rows.filter((row) => row.status.toLowerCase() === selectedStatus);
  }, [rows, selectedStatus]);

  const createLeave = async () => {
    if (!form.employee_id || !form.start_date || !form.end_date) {
      showToast("Employee, start date and end date are required.");
      return;
    }

    setSaving(true);
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const response = await supabase.from("office_leave_requests").insert([
      {
        employee_id: Number(form.employee_id),
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        total_days: days,
        reason: form.reason || null,
        status: "Pending",
      },
    ]);
    setSaving(false);

    if (response.error) {
      showToast(`Apply failed: ${response.error.message}`);
      return;
    }

    showToast("Leave request submitted.");
    setForm({ employee_id: "", leave_type: "Casual", start_date: "", end_date: "", reason: "" });
    await loadData();
  };

  const reviewLeave = async (id: number, status: "Approved" | "Rejected") => {
    if (!permissions.canManageLeave) {
      showToast("You do not have permission to approve/reject leave.");
      return;
    }

    const response = await supabase
      .from("office_leave_requests")
      .update({ status, approved_at: new Date().toISOString() })
      .eq("id", id);

    if (response.error) {
      showToast(`Action failed: ${response.error.message}`);
      return;
    }

    showToast(`Leave ${status.toLowerCase()}.`);
    await loadData();
  };

  return (
    <section style={styles.page}>
      <PeopleHeader title="Leave" subtitle="Track balances, leave applications, manager approvals, and leave calendar history." />

      <div style={styles.kpis}>
        <StatCard title="Pending" value={summary.pending} />
        <StatCard title="Approved" value={summary.approved} />
        <StatCard title="Rejected" value={summary.rejected} />
        <StatCard title="Total Leave Days" value={summary.totalDays.toFixed(1)} />
      </div>

      <div style={styles.formCard}>
        <h3 style={styles.sectionTitle}>Apply Leave</h3>
        <div style={styles.formGrid}>
          <select style={styles.input} value={form.employee_id} onChange={(event) => setForm((prev) => ({ ...prev, employee_id: event.target.value }))}>
            <option value="">Employee</option>
            {employees.map((row) => (
              <option key={row.id} value={String(row.id)}>{row.full_name || `Employee #${row.id}`}</option>
            ))}
          </select>
          <select style={styles.input} value={form.leave_type} onChange={(event) => setForm((prev) => ({ ...prev, leave_type: event.target.value }))}>
            {leaveTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input style={styles.input} type="date" value={form.start_date} onChange={(event) => setForm((prev) => ({ ...prev, start_date: event.target.value }))} />
          <input style={styles.input} type="date" value={form.end_date} onChange={(event) => setForm((prev) => ({ ...prev, end_date: event.target.value }))} />
          <input style={styles.inputWide} value={form.reason} placeholder="Reason" onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))} />
        </div>
        <button type="button" style={styles.buttonPrimary} onClick={() => void createLeave()} disabled={saving}>{saving ? "Submitting..." : "Apply Leave"}</button>
      </div>

      <div style={styles.toolbar}>
        <select style={styles.input} value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? <div style={styles.skeleton} /> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
      {!loading && !error && filtered.length === 0 ? <div style={styles.empty}>No leave records available.</div> : null}

      {!loading && !error && filtered.length > 0 ? (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Start</th>
                <th style={styles.th}>End</th>
                <th style={styles.th}>Days</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td style={styles.td}>{row.employees?.full_name || `Employee #${row.employee_id}`}</td>
                  <td style={styles.td}>{row.leave_type}</td>
                  <td style={styles.td}>{row.start_date}</td>
                  <td style={styles.td}>{row.end_date}</td>
                  <td style={styles.td}>{row.total_days}</td>
                  <td style={styles.td}>{row.status}</td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button type="button" style={styles.buttonSecondary} disabled={row.status !== "Pending"} onClick={() => void reviewLeave(row.id, "Approved")}>Approve</button>
                      <button type="button" style={styles.buttonSecondary} disabled={row.status !== "Pending"} onClick={() => void reviewLeave(row.id, "Rejected")}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {toast ? <div style={styles.toast}>{toast}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  kpis: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 },
  formCard: { borderRadius: 14, border: "1px solid #dbeafe", background: "#ffffff", padding: 12, display: "grid", gap: 10 },
  sectionTitle: { margin: 0, color: "#0f172a", fontSize: 16, fontWeight: 800 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 },
  input: { border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", fontSize: 13, background: "#fff" },
  inputWide: { border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", fontSize: 13, background: "#fff", gridColumn: "span 4" },
  buttonPrimary: { border: "none", borderRadius: 10, background: "#2563eb", color: "white", fontWeight: 700, padding: "8px 12px", cursor: "pointer" },
  toolbar: { display: "flex", gap: 8, flexWrap: "wrap" },
  tableWrap: { overflowX: "auto", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 860 },
  th: { textAlign: "left", padding: "10px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", background: "#f8fafc" },
  td: { padding: "10px", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#0f172a" },
  actions: { display: "flex", gap: 6 },
  buttonSecondary: { border: "1px solid #bfdbfe", borderRadius: 8, background: "#eff6ff", color: "#1e40af", fontWeight: 700, padding: "5px 7px", cursor: "pointer", fontSize: 12 },
  skeleton: { borderRadius: 14, height: 220, background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)", backgroundSize: "200% 100%", animation: "pulse 1.4s ease-in-out infinite" },
  error: { borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: 12, fontWeight: 700 },
  empty: { borderRadius: 12, border: "1px dashed #cbd5e1", padding: 14, color: "#64748b", fontWeight: 600, background: "#ffffff" },
  toast: { position: "fixed", right: 24, bottom: 22, borderRadius: 10, background: "#0f172a", color: "white", padding: "10px 12px", fontSize: 13, fontWeight: 700, zIndex: 2000 },
};
