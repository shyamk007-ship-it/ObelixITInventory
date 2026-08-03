"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import OfficeAssetModuleNav from "../../components/office/OfficeAssetModuleNav";
import { supabase } from "../../lib/supabase";

interface AssignmentRow {
  id: number;
  asset_id: number;
  employee_id: number;
  status: string;
  assigned_date?: string | null;
  actual_return_date?: string | null;
  notes?: string | null;
  assets?: { asset_name?: string | null; asset_tag?: string | null; status?: string | null } | null;
  employees?: { full_name?: string | null; department?: string | null } | null;
}

interface AssetOption {
  id: number;
  asset_name: string;
  asset_tag: string;
  status?: string | null;
}

interface EmployeeOption {
  id: number;
  full_name: string;
  department?: string | null;
}

const assignmentStatuses = ["Assigned", "Returned", "Transferred", "Replaced"] as const;

export default function OfficeAssignmentsPage() {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ asset_id: "", employee_id: "", status: "Assigned", notes: "" });

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const load = async () => {
    const [assignmentResponse, assetResponse, employeeResponse] = await Promise.all([
      supabase
        .from("assignment_records")
        .select("id, asset_id, employee_id, status, assigned_date, actual_return_date, notes, assets(asset_name, asset_tag, status), employees(full_name, department)")
        .order("assigned_date", { ascending: false }),
      supabase.from("assets").select("id, asset_name, asset_tag, status").is("vessel_id", null).order("asset_name", { ascending: true }),
      supabase.from("employees").select("id, full_name, department").order("full_name", { ascending: true }),
    ]);

    setRows((assignmentResponse.data as AssignmentRow[]) || []);
    setAssets((assetResponse.data as AssetOption[]) || []);
    setEmployees((employeeResponse.data as EmployeeOption[]) || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const availableAssets = useMemo(() => assets.filter((asset) => (asset.status || "").toLowerCase() !== "assigned"), [assets]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.assets?.asset_name, row.assets?.asset_tag, row.employees?.full_name, row.employees?.department, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [rows, search]);

  const createAssignment = async () => {
    if (!form.asset_id || !form.employee_id) {
      showToast("Select an asset and employee.");
      return;
    }

    const selectedAsset = assets.find((asset) => asset.id === Number(form.asset_id));
    if (!selectedAsset || (selectedAsset.status || "").toLowerCase() === "assigned") {
      showToast("This asset is already assigned.");
      return;
    }

    const response = await supabase.from("assignment_records").insert([
      {
        asset_id: Number(form.asset_id),
        employee_id: Number(form.employee_id),
        status: form.status,
        notes: form.notes || null,
        assigned_date: new Date().toISOString().slice(0, 10),
      },
    ]);

    if (response.error) {
      showToast(response.error.message);
      return;
    }

    await supabase
      .from("assets")
      .update({ status: form.status === "Returned" ? "Available" : "Assigned", currently_assigned_to: Number(form.employee_id) })
      .eq("id", Number(form.asset_id));

    showToast("Assignment saved.");
    setForm({ asset_id: "", employee_id: "", status: "Assigned", notes: "" });
    await load();
  };

  return (
    <div style={styles.page}>
      <OfficeAssetModuleNav />

      <section style={styles.headerCard}>
        <div>
          <p style={styles.eyebrow}>Assignments</p>
          <h2 style={styles.title}>Asset Assignment Center</h2>
          <p style={styles.subtitle}>Assign, return, replace, and transfer office assets while preserving history and status.</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Active Assignments</p>
          <p style={styles.statValue}>{rows.filter((row) => row.status === "Assigned").length}</p>
        </div>
      </section>

      <section style={styles.grid}>
        <article style={styles.card}>
          <h3 style={styles.cardTitle}>New Assignment</h3>
          <select value={form.asset_id} onChange={(event) => setForm((prev) => ({ ...prev, asset_id: event.target.value }))} style={styles.input}>
            <option value="">Select asset</option>
            {availableAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.asset_name} ({asset.asset_tag})
              </option>
            ))}
          </select>
          <select value={form.employee_id} onChange={(event) => setForm((prev) => ({ ...prev, employee_id: event.target.value }))} style={styles.input}>
            <option value="">Select employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}{employee.department ? ` - ${employee.department}` : ""}
              </option>
            ))}
          </select>
          <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} style={styles.input}>
            {assignmentStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notes" style={{ ...styles.input, minHeight: 94 }} />
          <button style={styles.primaryButton} onClick={() => void createAssignment()}>
            Save Assignment
          </button>
        </article>

        <article style={styles.card}>
          <h3 style={styles.cardTitle}>Assignment History</h3>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by asset, employee, department, or status" style={styles.input} />
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Asset</th>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Assigned</th>
                  <th style={styles.th}>Returned</th>
                  <th style={styles.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={styles.empty}>
                      No assignment history found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td style={styles.td}>{row.assets?.asset_name || row.assets?.asset_tag || "-"}</td>
                      <td style={styles.td}>{row.employees?.full_name || "-"}</td>
                      <td style={styles.td}>{row.employees?.department || "-"}</td>
                      <td style={styles.td}>{row.status || "-"}</td>
                      <td style={styles.td}>{row.assigned_date ? new Date(row.assigned_date).toLocaleDateString() : "-"}</td>
                      <td style={styles.td}>{row.actual_return_date ? new Date(row.actual_return_date).toLocaleDateString() : "-"}</td>
                      <td style={styles.td}>{row.notes || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 16 },
  headerCard: { background: "rgba(255,255,255,0.94)", borderRadius: 22, border: "1px solid rgba(191, 219, 254, 0.9)", padding: 18, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  eyebrow: { margin: 0, color: "#2563eb", fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em" },
  title: { margin: "8px 0", color: "#0f172a", fontSize: 28, fontWeight: 900 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 760, lineHeight: 1.6 },
  statCard: { minWidth: 160, borderRadius: 16, border: "1px solid rgba(191, 219, 254, 0.9)", background: "#eff6ff", padding: 14 },
  statLabel: { margin: 0, color: "#2563eb", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.16em" },
  statValue: { margin: "8px 0 0", color: "#0f172a", fontSize: 28, fontWeight: 900 },
  grid: { display: "grid", gridTemplateColumns: "minmax(300px, 380px) 1fr", gap: 16 },
  card: { background: "rgba(255,255,255,0.94)", borderRadius: 22, border: "1px solid rgba(191, 219, 254, 0.9)", padding: 18, display: "grid", gap: 10 },
  cardTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 900 },
  input: { width: "100%", borderRadius: 14, border: "1px solid #cbd5e1", padding: "11px 12px", fontSize: 13, background: "white" },
  primaryButton: { border: "none", borderRadius: 14, background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "white", padding: "12px 16px", fontWeight: 800, cursor: "pointer" },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 14 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 800 },
  th: { textAlign: "left", padding: 10, background: "#f8fafc", fontSize: 12, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.06em" },
  td: { padding: 10, borderTop: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, verticalAlign: "top" },
  empty: { textAlign: "center", padding: 20, color: "#64748b" },
  toast: { position: "fixed", right: 18, bottom: 18, background: "#0f172a", color: "white", borderRadius: 12, padding: "10px 14px", fontWeight: 700 },
};
