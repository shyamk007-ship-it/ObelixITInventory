"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { createAuditLog, buildAuditDescription } from "../../lib/audit";
import { getUserProfile } from "../../lib/rbac";

interface Asset {
  id: number;
  asset_name: string;
  status: string;
}

interface Employee {
  id: number;
  full_name: string;
}

interface Assignment {
  id: number;
  asset_id: number;
  employee_id: number;
  status: string;
  assigned_date: string;
  returned_date?: string | null;
  notes?: string;
  assets?: { asset_name: string };
  employees?: { full_name: string };
}

const todayDate = new Date().toISOString().split("T")[0];

export default function AssignmentsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [assignmentDate, setAssignmentDate] = useState(todayDate);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Assigned" | "Returned" | "Active">("All");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAssets();
    loadEmployees();
    loadAssignments();
  }, []);

  const loadAssets = async () => {
    const { data, error } = await supabase
      .from("assets")
      .select("id, asset_name, status")
      .eq("status", "Available")
      .order("asset_name", { ascending: true });

    if (!error) {
      setAssets(data || []);
    }
  };

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name")
      .order("full_name", { ascending: true });

    if (!error) {
      setEmployees(data || []);
    }
  };

  const loadAssignments = async () => {
    const { data, error } = await supabase
      .from("asset_assignments")
      .select(`*, assets(asset_name), employees(full_name)`)
      .order("assigned_date", { ascending: false });

    if (!error) {
      setAssignments(data || []);
    }
  };

  const handleAssign = async () => {
    if (!selectedAsset || !selectedEmployee || !assignmentDate) {
      alert("Please select an asset, employee and date.");
      return;
    }

    const assetId = Number(selectedAsset);
    const employeeId = Number(selectedEmployee);

    if (!assetId || !employeeId) {
      alert("Invalid asset or employee selection.");
      return;
    }

    setLoading(true);

    const { error: assignError } = await supabase.from("asset_assignments").insert([
      {
        asset_id: assetId,
        employee_id: employeeId,
        assigned_date: assignmentDate,
        notes,
        status: "Assigned",
      },
    ]);

    if (assignError) {
      alert(assignError.message);
      setLoading(false);
      return;
    }

    const { error: assetError } = await supabase
      .from("assets")
      .update({ status: "Assigned", assigned_to: employeeId })
      .eq("id", assetId);

    if (assetError) {
      alert(assetError.message);
      setLoading(false);
      return;
    }

    const profile = await getUserProfile();
    const assetName = assets.find((item) => item.id === assetId)?.asset_name || "Asset";
    const employeeName = employees.find((item) => item.id === employeeId)?.full_name || "Employee";

    await createAuditLog({
      action: "Assigned Asset",
      description: buildAuditDescription({
        event: "Assigned Asset",
        userName: profile?.full_name || "Unknown User",
        recordType: "assignment",
        recordId: assetId,
        itemName: `${assetName} → ${employeeName}`,
        context: notes ? `Notes: ${notes}` : undefined,
      }),
    });

    setSelectedAsset("");
    setSelectedEmployee("");
    setAssignmentDate(todayDate);
    setNotes("");
    setSearch("");
    setStatusFilter("All");

    await loadAssets();
    await loadAssignments();
    setLoading(false);
  };

  const handleReturn = async (assignmentId: number, assetId: number) => {
    const { error: returnError } = await supabase
      .from("asset_assignments")
      .update({ status: "Returned", returned_date: new Date().toISOString().split("T")[0] })
      .eq("id", assignmentId);

    if (returnError) {
      alert(returnError.message);
      return;
    }

    const { error: assetError } = await supabase
      .from("assets")
      .update({ status: "Available", assigned_to: null })
      .eq("id", assetId);

    if (assetError) {
      alert(assetError.message);
      return;
    }

    const profile = await getUserProfile();
    const assetName = assignments.find((item) => item.asset_id === assetId)?.assets?.asset_name || "Asset";

    await createAuditLog({
      action: "Returned Asset",
      description: buildAuditDescription({
        event: "Returned Asset",
        userName: profile?.full_name || "Unknown User",
        recordType: "assignment",
        recordId: assignmentId,
        itemName: assetName,
      }),
    });

    await loadAssets();
    await loadAssignments();
  };

  const filterAssignments = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    return assignments.filter((assignment) => {
      const matchesSearch =
        !normalizedSearch ||
        assignment.assets?.asset_name?.toLowerCase().includes(normalizedSearch) ||
        assignment.employees?.full_name?.toLowerCase().includes(normalizedSearch) ||
        assignment.status.toLowerCase().includes(normalizedSearch);

      const statusMatch =
        statusFilter === "All"
          ? true
          : statusFilter === "Active"
          ? assignment.status === "Assigned"
          : assignment.status === statusFilter;

      return matchesSearch && statusMatch;
    });
  }, [assignments, search, statusFilter]);

  const formatDate = (date?: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Asset Assignment</h1>
          <p style={styles.pageSubtitle}>
            Assign assets, track returns, and review history.
          </p>
        </div>
      </div>

      <div style={styles.panel}>
        <div style={styles.formCard}>
          <h2 style={styles.sectionTitle}>Assign Asset</h2>

          <div style={styles.formGrid}>
            <label style={styles.field}>
              Employee
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                style={styles.select}
              >
                <option value="">Select Employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.field}>
              Asset
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                style={styles.select}
              >
                <option value="">Select Asset</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.asset_name}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.field}>
              Assignment Date
              <input
                type="date"
                value={assignmentDate}
                onChange={(e) => setAssignmentDate(e.target.value)}
                style={styles.input}
              />
            </label>

            <label style={styles.fieldFull}>
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add assignment notes"
                style={styles.textarea}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleAssign}
            disabled={loading}
            style={styles.submitButton}
          >
            {loading ? "Assigning..." : "Assign Asset"}
          </button>
        </div>

        <div style={styles.historyCard}>
          <div style={styles.historyHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Assignment History</h2>
              <p style={styles.historySubtitle}>
                Search, filter, and manage asset returns.
              </p>
            </div>

            <div style={styles.searchGroup}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by asset, employee or status"
                style={styles.searchInput}
              />
            </div>
          </div>

          <div style={styles.filterRow}>
            {(["All", "Assigned", "Returned", "Active"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                style={{
                  ...styles.filterButton,
                  background:
                    statusFilter === filter
                      ? "#2563eb"
                      : "white",
                  color:
                    statusFilter === filter
                      ? "white"
                      : "#0f172a",
                }}
              >
                {filter}
              </button>
            ))}
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Asset</th>
                  <th style={styles.th}>Assigned Date</th>
                  <th style={styles.th}>Returned Date</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterAssignments.length === 0 ? (
                  <tr>
                    <td style={styles.emptyTd} colSpan={6}>
                      No assignment history matches your filters.
                    </td>
                  </tr>
                ) : (
                  filterAssignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td style={styles.td}>
                        {assignment.employees?.full_name || "-"}
                      </td>
                      <td style={styles.td}>
                        {assignment.assets?.asset_name || "-"}
                      </td>
                      <td style={styles.td}>
                        {formatDate(assignment.assigned_date)}
                      </td>
                      <td style={styles.td}>
                        {formatDate(assignment.returned_date)}
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            background:
                              assignment.status === "Assigned"
                                ? "#e0f2fe"
                                : "#dcfce7",
                            color:
                              assignment.status === "Assigned"
                                ? "#0369a1"
                                : "#166534",
                          }}
                        >
                          {assignment.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {assignment.status === "Assigned" ? (
                          <button
                            type="button"
                            style={styles.returnBtn}
                            onClick={() => handleReturn(assignment.id, assignment.asset_id)}
                          >
                            Return
                          </button>
                        ) : (
                          <span style={styles.returnedLabel}>Returned</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  container: {
    padding: 30,
    background: "#f1f5f9",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    marginBottom: 24,
  },
  pageTitle: {
    margin: 0,
    fontSize: 32,
    fontWeight: 700,
    color: "#0f172a",
  },
  pageSubtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 14,
  },
  panel: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 24,
  },
  formCard: {
    background: "white",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  },
  historyCard: {
    background: "white",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  },
  sectionTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
  },
  historySubtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 14,
  },
  formGrid: {
    display: "grid",
    gap: 18,
    marginTop: 20,
  },
  field: {
    display: "grid",
    gap: 8,
    color: "#0f172a",
    fontWeight: 600,
    fontSize: 14,
  },
  fieldFull: {
    display: "grid",
    gap: 8,
    color: "#0f172a",
    fontWeight: 600,
    fontSize: 14,
    gridColumn: "1 / -1",
  },
  select: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "white",
    fontSize: 14,
  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 14,
  },
  textarea: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    resize: "vertical",
  },
  submitButton: {
    marginTop: 18,
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    flexWrap: "wrap",
  },
  searchGroup: {
    minWidth: 240,
    width: "100%",
    maxWidth: 420,
  },
  searchInput: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 14,
  },
  filterRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 18,
    marginBottom: 18,
  },
  filterButton: {
    padding: "10px 16px",
    borderRadius: 999,
    border: "1px solid #cbd5e1",
    cursor: "pointer",
    fontWeight: 600,
    transition: "background 0.15s ease, color 0.15s ease",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 720,
  },
  th: {
    textAlign: "left",
    padding: 16,
    background: "#f8fafc",
    color: "#334155",
    fontSize: 14,
    fontWeight: 700,
  },
  td: {
    padding: 16,
    borderBottom: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: 14,
  },
  emptyTd: {
    padding: 24,
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 12,
  },
  returnBtn: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    background: "#16a34a",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
  returnedLabel: {
    color: "#64748b",
    fontWeight: 600,
  },
};
