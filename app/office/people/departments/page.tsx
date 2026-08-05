"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { fetchDepartments, fetchEmployees, safeErrorMessage } from "../../../lib/people";
import { supabase } from "../../../lib/supabase";
import { usePeoplePermissions, useToast } from "../../../hooks/usePeopleModule";
import { DepartmentCard, DepartmentTable, PeopleHeader, QuickActions, SearchBar } from "../../../components/people";

interface AssetDeptRow {
  asset_id?: number | null;
  department?: string | null;
}

interface TicketDeptRow {
  id: number;
  employees?: { department?: string | null } | null;
}

export default function PeopleDepartmentsPage() {
  const permissions = usePeoplePermissions();
  const { toast, showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchDepartments>>>([]);
  const [employees, setEmployees] = useState<Awaited<ReturnType<typeof fetchEmployees>>>([]);
  const [assetRows, setAssetRows] = useState<AssetDeptRow[]>([]);
  const [ticketRows, setTicketRows] = useState<TicketDeptRow[]>([]);

  const [form, setForm] = useState({
    name: "",
    manager_employee_id: "",
    location: "",
    budget: "",
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [departments, employeeRows, assetResponse, ticketResponse] = await Promise.all([
        fetchDepartments(),
        fetchEmployees(),
        supabase.from("asset_register_extensions").select("asset_id, department"),
        supabase.from("tickets").select("id, employees(department)").is("vessel_id", null),
      ]);

      if (assetResponse.error) throw assetResponse.error;
      if (ticketResponse.error) throw ticketResponse.error;

      setRows(departments);
      setEmployees(employeeRows);
      setAssetRows(((assetResponse.data || []) as AssetDeptRow[]) || []);
      setTicketRows(((ticketResponse.data || []) as TicketDeptRow[]) || []);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load department records."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const managerLookup = useMemo(() => {
    const map: Record<number, string> = {};
    employees.forEach((row) => {
      map[row.id] = row.full_name || `Employee #${row.id}`;
    });
    return map;
  }, [employees]);

  const computed = useMemo(() => {
    return rows
      .filter((row) => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return true;
        return [row.name, row.location, managerLookup[row.manager_employee_id || 0] || ""]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
      .map((row) => {
        const deptName = row.name.toLowerCase();
        const employeeCount = employees.filter((employee) => String(employee.department || "").toLowerCase() === deptName).length;
        const assets = assetRows.filter((asset) => String(asset.department || "").toLowerCase() === deptName).length;
        const openTickets = ticketRows.filter((ticket) => String(ticket.employees?.department || "").toLowerCase() === deptName).length;

        return {
          ...row,
          employeeCount,
          assets,
          openTickets,
        };
      });
  }, [assetRows, employees, managerLookup, rows, search, ticketRows]);

  const resetForm = () => {
    setForm({ name: "", manager_employee_id: "", location: "", budget: "", notes: "" });
  };

  const createDepartment = async () => {
    if (!permissions.canManageDepartments) {
      showToast("You do not have permission to create departments.");
      return;
    }
    if (!form.name.trim()) {
      showToast("Department name is required.");
      return;
    }

    setSaving(true);
    const response = await supabase.from("office_departments").insert([
      {
        name: form.name.trim(),
        manager_employee_id: form.manager_employee_id ? Number(form.manager_employee_id) : null,
        location: form.location.trim() || null,
        budget: form.budget ? Number(form.budget) : 0,
        notes: form.notes.trim() || null,
      },
    ]);
    setSaving(false);

    if (response.error) {
      showToast(`Create failed: ${response.error.message}`);
      return;
    }

    showToast("Department created.");
    resetForm();
    await loadData();
  };

  return (
    <section style={styles.page}>
      <PeopleHeader
        title="Departments"
        subtitle="Manage department-level workforce, IT assets, ticket load, budget, and ownership boundaries."
        right={<QuickActions actions={[{ label: "Open Employee Directory", href: "/office/people/employees" }]} />}
      />

      <div style={styles.topBar}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search department, manager or location" />
      </div>

      <div style={styles.formCard}>
        <h3 style={styles.formTitle}>Create Department</h3>
        <div style={styles.formGrid}>
          <input style={styles.input} value={form.name} placeholder="Department Name" onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <select style={styles.input} value={form.manager_employee_id} onChange={(event) => setForm((prev) => ({ ...prev, manager_employee_id: event.target.value }))}>
            <option value="">Manager</option>
            {employees.map((row) => (
              <option key={row.id} value={String(row.id)}>{row.full_name || `Employee #${row.id}`}</option>
            ))}
          </select>
          <input style={styles.input} value={form.location} placeholder="Location" onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} />
          <input style={styles.input} value={form.budget} placeholder="Budget" type="number" onChange={(event) => setForm((prev) => ({ ...prev, budget: event.target.value }))} />
          <input style={styles.inputWide} value={form.notes} placeholder="Notes" onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </div>
        <button type="button" style={styles.button} onClick={() => void createDepartment()} disabled={saving}>
          {saving ? "Saving..." : "Create Department"}
        </button>
      </div>

      {loading ? <div style={styles.skeleton} /> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
      {!loading && !error && computed.length === 0 ? <div style={styles.empty}>No departments available.</div> : null}

      {!loading && !error && computed.length > 0 ? (
        <>
          <div style={styles.cardGrid}>
            {computed.map((row) => (
              <DepartmentCard
                key={row.id}
                department={row.name}
                manager={row.manager_employee_id ? managerLookup[row.manager_employee_id] || "Unknown" : "Not assigned"}
                employees={row.employeeCount}
                assets={row.assets}
                openTickets={row.openTickets}
                budget={Number(row.budget || 0)}
                location={row.location || ""}
              />
            ))}
          </div>

          <DepartmentTable rows={computed} managerNames={managerLookup} />
        </>
      ) : null}

      {toast ? <div style={styles.toast}>{toast}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" },
  formCard: {
    borderRadius: 14,
    border: "1px solid #dbeafe",
    background: "#ffffff",
    boxShadow: "0 10px 20px rgba(15, 23, 42, 0.06)",
    padding: 12,
    display: "grid",
    gap: 10,
  },
  formTitle: { margin: 0, color: "#0f172a", fontSize: 16, fontWeight: 800 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 },
  input: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 13,
    background: "#ffffff",
  },
  inputWide: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 13,
    background: "#ffffff",
    gridColumn: "span 4",
  },
  button: {
    width: "fit-content",
    border: "none",
    borderRadius: 10,
    background: "#2563eb",
    color: "white",
    fontWeight: 700,
    padding: "8px 12px",
    cursor: "pointer",
  },
  skeleton: {
    borderRadius: 14,
    height: 300,
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
