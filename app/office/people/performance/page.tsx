"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { fetchEmployees, fetchPerformance, safeErrorMessage } from "../../../lib/people";
import { supabase } from "../../../lib/supabase";
import { usePeoplePermissions, useToast } from "../../../hooks/usePeopleModule";
import { PeopleHeader, StatCard } from "../../../components/people";

export default function PeoplePerformancePage() {
  const permissions = usePeoplePermissions();
  const { toast, showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Awaited<ReturnType<typeof fetchEmployees>>>([]);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchPerformance>>>([]);
  const [form, setForm] = useState({
    employee_id: "",
    review_period: "",
    kpi_score: "",
    goals_score: "",
    overall_rating: "",
    comments: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [employeeRows, performanceRows] = await Promise.all([fetchEmployees(), fetchPerformance()]);
      setEmployees(employeeRows);
      setRows(performanceRows);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load performance data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const summary = useMemo(() => {
    const average = rows.length
      ? rows.reduce((sum, row) => sum + Number(row.overall_rating || 0), 0) / rows.length
      : 0;

    return {
      reviews: rows.length,
      topRated: rows.filter((row) => Number(row.overall_rating || 0) >= 4).length,
      average,
    };
  }, [rows]);

  const createReview = async () => {
    if (!permissions.canManagePerformance) {
      showToast("You do not have permission to manage performance reviews.");
      return;
    }
    if (!form.employee_id || !form.review_period) {
      showToast("Employee and review period are required.");
      return;
    }

    setSaving(true);
    const response = await supabase.from("office_performance_reviews").insert([
      {
        employee_id: Number(form.employee_id),
        review_period: form.review_period,
        kpi_score: form.kpi_score ? Number(form.kpi_score) : null,
        goals_score: form.goals_score ? Number(form.goals_score) : null,
        overall_rating: form.overall_rating ? Number(form.overall_rating) : null,
        comments: form.comments || null,
        reviewed_at: new Date().toISOString(),
      },
    ]);
    setSaving(false);

    if (response.error) {
      showToast(`Save failed: ${response.error.message}`);
      return;
    }

    showToast("Performance review saved.");
    setForm({ employee_id: "", review_period: "", kpi_score: "", goals_score: "", overall_rating: "", comments: "" });
    await loadData();
  };

  return (
    <section style={styles.page}>
      <PeopleHeader title="Performance" subtitle="Track employee KPIs, goals, reviews, ratings, and historical performance trends." />

      <div style={styles.kpis}>
        <StatCard title="Reviews" value={summary.reviews} />
        <StatCard title="Top Rated (>=4)" value={summary.topRated} />
        <StatCard title="Average Rating" value={summary.average.toFixed(2)} />
      </div>

      <div style={styles.formCard}>
        <h3 style={styles.sectionTitle}>Create Review</h3>
        <div style={styles.formGrid}>
          <select style={styles.input} value={form.employee_id} onChange={(event) => setForm((prev) => ({ ...prev, employee_id: event.target.value }))}>
            <option value="">Employee</option>
            {employees.map((row) => (
              <option key={row.id} value={String(row.id)}>{row.full_name || `Employee #${row.id}`}</option>
            ))}
          </select>
          <input style={styles.input} value={form.review_period} placeholder="Review Period (Q1 2026)" onChange={(event) => setForm((prev) => ({ ...prev, review_period: event.target.value }))} />
          <input style={styles.input} type="number" step="0.01" min="0" max="5" value={form.kpi_score} placeholder="KPI Score" onChange={(event) => setForm((prev) => ({ ...prev, kpi_score: event.target.value }))} />
          <input style={styles.input} type="number" step="0.01" min="0" max="5" value={form.goals_score} placeholder="Goals Score" onChange={(event) => setForm((prev) => ({ ...prev, goals_score: event.target.value }))} />
          <input style={styles.input} type="number" step="0.01" min="0" max="5" value={form.overall_rating} placeholder="Overall Rating" onChange={(event) => setForm((prev) => ({ ...prev, overall_rating: event.target.value }))} />
          <input style={styles.inputWide} value={form.comments} placeholder="Comments" onChange={(event) => setForm((prev) => ({ ...prev, comments: event.target.value }))} />
        </div>
        <button type="button" style={styles.buttonPrimary} onClick={() => void createReview()} disabled={saving}>{saving ? "Saving..." : "Save Review"}</button>
      </div>

      {loading ? <div style={styles.skeleton} /> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
      {!loading && !error && rows.length === 0 ? <div style={styles.empty}>No performance reviews yet.</div> : null}

      {!loading && !error && rows.length > 0 ? (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Review Period</th>
                <th style={styles.th}>KPI</th>
                <th style={styles.th}>Goals</th>
                <th style={styles.th}>Rating</th>
                <th style={styles.th}>Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={styles.td}>{row.employees?.full_name || `Employee #${row.employee_id}`}</td>
                  <td style={styles.td}>{row.review_period}</td>
                  <td style={styles.td}>{row.kpi_score ?? "-"}</td>
                  <td style={styles.td}>{row.goals_score ?? "-"}</td>
                  <td style={styles.td}>{row.overall_rating ?? "-"}</td>
                  <td style={styles.td}>{row.reviewed_at ? new Date(row.reviewed_at).toLocaleDateString() : "-"}</td>
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
  kpis: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 },
  formCard: { borderRadius: 14, border: "1px solid #dbeafe", background: "#ffffff", padding: 12, display: "grid", gap: 10 },
  sectionTitle: { margin: 0, color: "#0f172a", fontSize: 16, fontWeight: 800 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 },
  input: { border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", fontSize: 13, background: "#fff" },
  inputWide: { border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", fontSize: 13, background: "#fff", gridColumn: "span 5" },
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
