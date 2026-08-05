"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import {
  fetchAttendance,
  fetchDepartments,
  fetchEmployees,
  fetchLeaves,
  fetchVisitors,
  safeErrorMessage,
} from "../../../lib/people";
import { PeopleHeader, QuickActions, StatCard } from "../../../components/people";
import { usePeoplePermissions, useToast } from "../../../hooks/usePeopleModule";

export default function PeopleReportsPage() {
  const permissions = usePeoplePermissions();
  const { toast, showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Awaited<ReturnType<typeof fetchEmployees>>>([]);
  const [attendance, setAttendance] = useState<Awaited<ReturnType<typeof fetchAttendance>>>([]);
  const [visitors, setVisitors] = useState<Awaited<ReturnType<typeof fetchVisitors>>>([]);
  const [departments, setDepartments] = useState<Awaited<ReturnType<typeof fetchDepartments>>>([]);
  const [leaves, setLeaves] = useState<Awaited<ReturnType<typeof fetchLeaves>>>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [employeeRows, attendanceRows, visitorRows, departmentRows, leaveRows] = await Promise.all([
          fetchEmployees(),
          fetchAttendance(),
          fetchVisitors(365),
          fetchDepartments(),
          fetchLeaves(),
        ]);

        setEmployees(employeeRows);
        setAttendance(attendanceRows);
        setVisitors(visitorRows);
        setDepartments(departmentRows);
        setLeaves(leaveRows);
      } catch (loadError) {
        setError(safeErrorMessage(loadError, "Unable to load people reports."));
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const stats = useMemo(() => {
    return {
      employeeReports: employees.length,
      attendanceReports: attendance.length,
      visitorReports: visitors.length,
      departmentReports: departments.length,
      leaveReports: leaves.length,
    };
  }, [attendance.length, departments.length, employees.length, leaves.length, visitors.length]);

  const exportExcel = () => {
    if (!permissions.canExport) {
      showToast("You do not have permission to export reports.");
      return;
    }

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        employees.map((row) => ({
          id: row.id,
          name: row.full_name,
          email: row.email,
          department: row.department,
          designation: row.designation,
          status: row.status,
          joining_date: row.joining_date,
        }))
      ),
      "Employees"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        attendance.map((row) => ({
          date: row.attendance_date,
          employee: row.employees?.full_name || row.employee_id,
          department: row.employees?.department,
          status: row.status,
          late_by_minutes: row.late_by_minutes,
          overtime_minutes: row.overtime_minutes,
        }))
      ),
      "Attendance"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        visitors.map((row) => ({
          name: row.visitor_name,
          company: row.company,
          host: row.employees?.full_name,
          status: row.status,
          visit_time: row.visit_time,
          check_in_time: row.check_in_time,
          check_out_time: row.check_out_time,
        }))
      ),
      "Visitors"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        departments.map((row) => ({
          name: row.name,
          manager_employee_id: row.manager_employee_id,
          location: row.location,
          budget: row.budget,
          notes: row.notes,
        }))
      ),
      "Departments"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        leaves.map((row) => ({
          employee: row.employees?.full_name || row.employee_id,
          leave_type: row.leave_type,
          start_date: row.start_date,
          end_date: row.end_date,
          total_days: row.total_days,
          status: row.status,
        }))
      ),
      "Leave"
    );

    XLSX.writeFile(workbook, `people-reports-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("Excel report exported.");
  };

  const exportPdf = () => {
    if (!permissions.canExport) {
      showToast("You do not have permission to export reports.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("People Module Report Summary", 14, 16);

    doc.setFontSize(11);
    doc.text(`Employees: ${employees.length}`, 14, 30);
    doc.text(`Attendance Entries: ${attendance.length}`, 14, 38);
    doc.text(`Visitors: ${visitors.length}`, 14, 46);
    doc.text(`Departments: ${departments.length}`, 14, 54);
    doc.text(`Leave Records: ${leaves.length}`, 14, 62);

    const generated = new Date().toLocaleString();
    doc.text(`Generated: ${generated}`, 14, 74);

    doc.save(`people-report-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
    showToast("PDF summary exported.");
  };

  return (
    <section style={styles.page}>
      <PeopleHeader
        title="People Reports"
        subtitle="Generate employee, attendance, visitor, department, and leave reports with Excel and PDF exports."
        right={<QuickActions actions={[{ label: "Export Excel", href: "#" }, { label: "Export PDF", href: "#" }]} />}
      />

      <div style={styles.kpis}>
        <StatCard title="Employee Report Rows" value={stats.employeeReports} />
        <StatCard title="Attendance Rows" value={stats.attendanceReports} />
        <StatCard title="Visitor Rows" value={stats.visitorReports} />
        <StatCard title="Department Rows" value={stats.departmentReports} />
        <StatCard title="Leave Rows" value={stats.leaveReports} />
      </div>

      <div style={styles.actions}>
        <button type="button" style={styles.buttonPrimary} onClick={exportExcel}>Export Excel</button>
        <button type="button" style={styles.buttonPrimary} onClick={exportPdf}>Export PDF</button>
      </div>

      {loading ? <div style={styles.skeleton} /> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
      {!loading && !error ? (
        <div style={styles.reportGrid}>
          <article style={styles.reportCard}><h3 style={styles.reportTitle}>Employee Report</h3><p style={styles.reportText}>Includes identity, role, department, status, and joining dates.</p></article>
          <article style={styles.reportCard}><h3 style={styles.reportTitle}>Attendance Report</h3><p style={styles.reportText}>Daily and monthly attendance with late and overtime trends.</p></article>
          <article style={styles.reportCard}><h3 style={styles.reportTitle}>Visitor Report</h3><p style={styles.reportText}>Visitor history with host, purpose, and check-in lifecycle.</p></article>
          <article style={styles.reportCard}><h3 style={styles.reportTitle}>Department Report</h3><p style={styles.reportText}>Department ownership, location, manager and budgets.</p></article>
          <article style={styles.reportCard}><h3 style={styles.reportTitle}>Leave Report</h3><p style={styles.reportText}>Leave applications with approval states and total leave days.</p></article>
        </div>
      ) : null}

      {toast ? <div style={styles.toast}>{toast}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  kpis: { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  buttonPrimary: { border: "none", borderRadius: 10, background: "#2563eb", color: "white", fontWeight: 700, padding: "8px 12px", cursor: "pointer" },
  reportGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 },
  reportCard: { borderRadius: 14, border: "1px solid #e2e8f0", background: "#ffffff", padding: 12, display: "grid", gap: 6 },
  reportTitle: { margin: 0, color: "#0f172a", fontSize: 15, fontWeight: 800 },
  reportText: { margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.5 },
  skeleton: { borderRadius: 14, height: 220, background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)", backgroundSize: "200% 100%", animation: "pulse 1.4s ease-in-out infinite" },
  error: { borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: 12, fontWeight: 700 },
  toast: { position: "fixed", right: 24, bottom: 22, borderRadius: 10, background: "#0f172a", color: "white", padding: "10px 12px", fontSize: 13, fontWeight: 700, zIndex: 2000 },
};
