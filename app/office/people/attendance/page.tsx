"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { fetchAttendance, fetchEmployees, safeErrorMessage } from "../../../lib/people";
import { supabase } from "../../../lib/supabase";
import { usePeoplePermissions, useToast } from "../../../hooks/usePeopleModule";
import { PeopleHeader, StatCard } from "../../../components/people";

const monthValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export default function PeopleAttendancePage() {
  const permissions = usePeoplePermissions();
  const { toast, showToast } = useToast();

  const [month, setMonth] = useState(monthValue(new Date()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Awaited<ReturnType<typeof fetchEmployees>>>([]);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchAttendance>>>([]);
  const [form, setForm] = useState({
    employee_id: "",
    attendance_date: new Date().toISOString().slice(0, 10),
    status: "Present",
    check_in_time: "",
    check_out_time: "",
    late_by_minutes: "0",
    overtime_minutes: "0",
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedMonth = new Date(`${month}-01T00:00:00`);
      const [employeeRows, attendanceRows] = await Promise.all([fetchEmployees(), fetchAttendance(selectedMonth)]);
      setEmployees(employeeRows);
      setRows(attendanceRows);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load attendance records."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [month]);

  const summary = useMemo(() => {
    const present = rows.filter((row) => row.status === "Present").length;
    const absent = rows.filter((row) => row.status === "Absent").length;
    const leave = rows.filter((row) => row.status === "Leave").length;
    const late = rows.filter((row) => Number(row.late_by_minutes || 0) > 0).length;
    const overtime = rows.filter((row) => Number(row.overtime_minutes || 0) > 0).length;

    return { present, absent, leave, late, overtime };
  }, [rows]);

  const createRecord = async () => {
    if (!permissions.canManageAttendance) {
      showToast("You do not have permission to manage attendance.");
      return;
    }
    if (!form.employee_id) {
      showToast("Employee is required.");
      return;
    }

    setSaving(true);
    const response = await supabase.from("office_attendance").upsert(
      {
        employee_id: Number(form.employee_id),
        attendance_date: form.attendance_date,
        status: form.status,
        check_in_time: form.check_in_time || null,
        check_out_time: form.check_out_time || null,
        late_by_minutes: Number(form.late_by_minutes || 0),
        overtime_minutes: Number(form.overtime_minutes || 0),
        notes: form.notes || null,
      },
      { onConflict: "employee_id,attendance_date" }
    );
    setSaving(false);

    if (response.error) {
      showToast(`Save failed: ${response.error.message}`);
      return;
    }

    showToast("Attendance record saved.");
    await loadData();
  };

  return (
    <section style={styles.page}>
      <PeopleHeader
        title="Attendance"
        subtitle="Track daily and monthly attendance, late arrivals, overtime, and team reporting trends."
      />

      <div style={styles.kpis}>
        <StatCard title="Present" value={summary.present} />
        <StatCard title="Absent" value={summary.absent} />
        <StatCard title="On Leave" value={summary.leave} />
        <StatCard title="Late Arrivals" value={summary.late} />
        <StatCard title="Overtime" value={summary.overtime} />
      </div>

      <div style={styles.formCard}>
        <h3 style={styles.sectionTitle}>Daily Attendance Entry</h3>
        <div style={styles.formGrid}>
          <select style={styles.input} value={form.employee_id} onChange={(event) => setForm((prev) => ({ ...prev, employee_id: event.target.value }))}>
            <option value="">Employee</option>
            {employees.map((row) => (
              <option key={row.id} value={String(row.id)}>{row.full_name || `Employee #${row.id}`}</option>
            ))}
          </select>
          <input style={styles.input} type="date" value={form.attendance_date} onChange={(event) => setForm((prev) => ({ ...prev, attendance_date: event.target.value }))} />
          <select style={styles.input} value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Half Day">Half Day</option>
            <option value="Leave">Leave</option>
          </select>
          <input style={styles.input} type="datetime-local" value={form.check_in_time} onChange={(event) => setForm((prev) => ({ ...prev, check_in_time: event.target.value }))} />
          <input style={styles.input} type="datetime-local" value={form.check_out_time} onChange={(event) => setForm((prev) => ({ ...prev, check_out_time: event.target.value }))} />
          <input style={styles.input} type="number" value={form.late_by_minutes} placeholder="Late (minutes)" onChange={(event) => setForm((prev) => ({ ...prev, late_by_minutes: event.target.value }))} />
          <input style={styles.input} type="number" value={form.overtime_minutes} placeholder="Overtime (minutes)" onChange={(event) => setForm((prev) => ({ ...prev, overtime_minutes: event.target.value }))} />
          <input style={styles.inputWide} value={form.notes} placeholder="Notes" onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </div>
        <div style={styles.formActions}>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} style={styles.input} />
          <button type="button" style={styles.button} onClick={() => void createRecord()} disabled={saving}>{saving ? "Saving..." : "Save Attendance"}</button>
        </div>
      </div>

      {loading ? <div style={styles.skeleton} /> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
      {!loading && !error && rows.length === 0 ? <div style={styles.empty}>No attendance entries for selected month.</div> : null}

      {!loading && !error && rows.length > 0 ? (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Late</th>
                <th style={styles.th}>Overtime</th>
                <th style={styles.th}>Check In</th>
                <th style={styles.th}>Check Out</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={styles.td}>{row.attendance_date}</td>
                  <td style={styles.td}>{row.employees?.full_name || `Employee #${row.employee_id}`}</td>
                  <td style={styles.td}>{row.employees?.department || "Unassigned"}</td>
                  <td style={styles.td}>{row.status}</td>
                  <td style={styles.td}>{row.late_by_minutes || 0}m</td>
                  <td style={styles.td}>{row.overtime_minutes || 0}m</td>
                  <td style={styles.td}>{row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString() : "-"}</td>
                  <td style={styles.td}>{row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString() : "-"}</td>
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
  kpis: { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 },
  formCard: {
    borderRadius: 14,
    border: "1px solid #dbeafe",
    background: "#ffffff",
    boxShadow: "0 10px 20px rgba(15, 23, 42, 0.05)",
    padding: 12,
    display: "grid",
    gap: 10,
  },
  sectionTitle: { margin: 0, color: "#0f172a", fontSize: 16, fontWeight: 800 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 },
  input: { border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", fontSize: 13, background: "#fff" },
  inputWide: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 13,
    background: "#fff",
    gridColumn: "span 4",
  },
  formActions: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  button: { border: "none", borderRadius: 10, background: "#2563eb", color: "white", fontWeight: 700, padding: "8px 12px", cursor: "pointer" },
  tableWrap: { overflowX: "auto", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th: { textAlign: "left", padding: "10px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", background: "#f8fafc" },
  td: { padding: "10px", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#0f172a" },
  skeleton: { borderRadius: 14, height: 240, background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)", backgroundSize: "200% 100%", animation: "pulse 1.4s ease-in-out infinite" },
  error: { borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: 12, fontWeight: 700 },
  empty: { borderRadius: 12, border: "1px dashed #cbd5e1", padding: 14, color: "#64748b", fontWeight: 600, background: "#ffffff" },
  toast: { position: "fixed", right: 24, bottom: 22, borderRadius: 10, background: "#0f172a", color: "white", padding: "10px 12px", fontSize: 13, fontWeight: 700, zIndex: 2000 },
};
