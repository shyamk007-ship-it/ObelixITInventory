"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import * as XLSX from "xlsx";
import { fetchEmployees, fetchVisitors, safeErrorMessage } from "../../../lib/people";
import { supabase } from "../../../lib/supabase";
import { usePeoplePermissions, useToast } from "../../../hooks/usePeopleModule";
import { PeopleHeader, QuickActions, SearchBar, StatCard, VisitorCard, VisitorTable } from "../../../components/people";

const initialForm = {
  visitor_name: "",
  company: "",
  phone: "",
  email: "",
  host_employee_id: "",
  host_department: "",
  purpose: "",
  vehicle_number: "",
  photo_url: "",
  id_proof_url: "",
  badge_number: "",
  visit_time: "",
  expected_exit_time: "",
};

export default function PeopleVisitorsPage() {
  const permissions = usePeoplePermissions();
  const { toast, showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Awaited<ReturnType<typeof fetchEmployees>>>([]);
  const [visitors, setVisitors] = useState<Awaited<ReturnType<typeof fetchVisitors>>>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(initialForm);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [employeeRows, visitorRows] = await Promise.all([fetchEmployees(), fetchVisitors(120)]);
      setEmployees(employeeRows);
      setVisitors(visitorRows);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load visitors."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const counts = useMemo(() => {
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);
    const today = visitors.filter((row) => String(row.visit_time || row.created_at || "").startsWith(dayKey));

    return {
      today: today.length,
      checkedIn: visitors.filter((row) => String(row.status || "").toLowerCase() === "checked in").length,
      checkedOut: visitors.filter((row) => String(row.status || "").toLowerCase() === "checked out").length,
      expected: visitors.filter((row) => String(row.status || "").toLowerCase() === "expected").length,
      pending: visitors.filter((row) => String(row.status || "").toLowerCase() === "pending").length,
      blocked: visitors.filter((row) => Boolean(row.is_blocked) || String(row.status || "").toLowerCase() === "blocked").length,
    };
  }, [visitors]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return visitors.filter((row) => {
      const haystack = [row.visitor_name, row.company, row.host_department, row.purpose, row.employees?.full_name]
        .map((item) => String(item || "").toLowerCase())
        .join(" ");
      const status = String(row.status || "pending").toLowerCase();
      const passesSearch = !keyword || haystack.includes(keyword);
      const passesStatus = statusFilter === "all" || status === statusFilter;
      return passesSearch && passesStatus;
    });
  }, [search, statusFilter, visitors]);

  const updateStatus = async (id: number, nextStatus: "Checked In" | "Checked Out") => {
    if (!permissions.canManageVisitors) {
      showToast("You do not have permission to update visitor status.");
      return;
    }

    const payload =
      nextStatus === "Checked In"
        ? { status: nextStatus, check_in_time: new Date().toISOString() }
        : { status: nextStatus, check_out_time: new Date().toISOString() };

    const response = await supabase.from("office_visitors").update(payload).eq("id", id);
    if (response.error) {
      showToast(`Update failed: ${response.error.message}`);
      return;
    }

    showToast(`Visitor marked ${nextStatus}.`);
    await loadData();
  };

  const createVisitor = async () => {
    if (!permissions.canManageVisitors) {
      showToast("You do not have permission to register visitors.");
      return;
    }
    if (!form.visitor_name.trim()) {
      showToast("Visitor name is required.");
      return;
    }

    setSaving(true);
    const response = await supabase.from("office_visitors").insert([
      {
        visitor_name: form.visitor_name.trim(),
        company: form.company.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        host_employee_id: form.host_employee_id ? Number(form.host_employee_id) : null,
        host_department: form.host_department.trim() || null,
        purpose: form.purpose.trim() || null,
        vehicle_number: form.vehicle_number.trim() || null,
        photo_url: form.photo_url.trim() || null,
        id_proof_url: form.id_proof_url.trim() || null,
        badge_number: form.badge_number.trim() || null,
        visit_time: form.visit_time || null,
        expected_exit_time: form.expected_exit_time || null,
        status: "Expected",
      },
    ]);
    setSaving(false);

    if (response.error) {
      showToast(`Create failed: ${response.error.message}`);
      return;
    }

    showToast("Visitor registered.");
    setForm(initialForm);
    await loadData();
  };

  const exportVisitors = () => {
    if (!filtered.length) {
      showToast("No records to export.");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      filtered.map((row) => ({
        name: row.visitor_name,
        company: row.company,
        host: row.employees?.full_name,
        department: row.host_department,
        purpose: row.purpose,
        status: row.status,
        visit_time: row.visit_time,
        check_in_time: row.check_in_time,
        check_out_time: row.check_out_time,
      }))
    );
    XLSX.utils.book_append_sheet(workbook, worksheet, "Visitors");
    XLSX.writeFile(workbook, `office-visitors-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <section style={styles.page}>
      <PeopleHeader
        title="Visitors"
        subtitle="Register and manage office visitors with check-in, check-out, badge, and host tracking."
        right={<QuickActions actions={[{ label: "Export", href: "#" }]} />}
      />

      <div style={styles.kpis}>
        <StatCard title="Visitors Today" value={counts.today} />
        <StatCard title="Checked In" value={counts.checkedIn} />
        <StatCard title="Checked Out" value={counts.checkedOut} />
        <StatCard title="Expected" value={counts.expected} />
        <StatCard title="Pending" value={counts.pending} />
        <StatCard title="Blocked" value={counts.blocked} />
      </div>

      <div style={styles.formCard}>
        <h3 style={styles.sectionTitle}>Visitor Registration</h3>
        <div style={styles.formGrid}>
          <input style={styles.input} placeholder="Visitor Name" value={form.visitor_name} onChange={(event) => setForm((prev) => ({ ...prev, visitor_name: event.target.value }))} />
          <input style={styles.input} placeholder="Company" value={form.company} onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))} />
          <input style={styles.input} placeholder="Phone" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
          <input style={styles.input} placeholder="Email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
          <select style={styles.input} value={form.host_employee_id} onChange={(event) => setForm((prev) => ({ ...prev, host_employee_id: event.target.value }))}>
            <option value="">Host Employee</option>
            {employees.map((row) => (
              <option key={row.id} value={String(row.id)}>{row.full_name || `Employee #${row.id}`}</option>
            ))}
          </select>
          <input style={styles.input} placeholder="Department" value={form.host_department} onChange={(event) => setForm((prev) => ({ ...prev, host_department: event.target.value }))} />
          <input style={styles.input} placeholder="Purpose" value={form.purpose} onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value }))} />
          <input style={styles.input} placeholder="Vehicle" value={form.vehicle_number} onChange={(event) => setForm((prev) => ({ ...prev, vehicle_number: event.target.value }))} />
          <input style={styles.input} placeholder="Photo URL" value={form.photo_url} onChange={(event) => setForm((prev) => ({ ...prev, photo_url: event.target.value }))} />
          <input style={styles.input} placeholder="ID Proof URL" value={form.id_proof_url} onChange={(event) => setForm((prev) => ({ ...prev, id_proof_url: event.target.value }))} />
          <input style={styles.input} placeholder="Badge Number" value={form.badge_number} onChange={(event) => setForm((prev) => ({ ...prev, badge_number: event.target.value }))} />
          <input style={styles.input} type="datetime-local" value={form.visit_time} onChange={(event) => setForm((prev) => ({ ...prev, visit_time: event.target.value }))} />
          <input style={styles.input} type="datetime-local" value={form.expected_exit_time} onChange={(event) => setForm((prev) => ({ ...prev, expected_exit_time: event.target.value }))} />
        </div>
        <div style={styles.formActions}>
          <button type="button" style={styles.buttonPrimary} onClick={() => void createVisitor()} disabled={saving}>{saving ? "Saving..." : "Register Visitor"}</button>
        </div>
      </div>

      <div style={styles.toolbar}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search visitor, company, host or purpose" />
        <select style={styles.input} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="expected">Expected</option>
          <option value="pending">Pending</option>
          <option value="checked in">Checked In</option>
          <option value="checked out">Checked Out</option>
          <option value="blocked">Blocked</option>
        </select>
        <button type="button" style={styles.buttonSecondary} onClick={exportVisitors}>Export</button>
      </div>

      {loading ? <div style={styles.skeleton} /> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
      {!loading && !error && filtered.length === 0 ? <div style={styles.empty}>No visitors found for the selected filters.</div> : null}

      {!loading && !error && filtered.length > 0 ? (
        <>
          <VisitorTable rows={filtered} onCheckIn={(id) => void updateStatus(id, "Checked In")} onCheckOut={(id) => void updateStatus(id, "Checked Out")} />
          <div style={styles.cardGrid}>
            {filtered.slice(0, 6).map((row) => (
              <VisitorCard
                key={row.id}
                name={row.visitor_name}
                company={row.company || ""}
                host={row.employees?.full_name || "Unassigned"}
                status={row.status || "Pending"}
                time={row.visit_time ? new Date(row.visit_time).toLocaleString() : "-"}
              />
            ))}
          </div>
        </>
      ) : null}

      {toast ? <div style={styles.toast}>{toast}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  kpis: { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8 },
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
  input: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 13,
    background: "#ffffff",
  },
  formActions: { display: "flex", gap: 8 },
  buttonPrimary: {
    border: "none",
    borderRadius: 10,
    background: "#2563eb",
    color: "white",
    fontWeight: 700,
    padding: "8px 12px",
    cursor: "pointer",
  },
  buttonSecondary: {
    border: "1px solid #bfdbfe",
    borderRadius: 10,
    background: "#eff6ff",
    color: "#1e40af",
    fontWeight: 700,
    padding: "8px 12px",
    cursor: "pointer",
  },
  toolbar: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  skeleton: {
    borderRadius: 14,
    height: 260,
    background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)",
    backgroundSize: "200% 100%",
    animation: "pulse 1.4s ease-in-out infinite",
  },
  error: { borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: 12, fontWeight: 700 },
  empty: { borderRadius: 12, border: "1px dashed #cbd5e1", padding: 14, color: "#64748b", fontWeight: 600, background: "#ffffff" },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 },
  toast: {
    position: "fixed",
    right: 24,
    bottom: 22,
    borderRadius: 10,
    background: "#0f172a",
    color: "white",
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 700,
    zIndex: 2000,
  },
};
