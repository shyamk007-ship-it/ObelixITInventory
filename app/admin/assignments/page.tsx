"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { createAuditLog, createNotification, buildAuditDescription } from "../../lib/audit";
import { getUserProfile } from "../../lib/rbac";

interface Asset {
  id: string | number;
  asset_name: string;
  asset_tag: string;
  status: string;
  category?: string;
}

interface Employee {
  id: string | number;
  full_name: string;
  email?: string;
  department?: string;
}

interface Assignment {
  id: string | number;
  asset_id: string | number;
  employee_id: string | number;
  assigned_by?: string;
  assigned_date: string;
  expected_return_date?: string | null;
  actual_return_date?: string | null;
  status: "Assigned" | "Returned" | "Lost" | "Damaged";
  notes?: string;
  created_at?: string;
  assets?: Asset;
  employees?: Employee;
}

const todayDate = new Date().toISOString().split("T")[0];
const assignmentStatuses = ["Assigned", "Returned", "Lost", "Damaged"] as const;

export default function AssignmentsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [assignmentDate, setAssignmentDate] = useState(todayDate);
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Assigned" | "Returned" | "Lost" | "Damaged">("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [returnNotes, setReturnNotes] = useState("");
  const [returnStatus, setReturnStatus] = useState<"Returned" | "Lost" | "Damaged">("Returned");

  useEffect(() => {
    loadAssets();
    loadEmployees();
    loadAssignments();
  }, []);

  const loadAssets = async () => {
    const { data, error } = await supabase
      .from("assets")
      .select("id, asset_name, asset_tag, status, category")
      .order("asset_name", { ascending: true });

    if (!error) {
      setAssets(data || []);
    }
  };

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, email, department")
      .order("full_name", { ascending: true });

    if (!error) {
      setEmployees(data || []);
    }
  };

  const loadAssignments = async () => {
    const { data, error } = await supabase
      .from("assignment_records")
      .select(`*, assets(id, asset_name, asset_tag, category), employees(id, full_name, email, department)`)
      .order("assigned_date", { ascending: false });

    if (!error) {
      setAssignments(data || []);
    }
  };

  const confirmAssign = () => {
    if (!selectedAsset || !selectedEmployee || !assignmentDate) {
      alert("Please select an asset, employee, and assignment date.");
      return;
    }
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    setLoading(true);
    try {
      const assetId = Number(selectedAsset);
      const employeeId = Number(selectedEmployee);

      const profile = await getUserProfile();
      
      const { data: insertData, error: insertError } = await supabase
        .from("assignment_records")
        .insert([
          {
            asset_id: assetId,
            employee_id: employeeId,
            assigned_by: profile?.full_name || "System",
            assigned_date: assignmentDate,
            expected_return_date: expectedReturnDate || null,
            status: "Assigned",
            notes: notes || null,
          },
        ])
        .select();

      if (insertError) {
        alert(insertError.message);
        setLoading(false);
        return;
      }

      const { error: assetError } = await supabase
        .from("assets")
        .update({ status: "Assigned", currently_assigned_to: employeeId, last_assignment_date: assignmentDate })
        .eq("id", assetId);

      if (assetError) {
        console.error(assetError);
      }

      const assetName = assets.find((item) => item.id === assetId)?.asset_name || "Asset";
      const employeeName = employees.find((item) => item.id === employeeId)?.full_name || "Employee";

      await createAuditLog({
        action: "Assigned Asset",
        description: buildAuditDescription({
          event: "Assigned Asset",
          userName: profile?.full_name || "Unknown User",
          recordType: "assignment",
          recordId: insertData?.[0]?.id,
          itemName: `${assetName} → ${employeeName}`,
          context: notes ? `Notes: ${notes}` : undefined,
        }),
      });

      await createNotification({
        title: "Asset Assigned",
        message: `${assetName} has been assigned to ${employeeName}.`,
        action: "Assigned Asset",
        createdBy: profile?.full_name,
        recordType: "assignment",
        recordId: insertData?.[0]?.id,
      });

      setSelectedAsset("");
      setSelectedEmployee("");
      setAssignmentDate(todayDate);
      setExpectedReturnDate("");
      setNotes("");
      setShowAssignModal(false);

      await loadAssets();
      await loadAssignments();
    } catch (error: any) {
      alert(error?.message || "Failed to assign asset.");
    } finally {
      setLoading(false);
    }
  };

  const openReturnModal = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setReturnStatus("Returned");
    setReturnNotes("");
    setShowReturnModal(true);
  };

  const handleReturn = async () => {
    if (!selectedAssignment) return;
    setLoading(true);

    try {
      const profile = await getUserProfile();
      const returnDate = todayDate;

      const { error: updateError } = await supabase
        .from("assignment_records")
        .update({
          status: returnStatus,
          actual_return_date: returnDate,
          notes: returnNotes || selectedAssignment.notes,
        })
        .eq("id", selectedAssignment.id);

      if (updateError) {
        alert(updateError.message);
        return;
      }

      const newAssetStatus = returnStatus === "Returned" ? "Available" : returnStatus;

      const { error: assetError } = await supabase
        .from("assets")
        .update({ status: newAssetStatus, currently_assigned_to: null })
        .eq("id", selectedAssignment.asset_id);

      if (assetError) {
        console.error(assetError);
      }

      const assetName = selectedAssignment.assets?.asset_name || "Asset";
      const employeeName = selectedAssignment.employees?.full_name || "Employee";

      await createAuditLog({
        action: `Asset ${returnStatus}`,
        description: buildAuditDescription({
          event: `Asset ${returnStatus}`,
          userName: profile?.full_name || "Unknown User",
          recordType: "assignment",
          recordId: selectedAssignment.id,
          itemName: `${assetName} from ${employeeName}`,
          context: returnNotes ? `Notes: ${returnNotes}` : undefined,
        }),
      });

      await createNotification({
        title: `Asset ${returnStatus}`,
        message: `${assetName} has been marked as ${returnStatus.toLowerCase()}.`,
        action: `Asset ${returnStatus}`,
        createdBy: profile?.full_name,
        recordType: "assignment",
        recordId: selectedAssignment.id,
      });

      setShowReturnModal(false);
      setSelectedAssignment(null);
      setReturnNotes("");

      await loadAssets();
      await loadAssignments();
    } catch (error: any) {
      alert(error?.message || "Failed to process return.");
    } finally {
      setLoading(false);
    }
  };

  const availableAssets = assets.filter((a) => a.status === "Available");

  const getCategories = () => {
    const categories = new Set(assets.map((a) => a.category).filter(Boolean));
    return Array.from(categories);
  };

  const getEmployeeNames = () => {
    const names = new Set(assignments.map((a) => a.employees?.full_name).filter(Boolean));
    return Array.from(names);
  };

  const filteredAssignments = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    return assignments.filter((assignment) => {
      const matchesSearch =
        !normalizedSearch ||
        assignment.assets?.asset_name?.toLowerCase().includes(normalizedSearch) ||
        assignment.assets?.asset_tag?.toLowerCase().includes(normalizedSearch) ||
        assignment.employees?.full_name?.toLowerCase().includes(normalizedSearch);

      const statusMatch = statusFilter === "All" || assignment.status === statusFilter;

      const categoryMatch =
        categoryFilter === "All" || assignment.assets?.category === categoryFilter;

      const employeeMatch =
        employeeFilter === "All" ||
        assignment.employees?.full_name === employeeFilter;

      return matchesSearch && statusMatch && categoryMatch && employeeMatch;
    });
  }, [assignments, search, statusFilter, categoryFilter, employeeFilter]);

  const stats = useMemo(() => {
    return {
      totalAssignments: assignments.length,
      currentlyAssigned: assignments.filter((a) => a.status === "Assigned").length,
      returned: assignments.filter((a) => a.status === "Returned").length,
      lost: assignments.filter((a) => a.status === "Lost").length,
      damaged: assignments.filter((a) => a.status === "Damaged").length,
    };
  }, [assignments]);

  const formatDate = (date?: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      Assigned: { bg: "#e0f2fe", text: "#0369a1" },
      Returned: { bg: "#dcfce7", text: "#166534" },
      Lost: { bg: "#fed7aa", text: "#92400e" },
      Damaged: { bg: "#fecaca", text: "#991b1b" },
    };
    return colors[status] || colors.Assigned;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Asset Assignments</h1>
          <p style={styles.pageSubtitle}>
            Manage asset allocations, track returns, and maintain assignment history.
          </p>
        </div>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Total Assignments</p>
          <strong style={styles.statValue}>{stats.totalAssignments}</strong>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Currently Assigned</p>
          <strong style={styles.statValue}>{stats.currentlyAssigned}</strong>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Returned</p>
          <strong style={styles.statValue}>{stats.returned}</strong>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Lost</p>
          <strong style={styles.statValue}>{stats.lost}</strong>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Damaged</p>
          <strong style={styles.statValue}>{stats.damaged}</strong>
        </div>
      </div>

      <div style={styles.panel}>
        <div style={styles.formCard}>
          <h2 style={styles.sectionTitle}>Assign Asset</h2>
          <p style={styles.formDescription}>
            Select an asset and employee to create a new assignment record.
          </p>

          <div style={styles.formGrid}>
            <label style={styles.field}>
              Employee *
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
              Asset *
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                style={styles.select}
              >
                <option value="">Select Asset</option>
                {availableAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.asset_name} ({asset.asset_tag})
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.field}>
              Assignment Date *
              <input
                type="date"
                value={assignmentDate}
                onChange={(e) => setAssignmentDate(e.target.value)}
                style={styles.input}
              />
            </label>

            <label style={styles.field}>
              Expected Return Date
              <input
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                style={styles.input}
              />
            </label>

            <label style={styles.fieldFull}>
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add assignment notes, conditions, or special instructions"
                style={styles.textarea}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={confirmAssign}
            disabled={loading || !selectedAsset || !selectedEmployee}
            style={{
              ...styles.submitButton,
              opacity: loading || !selectedAsset || !selectedEmployee ? 0.6 : 1,
            }}
          >
            {loading ? "Processing..." : "Create Assignment"}
          </button>
        </div>
      </div>

      {showAssignModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2>Confirm Assignment</h2>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <p>
                <strong>Asset:</strong>{" "}
                {assets.find((a) => a.id === Number(selectedAsset))?.asset_name}
              </p>
              <p>
                <strong>Employee:</strong>{" "}
                {employees.find((e) => e.id === Number(selectedEmployee))?.full_name}
              </p>
              <p>
                <strong>Assignment Date:</strong> {formatDate(assignmentDate)}
              </p>
              {expectedReturnDate && (
                <p>
                  <strong>Expected Return:</strong> {formatDate(expectedReturnDate)}
                </p>
              )}
              {notes && (
                <p>
                  <strong>Notes:</strong> {notes}
                </p>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={loading}
                style={styles.confirmButton}
              >
                {loading ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReturnModal && selectedAssignment && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2>Process Asset Return</h2>
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <p>
                <strong>Asset:</strong> {selectedAssignment.assets?.asset_name}
              </p>
              <p>
                <strong>Employee:</strong> {selectedAssignment.employees?.full_name}
              </p>
              <p>
                <strong>Original Assignment:</strong>{" "}
                {formatDate(selectedAssignment.assigned_date)}
              </p>

              <label style={styles.field}>
                Return Status *
                <select
                  value={returnStatus}
                  onChange={(e) =>
                    setReturnStatus(e.target.value as "Returned" | "Lost" | "Damaged")
                  }
                  style={styles.select}
                >
                  <option value="Returned">Returned</option>
                  <option value="Lost">Lost</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </label>

              <label style={styles.fieldFull}>
                Return Notes
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={4}
                  placeholder="Add return condition details, damage description, or loss explanation"
                  style={styles.textarea}
                />
              </label>
            </div>
            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReturn}
                disabled={loading}
                style={styles.confirmButton}
              >
                {loading ? "Processing..." : "Confirm Return"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.historyCard}>
        <div style={styles.historyHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Assignment History</h2>
            <p style={styles.historySubtitle}>Search and manage all assignments.</p>
          </div>
        </div>

        <div style={styles.filterSection}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by asset name, tag, or employee..."
            style={styles.searchInput}
          />

          <div style={styles.filterRow}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={styles.filterSelect}
            >
              <option value="All">All Statuses</option>
              <option value="Assigned">Assigned</option>
              <option value="Returned">Returned</option>
              <option value="Lost">Lost</option>
              <option value="Damaged">Damaged</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="All">All Categories</option>
              {getCategories().map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="All">All Employees</option>
              {getEmployeeNames().map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Asset</th>
                <th style={styles.th}>Assigned Date</th>
                <th style={styles.th}>Expected Return</th>
                <th style={styles.th}>Actual Return</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td style={styles.emptyTd} colSpan={7}>
                    No assignments match your filters.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assignment) => {
                  const statusColor = getStatusColor(assignment.status);
                  return (
                    <tr key={assignment.id}>
                      <td style={styles.td}>{assignment.employees?.full_name || "-"}</td>
                      <td style={styles.td}>
                        <div>
                          <strong>
                            {assignment.assets?.asset_name || "-"}
                          </strong>
                          <br />
                          <small style={{ color: "#64748b" }}>
                            {assignment.assets?.asset_tag}
                          </small>
                        </div>
                      </td>
                      <td style={styles.td}>{formatDate(assignment.assigned_date)}</td>
                      <td style={styles.td}>{formatDate(assignment.expected_return_date)}</td>
                      <td style={styles.td}>{formatDate(assignment.actual_return_date)}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            background: statusColor.bg,
                            color: statusColor.text,
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
                            onClick={() => openReturnModal(assignment)}
                          >
                            Process Return
                          </button>
                        ) : (
                          <span style={styles.processedLabel}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
