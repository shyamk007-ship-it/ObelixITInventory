"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { fetchEmployees, safeErrorMessage } from "../../../lib/people";
import { supabase } from "../../../lib/supabase";
import { usePeoplePermissions, useToast } from "../../../hooks/usePeopleModule";
import { EmployeeCard, EmployeeTable, Filters, PeopleHeader, QuickActions, SearchBar } from "../../../components/people";

const pageSizes = [10, 20, 50];
const statusOptions = ["all", "active", "inactive", "on leave", "resigned"];

export default function PeopleEmployeesPage() {
  const permissions = usePeoplePermissions();
  const { toast, showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Awaited<ReturnType<typeof fetchEmployees>>>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchEmployees();
      setEmployees(rows);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load employees."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const departments = useMemo(() => {
    const unique = new Set<string>();
    employees.forEach((row) => {
      if (row.department) unique.add(row.department);
    });
    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [employees]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const rows = employees.filter((row) => {
      const haystack = [row.full_name, row.email, row.department, row.designation, row.phone_number]
        .map((item) => String(item || "").toLowerCase())
        .join(" ");
      const status = String(row.status || "active").toLowerCase();
      const passesSearch = !keyword || haystack.includes(keyword);
      const passesStatus = statusFilter === "all" || status.includes(statusFilter);
      const passesDepartment = departmentFilter === "all" || String(row.department || "").toLowerCase() === departmentFilter.toLowerCase();
      return passesSearch && passesStatus && passesDepartment;
    });

    const sorted = [...rows].sort((left, right) => {
      if (sortBy === "name") return String(left.full_name || "").localeCompare(String(right.full_name || ""));
      if (sortBy === "department") return String(left.department || "").localeCompare(String(right.department || ""));
      if (sortBy === "designation") return String(left.designation || "").localeCompare(String(right.designation || ""));
      if (sortBy === "status") return String(left.status || "").localeCompare(String(right.status || ""));
      const leftDate = new Date(String(left.created_at || 0)).getTime();
      const rightDate = new Date(String(right.created_at || 0)).getTime();
      return rightDate - leftDate;
    });

    return sorted;
  }, [departmentFilter, employees, search, sortBy, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const handleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? paginated.map((row) => row.id) : []);
  };

  const handleBulkStatus = async (status: "Active" | "Inactive") => {
    if (!permissions.canManageEmployees) {
      showToast("You do not have permission to update employee records.");
      return;
    }
    if (!selectedIds.length) {
      showToast("Select employees first.");
      return;
    }

    setSaving(true);
    const response = await supabase.from("employees").update({ status }).in("id", selectedIds);
    setSaving(false);

    if (response.error) {
      showToast(`Failed: ${response.error.message}`);
      return;
    }

    showToast(`Updated ${selectedIds.length} employee(s).`);
    setSelectedIds([]);
    await loadData();
  };

  return (
    <section style={styles.page}>
      <PeopleHeader
        title="Employees"
        subtitle="Search, filter, sort, and manage employee records with bulk operations and profile-level drill-down."
        right={<QuickActions actions={[{ label: "Open Legacy Workspace", href: "/office/employees" }]} />}
      />

      <div style={styles.filtersRow}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search employees by name, department, role or email" />
        <Filters
          label="Department"
          value={departmentFilter}
          onChange={setDepartmentFilter}
          options={departments.map((item) => ({ value: item, label: item === "all" ? "All Departments" : item }))}
        />
        <Filters
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions.map((item) => ({ value: item, label: item === "all" ? "All Statuses" : item }))}
        />
        <Filters
          label="Sort"
          value={sortBy}
          onChange={setSortBy}
          options={[
            { value: "name", label: "Name" },
            { value: "department", label: "Department" },
            { value: "designation", label: "Designation" },
            { value: "status", label: "Status" },
            { value: "created_at", label: "Created Date" },
          ]}
        />
      </div>

      <div style={styles.bulkBar}>
        <div style={styles.bulkLeft}>
          <strong style={styles.bulkTitle}>Bulk Actions</strong>
          <button type="button" style={styles.bulkButton} onClick={() => void handleBulkStatus("Active")} disabled={saving}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Mark Active
          </button>
          <button type="button" style={styles.bulkButton} onClick={() => void handleBulkStatus("Inactive")} disabled={saving}>
            Mark Inactive
          </button>
        </div>
        <div style={styles.bulkRight}>
          <label style={styles.pageSizeLabel}>
            Page Size
            <select value={String(pageSize)} onChange={(event) => setPageSize(Number(event.target.value))} style={styles.select}>
              {pageSizes.map((size) => (
                <option key={size} value={String(size)}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <span style={styles.paginationInfo}>Page {page} / {totalPages}</span>
          <button type="button" style={styles.bulkButton} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Prev</button>
          <button type="button" style={styles.bulkButton} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>Next</button>
        </div>
      </div>

      {loading ? <div style={styles.skeleton} /> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      {!loading && !error && filtered.length === 0 ? <div style={styles.empty}>No employees found for selected filters.</div> : null}

      {!loading && !error && filtered.length > 0 ? (
        <>
          <EmployeeTable rows={paginated} selectedIds={selectedIds} onSelect={handleSelect} onSelectAll={handleSelectAll} />

          <div style={styles.cardGrid}>
            {paginated.slice(0, 8).map((row) => (
              <EmployeeCard
                key={row.id}
                id={row.id}
                name={row.full_name || "Employee"}
                department={row.department || "Unassigned"}
                designation={row.designation || "-"}
                status={row.status || "Active"}
                email={row.email || ""}
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
  page: {
    display: "grid",
    gap: 12,
  },
  filtersRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "end",
  },
  bulkBar: {
    borderRadius: 12,
    border: "1px solid #dbeafe",
    background: "#ffffff",
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.05)",
    padding: 10,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  bulkLeft: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  bulkTitle: {
    color: "#0f172a",
    fontSize: 13,
  },
  bulkRight: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  bulkButton: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1e40af",
    borderRadius: 8,
    padding: "6px 9px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  pageSizeLabel: {
    color: "#64748b",
    fontSize: 12,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  select: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "4px 6px",
  },
  paginationInfo: {
    fontSize: 12,
    color: "#334155",
    fontWeight: 700,
  },
  skeleton: {
    borderRadius: 14,
    height: 260,
    background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)",
    backgroundSize: "200% 100%",
    animation: "pulse 1.4s ease-in-out infinite",
  },
  empty: {
    borderRadius: 12,
    border: "1px dashed #cbd5e1",
    background: "#ffffff",
    padding: 18,
    color: "#64748b",
    fontWeight: 600,
  },
  error: {
    borderRadius: 12,
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#9f1239",
    padding: 12,
    fontWeight: 700,
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
  },
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
