"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { fetchEmployees, fetchTraining, safeErrorMessage } from "../../../lib/people";
import { supabase } from "../../../lib/supabase";
import { usePeoplePermissions, useToast } from "../../../hooks/usePeopleModule";
import { PeopleHeader, StatCard } from "../../../components/people";

export default function PeopleTrainingPage() {
  const permissions = usePeoplePermissions();
  const { toast, showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Awaited<ReturnType<typeof fetchEmployees>>>([]);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchTraining>>>([]);
  const [form, setForm] = useState({
    employee_id: "",
    course_name: "",
    provider: "",
    certification_name: "",
    completion_date: "",
    expiry_date: "",
    status: "Planned",
    score: "",
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [employeeRows, trainingRows] = await Promise.all([fetchEmployees(), fetchTraining()]);
      setEmployees(employeeRows);
      setRows(trainingRows);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load training data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const summary = useMemo(() => {
    const now = Date.now();
    const expiring = rows.filter((row) => row.expiry_date && new Date(row.expiry_date).getTime() - now < 1000 * 60 * 60 * 24 * 30).length;

    return {
      courses: rows.length,
      completed: rows.filter((row) => row.status === "Completed").length,
      expired: rows.filter((row) => row.status === "Expired").length,
      renewals: expiring,
    };
  }, [rows]);

  const createTraining = async () => {
    if (!permissions.canManageTraining) {
      showToast("You do not have permission to manage training records.");
      return;
    }
    if (!form.employee_id || !form.course_name.trim()) {
      showToast("Employee and course are required.");
      return;
    }

    setSaving(true);
    const response = await supabase.from("office_training_records").insert([
      {
        employee_id: Number(form.employee_id),
        course_name: form.course_name.trim(),
        provider: form.provider || null,
        certification_name: form.certification_name || null,
        completion_date: form.completion_date || null,
        expiry_date: form.expiry_date || null,
        status: form.status,
        score: form.score ? Number(form.score) : null,
        notes: form.notes || null,
      },
    ]);
    setSaving(false);

    if (response.error) {
      showToast(`Save failed: ${response.error.message}`);
      return;
    }

    showToast("Training record saved.");
    setForm({ employee_id: "", course_name: "", provider: "", certification_name: "", completion_date: "", expiry_date: "", status: "Planned", score: "", notes: "" });
    await loadData();
  };

  return (
    <section style={styles.page}>
      <PeopleHeader title="Training" subtitle="Manage employee courses, certifications, expiry windows, and renewal workloads." />

      <div style={styles.kpis}>
        <StatCard title="Courses" value={summary.courses} />
        <StatCard title="Completed" value={summary.completed} />
        <StatCard title="Expired" value={summary.expired} />
        <StatCard title="Upcoming Renewals" value={summary.renewals} />
      </div>

      <div style={styles.formCard}>
        <h3 style={styles.sectionTitle}>Add Training Record</h3>
        <div style={styles.formGrid}>
          <select style={styles.input} value={form.employee_id} onChange={(event) => setForm((prev) => ({ ...prev, employee_id: event.target.value }))}>
            <option value="">Employee</option>
            {employees.map((row) => (
              <option key={row.id} value={String(row.id)}>{row.full_name || `Employee #${row.id}`}</option>
            ))}
          </select>
          <input style={styles.input} value={form.course_name} placeholder="Course" onChange={(event) => setForm((prev) => ({ ...prev, course_name: event.target.value }))} />
          <input style={styles.input} value={form.provider} placeholder="Provider" onChange={(event) => setForm((prev) => ({ ...prev, provider: event.target.value }))} />
          <input style={styles.input} value={form.certification_name} placeholder="Certification" onChange={(event) => setForm((prev) => ({ ...prev, certification_name: event.target.value }))} />
          <input style={styles.input} type="date" value={form.completion_date} onChange={(event) => setForm((prev) => ({ ...prev, completion_date: event.target.value }))} />
          <input style={styles.input} type="date" value={form.expiry_date} onChange={(event) => setForm((prev) => ({ ...prev, expiry_date: event.target.value }))} />
          <select style={styles.input} value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="Planned">Planned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Expired">Expired</option>
          </select>
          <input style={styles.input} type="number" min="0" max="100" value={form.score} placeholder="Score" onChange={(event) => setForm((prev) => ({ ...prev, score: event.target.value }))} />
          <input style={styles.inputWide} value={form.notes} placeholder="Notes" onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </div>
        <button type="button" style={styles.buttonPrimary} onClick={() => void createTraining()} disabled={saving}>{saving ? "Saving..." : "Save Training"}</button>
      </div>

      {loading ? <div style={styles.skeleton} /> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
      {!loading && !error && rows.length === 0 ? <div style={styles.empty}>No training records found.</div> : null}

      {!loading && !error && rows.length > 0 ? (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Course</th>
                <th style={styles.th}>Certification</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Expiry</th>
                <th style={styles.th}>Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={styles.td}>{row.employees?.full_name || `Employee #${row.employee_id}`}</td>
                  <td style={styles.td}>{row.course_name}</td>
                  <td style={styles.td}>{row.certification_name || "-"}</td>
                  <td style={styles.td}>{row.status || "Planned"}</td>
                  <td style={styles.td}>{row.expiry_date || "-"}</td>
                  <td style={styles.td}>{row.score ?? "-"}</td>
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
  tableWrap: { overflowX: "auto", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 820 },
  th: { textAlign: "left", padding: "10px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", background: "#f8fafc" },
  td: { padding: "10px", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#0f172a" },
  skeleton: { borderRadius: 14, height: 220, background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)", backgroundSize: "200% 100%", animation: "pulse 1.4s ease-in-out infinite" },
  error: { borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: 12, fontWeight: 700 },
  empty: { borderRadius: 12, border: "1px dashed #cbd5e1", padding: 14, color: "#64748b", fontWeight: 600, background: "#ffffff" },
  toast: { position: "fixed", right: 24, bottom: 22, borderRadius: 10, background: "#0f172a", color: "white", padding: "10px 12px", fontSize: 13, fontWeight: 700, zIndex: 2000 },
};
