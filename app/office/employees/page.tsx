"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import OfficeAssetModuleNav from "../../components/office/OfficeAssetModuleNav";
import { supabase } from "../../lib/supabase";
import { createAuditLog, createNotificationIfNotExists, buildAuditDescription } from "../../lib/audit";
import { getUserProfile } from "../../lib/rbac";

interface EmployeeRow {
  id: number;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  department?: string | null;
  position?: string | null;
  designation?: string | null;
  manager?: string | null;
  employment_type?: string | null;
  joining_date?: string | null;
  office_branch?: string | null;
  office_location?: string | null;
  floor?: string | null;
  desk_number?: string | null;
  extension_number?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  profile_photo_url?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  role?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  workspace?: string | null;
}

interface AssignmentRow {
  id: number;
  employee_id?: number | null;
  asset_id?: number | null;
  status?: string | null;
  assigned_date?: string | null;
  actual_return_date?: string | null;
  notes?: string | null;
  assets?: {
    id?: number | null;
    asset_name?: string | null;
    asset_tag?: string | null;
    category?: string | null;
    status?: string | null;
  } | null;
}

interface TicketRow {
  id: number;
  employee_id?: number | null;
  title?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  created_at?: string | null;
}

interface EmployeeFormState {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  gender: string;
  date_of_birth: string;
  department: string;
  designation: string;
  manager: string;
  employment_type: string;
  joining_date: string;
  office_branch: string;
  office_location: string;
  floor: string;
  desk_number: string;
  extension_number: string;
  status: string;
  profile_photo_url: string;
}

interface EmployeeDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

const initialForm: EmployeeFormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  gender: "",
  date_of_birth: "",
  department: "",
  designation: "",
  manager: "",
  employment_type: "Permanent",
  joining_date: "",
  office_branch: "",
  office_location: "",
  floor: "",
  desk_number: "",
  extension_number: "",
  status: "Active",
  profile_photo_url: "",
};

const pageSizes = [10, 20, 50] as const;
const sortOptions = [
  { value: "name", label: "Name" },
  { value: "department", label: "Department" },
  { value: "designation", label: "Designation" },
  { value: "office", label: "Office" },
  { value: "status", label: "Status" },
  { value: "assets", label: "Assigned Assets" },
  { value: "created_at", label: "Created" },
] as const;

const statusFilters = ["all", "active", "inactive", "on leave", "resigned", "suspended"] as const;

function employeeCode(id: number) {
  return `EMP-${String(id).padStart(5, "0")}`;
}

function normalize(value?: string | null) {
  return String(value || "").trim();
}

function splitFullName(fullName?: string | null) {
  const parts = normalize(fullName).split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function officeLabel(employee: EmployeeRow) {
  return [employee.office_branch || employee.office_location, employee.floor ? `F${employee.floor}` : null, employee.desk_number ? `Desk ${employee.desk_number}` : null]
    .filter(Boolean)
    .join(" • ");
}

function displayStatus(employee: EmployeeRow) {
  return employee.status || (employee.is_active === false ? "Inactive" : "Active");
}

function isActiveStatus(employee: EmployeeRow) {
  const status = displayStatus(employee).toLowerCase();
  return status === "active" || status === "on leave";
}

function avatarInitials(employee: EmployeeRow) {
  const { first, last } = splitFullName(employee.full_name);
  return `${first.charAt(0)}${last.charAt(0)}`.trim() || employee.full_name?.charAt(0) || "?";
}

function localDocKey(employeeId: number) {
  return `office-employee-documents-${employeeId}`;
}

function loadLocalDocuments(employeeId: number): EmployeeDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(localDocKey(employeeId));
    return raw ? (JSON.parse(raw) as EmployeeDocument[]) : [];
  } catch {
    return [];
  }
}

function saveLocalDocuments(employeeId: number, documents: EmployeeDocument[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localDocKey(employeeId), JSON.stringify(documents));
}

export default function OfficeEmployeesPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("all");
  const [sortField, setSortField] = useState<(typeof sortOptions)[number]["value"]>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState<(typeof pageSizes)[number]>(20);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(initialForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const loadData = async () => {
    setLoading(true);
    const [employeeResponse, assignmentResponse, ticketResponse] = await Promise.all([
      supabase.from("employees").select("*").order("created_at", { ascending: false }),
      supabase
        .from("assignment_records")
        .select("id, employee_id, asset_id, status, assigned_date, actual_return_date, notes, assets(id, asset_name, asset_tag, category, status)")
        .order("assigned_date", { ascending: false }),
      supabase
        .from("tickets")
        .select("id, employee_id, title, category, priority, status, created_at")
        .order("created_at", { ascending: false }),
    ]);

    setEmployees((employeeResponse.data as EmployeeRow[]) || []);
    setAssignments((assignmentResponse.data as AssignmentRow[]) || []);
    setTickets((ticketResponse.data as TicketRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const activeAssignmentsByEmployee = useMemo(() => {
    const bucket = new Map<number, AssignmentRow[]>();
    assignments.forEach((row) => {
      if (!row.employee_id) return;
      const current = bucket.get(row.employee_id) || [];
      current.push(row);
      bucket.set(row.employee_id, current);
    });
    return bucket;
  }, [assignments]);

  const ticketsByEmployee = useMemo(() => {
    const bucket = new Map<number, TicketRow[]>();
    tickets.forEach((row) => {
      if (!row.employee_id) return;
      const current = bucket.get(row.employee_id) || [];
      current.push(row);
      bucket.set(row.employee_id, current);
    });
    return bucket;
  }, [tickets]);

  const enrichedEmployees = useMemo(() => {
    const now = Date.now();
    return employees.map((employee) => {
      const employeeAssignments = activeAssignmentsByEmployee.get(employee.id) || [];
      const activeAssetCount = employeeAssignments.filter((assignment) => (assignment.status || "").toLowerCase() === "assigned").length;
      const activeTickets = (ticketsByEmployee.get(employee.id) || []).filter((ticket) => (ticket.status || "").toLowerCase() === "open").length;
      const createdAt = employee.created_at ? new Date(employee.created_at).getTime() : 0;
      return {
        ...employee,
        displayName: normalize(employee.full_name) || `${normalize(employee.first_name)} ${normalize(employee.last_name)}`.trim() || "Untitled Employee",
        employeeCode: employeeCode(employee.id),
        officeText: officeLabel(employee) || "Unassigned",
        statusText: displayStatus(employee),
        isActive: isActiveStatus(employee),
        activeAssetCount,
        activeTicketCount: activeTickets,
        isNewThisMonth: createdAt ? new Date(createdAt).getMonth() === new Date(now).getMonth() && new Date(createdAt).getFullYear() === new Date(now).getFullYear() : false,
      };
    });
  }, [activeAssignmentsByEmployee, employees, ticketsByEmployee]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = enrichedEmployees.filter((employee) => {
      const matchesDepartment = departmentFilter === "all" || normalize(employee.department).toLowerCase() === departmentFilter;
      const matchesStatus =
        statusFilter === "all" || normalize(employee.statusText).toLowerCase() === statusFilter;
      const searchBlob = [
        employee.displayName,
        employee.employeeCode,
        employee.email,
        employee.department,
        employee.designation || employee.position,
        employee.officeText,
        employee.statusText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesDepartment && matchesStatus && (!query || searchBlob.includes(query));
    });

    const sorter = (a: (typeof enrichedEmployees)[number], b: (typeof enrichedEmployees)[number]) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const text = (valueA?: string | null, valueB?: string | null) => normalize(valueA).localeCompare(normalize(valueB)) * direction;
      switch (sortField) {
        case "department":
          return text(a.department, b.department);
        case "designation":
          return text(a.designation || a.position, b.designation || b.position);
        case "office":
          return text(a.officeText, b.officeText);
        case "status":
          return text(a.statusText, b.statusText);
        case "assets":
          return ((a.activeAssetCount - b.activeAssetCount) || text(a.displayName, b.displayName));
        case "created_at":
          return (((new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()) * direction) || text(a.displayName, b.displayName));
        default:
          return text(a.displayName, b.displayName);
      }
    };

    return filtered.sort(sorter);
  }, [departmentFilter, enrichedEmployees, search, sortDirection, sortField, statusFilter]);

  const pagedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [departmentFilter, search, sortDirection, sortField, statusFilter, pageSize]);

  const dashboard = useMemo(() => {
    const total = employees.length;
    const active = enrichedEmployees.filter((employee) => employee.isActive).length;
    const inactive = total - active;
    const withAssets = enrichedEmployees.filter((employee) => employee.activeAssetCount > 0).length;
    const withoutAssets = total - withAssets;
    const newThisMonth = enrichedEmployees.filter((employee) => employee.isNewThisMonth).length;
    return { total, active, inactive, withAssets, withoutAssets, newThisMonth };
  }, [employees.length, enrichedEmployees]);

  const departments = useMemo(() => {
    const values = new Set<string>();
    enrichedEmployees.forEach((employee) => {
      const department = normalize(employee.department).toLowerCase();
      if (department) values.add(department);
    });
    return Array.from(values).sort();
  }, [enrichedEmployees]);

  const openCreate = () => {
    setEditingEmployeeId(null);
    setForm(initialForm);
    setPhotoFile(null);
    setShowForm(true);
  };

  const openEdit = (employee: EmployeeRow) => {
    const nameParts = splitFullName(employee.full_name);
    setEditingEmployeeId(employee.id);
    setForm({
      first_name: employee.first_name || nameParts.first,
      last_name: employee.last_name || nameParts.last,
      email: normalize(employee.email),
      phone_number: normalize(employee.phone_number),
      gender: normalize(employee.gender),
      date_of_birth: normalize(employee.date_of_birth),
      department: normalize(employee.department),
      designation: normalize(employee.designation || employee.position),
      manager: normalize(employee.manager),
      employment_type: normalize(employee.employment_type) || "Permanent",
      joining_date: normalize(employee.joining_date),
      office_branch: normalize(employee.office_branch),
      office_location: normalize(employee.office_location),
      floor: normalize(employee.floor),
      desk_number: normalize(employee.desk_number),
      extension_number: normalize(employee.extension_number),
      status: normalize(employee.status) || (employee.is_active === false ? "Inactive" : "Active"),
      profile_photo_url: normalize(employee.profile_photo_url),
    });
    setPhotoFile(null);
    setShowForm(true);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    const path = `employee-photos/${Date.now()}-${photoFile.name}`;
    const upload = await supabase.storage.from("profile-photos").upload(path, photoFile, { upsert: true });
    if (upload.error) return null;
    return supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;
  };

  const updateOptionalColumns = async (employeeId: number, optionalPayload: Record<string, string | boolean | null | undefined>) => {
    const groups = [
      ["profile_photo_url", "phone_number", "workspace"],
      ["status", "is_active"],
      ["first_name", "last_name"],
      ["gender", "date_of_birth"],
      ["manager", "employment_type", "joining_date"],
      ["office_branch", "office_location", "floor", "desk_number", "extension_number"],
    ] as const;

    for (const group of groups) {
      const payload = Object.fromEntries(
        group
          .filter((key) => optionalPayload[key] !== undefined)
          .map((key) => [key, optionalPayload[key]])
      );
      if (!Object.keys(payload).length) continue;
      await supabase.from("employees").update(payload).eq("id", employeeId);
    }
  };

  const saveEmployee = async () => {
    const firstName = normalize(form.first_name);
    const lastName = normalize(form.last_name);
    const fullName = `${firstName} ${lastName}`.trim();
    const email = normalize(form.email).toLowerCase();

    if (!fullName || !email) {
      showToast("First name, last name, and email are required.");
      return;
    }

    setSaving(true);
    const existingEmailResponse = await supabase.from("employees").select("id, email").ilike("email", email);
    const duplicateEmail = (existingEmailResponse.data || []).find((row: any) => row.id !== editingEmployeeId);
    if (duplicateEmail) {
      showToast("Email must be unique.");
      setSaving(false);
      return;
    }

    const uploadedPhotoUrl = (await uploadPhoto()) || form.profile_photo_url || null;
    const basePayload = {
      full_name: fullName,
      email,
      department: normalize(form.department) || null,
      position: normalize(form.designation) || null,
      role: "employee",
    };

    let employeeId = editingEmployeeId;
    if (editingEmployeeId) {
      const updateResponse = await supabase.from("employees").update(basePayload).eq("id", editingEmployeeId).select("id").single();
      if (updateResponse.error) {
        showToast(updateResponse.error.message);
        setSaving(false);
        return;
      }
      employeeId = updateResponse.data?.id || editingEmployeeId;
    } else {
      const insertResponse = await supabase.from("employees").insert([basePayload]).select("id").single();
      if (insertResponse.error) {
        showToast(insertResponse.error.message);
        setSaving(false);
        return;
      }
      employeeId = insertResponse.data?.id || null;
    }

    if (!employeeId) {
      showToast("Unable to resolve employee ID.");
      setSaving(false);
      return;
    }

    await updateOptionalColumns(employeeId, {
      profile_photo_url: uploadedPhotoUrl,
      phone_number: normalize(form.phone_number) || null,
      workspace: "office",
      status: normalize(form.status) || "Active",
      is_active: normalize(form.status).toLowerCase() === "inactive" || normalize(form.status).toLowerCase() === "resigned" || normalize(form.status).toLowerCase() === "suspended" ? false : true,
      first_name: firstName || null,
      last_name: lastName || null,
      gender: normalize(form.gender) || null,
      date_of_birth: normalize(form.date_of_birth) || null,
      manager: normalize(form.manager) || null,
      employment_type: normalize(form.employment_type) || null,
      joining_date: normalize(form.joining_date) || null,
      office_branch: normalize(form.office_branch) || null,
      office_location: normalize(form.office_location) || null,
      floor: normalize(form.floor) || null,
      desk_number: normalize(form.desk_number) || null,
      extension_number: normalize(form.extension_number) || null,
    });

    const profile = await getUserProfile();
    const eventName = editingEmployeeId ? "Employee Updated" : "Employee Created";
    await createAuditLog({
      action: eventName,
      description: buildAuditDescription({
        event: eventName,
        userName: profile?.full_name || "Unknown User",
        recordType: "employee",
        recordId: employeeId,
        itemName: fullName,
      }),
    });

    await createNotificationIfNotExists({
      title: eventName,
      message: `${fullName} has been ${editingEmployeeId ? "updated" : "created"} in the Office workspace.`,
      action: eventName,
      createdBy: profile?.full_name || undefined,
      recordType: "employee",
      recordId: employeeId,
    });

    showToast(editingEmployeeId ? "Employee updated." : "Employee created.");
    setShowForm(false);
    setEditingEmployeeId(null);
    setForm(initialForm);
    setPhotoFile(null);
    await loadData();
    setSaving(false);
  };

  const toggleEmployeeStatus = async (employee: EmployeeRow, targetStatus: string) => {
    const confirmAction = targetStatus === "Active"
      ? true
      : window.confirm(`Deactivate ${employee.full_name || employeeCode(employee.id)}?`);
    if (!confirmAction) return;

    const isActive = targetStatus === "Active";
    const optionalPayload = {
      status: targetStatus,
      is_active: isActive,
    };

    await updateOptionalColumns(employee.id, optionalPayload);
    const profile = await getUserProfile();
    await createAuditLog({
      action: isActive ? "Employee Reactivated" : "Employee Deactivated",
      description: buildAuditDescription({
        event: isActive ? "Employee Reactivated" : "Employee Deactivated",
        userName: profile?.full_name || "Unknown User",
        recordType: "employee",
        recordId: employee.id,
        itemName: employee.full_name || employeeCode(employee.id),
      }),
    });
    await createNotificationIfNotExists({
      title: isActive ? "Employee Reactivated" : "Employee Deactivated",
      message: `${employee.full_name || employeeCode(employee.id)} was ${isActive ? "reactivated" : "deactivated"}.`,
      action: isActive ? "Employee Reactivated" : "Employee Deactivated",
      createdBy: profile?.full_name || undefined,
      recordType: "employee",
      recordId: employee.id,
    });
    showToast(isActive ? "Employee reactivated." : "Employee deactivated.");
    await loadData();
  };

  const resetPassword = async (employee: EmployeeRow) => {
    const profile = await getUserProfile();
    await createAuditLog({
      action: "Password Reset",
      description: buildAuditDescription({
        event: "Password Reset",
        userName: profile?.full_name || "Unknown User",
        recordType: "employee",
        recordId: employee.id,
        itemName: employee.full_name || employeeCode(employee.id),
      }),
    });
    await createNotificationIfNotExists({
      title: "Password Reset Requested",
      message: `Password reset requested for ${employee.full_name || employeeCode(employee.id)}.`,
      action: "Password Reset",
      createdBy: profile?.full_name || undefined,
      recordType: "employee",
      recordId: employee.id,
    });
    showToast("Password reset request logged.");
  };

  const deleteEmployee = async (employee: EmployeeRow) => {
    const activeAssignments = (activeAssignmentsByEmployee.get(employee.id) || []).filter((assignment) => (assignment.status || "").toLowerCase() === "assigned");
    if (activeAssignments.length > 0) {
      showToast("Cannot delete an employee with assigned assets.");
      return;
    }

    if (!window.confirm(`Delete ${employee.full_name || employeeCode(employee.id)}?`)) return;

    setDeletingId(employee.id);
    const response = await supabase.from("employees").delete().eq("id", employee.id);
    if (response.error) {
      showToast(response.error.message);
      setDeletingId(null);
      return;
    }

    const profile = await getUserProfile();
    await createAuditLog({
      action: "Employee Deleted",
      description: buildAuditDescription({
        event: "Employee Deleted",
        userName: profile?.full_name || "Unknown User",
        recordType: "employee",
        recordId: employee.id,
        itemName: employee.full_name || employeeCode(employee.id),
      }),
    });
    await createNotificationIfNotExists({
      title: "Employee Deleted",
      message: `${employee.full_name || employeeCode(employee.id)} was deleted from the Office workspace.`,
      action: "Employee Deleted",
      createdBy: profile?.full_name || undefined,
      recordType: "employee",
      recordId: employee.id,
    });
    showToast("Employee deleted.");
    setDeletingId(null);
    await loadData();
  };

  const exportCsv = () => {
    const rows = filteredEmployees.map((employee) => ({
      employee_id: employee.employeeCode,
      name: employee.displayName,
      email: employee.email || "",
      department: employee.department || "",
      designation: employee.designation || employee.position || "",
      office: employee.officeText,
      assigned_assets: employee.activeAssetCount,
      status: employee.statusText,
    }));
    const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "office-employees.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("CSV export generated.");
  };

  const exportExcel = () => {
    const rows = filteredEmployees.map((employee) => ({
      employee_id: employee.employeeCode,
      name: employee.displayName,
      email: employee.email || "",
      phone_number: employee.phone_number || "",
      department: employee.department || "",
      designation: employee.designation || employee.position || "",
      manager: employee.manager || "",
      employment_type: employee.employment_type || "",
      joining_date: employee.joining_date || "",
      office: employee.officeText,
      assigned_assets: employee.activeAssetCount,
      open_tickets: employee.activeTicketCount,
      status: employee.statusText,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "office-employees.xlsx");
    showToast("Excel export generated.");
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(15);
    doc.text("Office Employee List", 14, 14);
    doc.setFontSize(9);
    filteredEmployees.slice(0, 30).forEach((employee, index) => {
      const line = `${employee.employeeCode} | ${employee.displayName} | ${employee.department || ""} | ${employee.designation || employee.position || ""} | ${employee.officeText} | ${employee.statusText}`;
      doc.text(line, 14, 24 + index * 7);
    });
    doc.save("office-employees.pdf");
    showToast("PDF export generated.");
  };

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const departmentsVisible = departments;

  if (loading) {
    return (
      <div style={styles.page}>
        <OfficeAssetModuleNav />
        <section style={styles.headerCard}>
          <div style={styles.skeletonTitle} />
          <div style={styles.skeletonLine} />
          <div style={styles.skeletonRow} />
        </section>
        <section style={styles.listCard}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} style={styles.skeletonItem} />
          ))}
        </section>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <OfficeAssetModuleNav />

      <section style={styles.hero}>
        <div style={styles.heroCopy}>
          <p style={styles.eyebrow}>People</p>
          <h2 style={styles.title}>Employee Management System</h2>
          <p style={styles.subtitle}>
            Manage office employees, profile data, asset ownership, support history, and workspace administration in one enterprise view.
          </p>
          <div style={styles.heroActions}>
            <button style={styles.primaryButton} onClick={openCreate}>Create Employee</button>
            <button style={styles.secondaryButton} onClick={exportExcel}>Export Excel</button>
            <button style={styles.secondaryButton} onClick={exportCsv}>Export CSV</button>
            <button style={styles.secondaryButton} onClick={exportPdf}>Export PDF</button>
          </div>
        </div>
        <div style={styles.heroMetrics}>
          <MiniMetric label="Total Employees" value={dashboard.total} />
          <MiniMetric label="Active Employees" value={dashboard.active} />
          <MiniMetric label="Inactive Employees" value={dashboard.inactive} />
          <MiniMetric label="With Assets" value={dashboard.withAssets} />
          <MiniMetric label="Without Assets" value={dashboard.withoutAssets} />
          <MiniMetric label="New This Month" value={dashboard.newThisMonth} />
        </div>
      </section>

      <section style={styles.toolbar}>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, department, designation, office, or status" style={styles.searchInput} />
        <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} style={styles.input}>
          <option value="all">All Departments</option>
          {departmentsVisible.map((department) => (
            <option key={department} value={department}>{department}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} style={styles.input}>
          <option value="all">All Statuses</option>
          {statusFilters.filter((status) => status !== "all").map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <select value={sortField} onChange={(event) => setSortField(event.target.value as typeof sortField)} style={styles.input}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button style={styles.secondaryButton} onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}>
          Sort {sortDirection === "asc" ? "Ascending" : "Descending"}
        </button>
        <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value) as (typeof pageSizes)[number])} style={styles.input}>
          {pageSizes.map((size) => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </select>
      </section>

      <section style={styles.listCard}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Photo</th>
                <th style={styles.th}>Employee ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Designation</th>
                <th style={styles.th}>Office</th>
                <th style={styles.th}>Assigned Assets</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={10} style={styles.empty}>No employees found.</td>
                </tr>
              ) : pagedEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td style={styles.td}>
                    <Link href={`/office/employees/${employee.id}`} style={styles.avatarLink}>
                      {employee.profile_photo_url ? <img src={employee.profile_photo_url} alt={employee.displayName} style={styles.avatarImage} /> : <span style={styles.avatar}>{avatarInitials(employee)}</span>}
                    </Link>
                  </td>
                  <td style={styles.td}>{employee.employeeCode}</td>
                  <td style={styles.td}>
                    <div style={styles.nameCell}>
                      <Link href={`/office/employees/${employee.id}`} style={styles.nameLink}>{employee.displayName}</Link>
                      <span style={styles.muted}>{employee.employment_type || "Office employee"}</span>
                    </div>
                  </td>
                  <td style={styles.td}>{employee.email || "-"}</td>
                  <td style={styles.td}>{employee.department || "-"}</td>
                  <td style={styles.td}>{employee.designation || employee.position || "-"}</td>
                  <td style={styles.td}>{employee.officeText}</td>
                  <td style={styles.td}>{employee.activeAssetCount}</td>
                  <td style={styles.td}><span style={{ ...styles.statusBadge, ...(employee.isActive ? styles.statusActive : styles.statusInactive) }}>{employee.statusText}</span></td>
                  <td style={styles.td}>
                    <div style={styles.actionRow}>
                      <Link href={`/office/employees/${employee.id}`} style={styles.actionButton}>View</Link>
                      <button style={styles.actionButton} onClick={() => openEdit(employee)}>Edit</button>
                      <button style={styles.actionButton} onClick={() => void toggleEmployeeStatus(employee, employee.isActive ? "Suspended" : "Active")}>{employee.isActive ? "Deactivate" : "Reactivate"}</button>
                      <button style={styles.actionButton} onClick={() => void resetPassword(employee)}>Reset Password</button>
                      <button style={styles.actionDangerButton} onClick={() => void deleteEmployee(employee)} disabled={deletingId === employee.id}>{deletingId === employee.id ? "Deleting..." : "Delete"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.paginationBar}>
          <span>Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredEmployees.length)} of {filteredEmployees.length}</span>
          <div style={styles.paginationActions}>
            <button style={styles.secondaryButton} disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <span style={styles.pageLabel}>Page {page} of {totalPages}</span>
            <button style={styles.secondaryButton} disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
          </div>
        </div>
      </section>

      {showForm && (
        <EmployeeFormModal
          editing={editingEmployeeId !== null}
          saving={saving}
          form={form}
          onClose={() => {
            setShowForm(false);
            setEditingEmployeeId(null);
            setForm(initialForm);
            setPhotoFile(null);
          }}
          onChange={setForm}
          onPhotoChange={setPhotoFile}
          onSave={() => void saveEmployee()}
        />
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <article style={styles.metricCard}>
      <p style={styles.metricLabel}>{label}</p>
      <strong style={styles.metricValue}>{value}</strong>
    </article>
  );
}

function EmployeeFormModal({
  editing,
  saving,
  form,
  onClose,
  onChange,
  onPhotoChange,
  onSave,
}: {
  editing: boolean;
  saving: boolean;
  form: EmployeeFormState;
  onClose: () => void;
  onChange: (value: EmployeeFormState) => void;
  onPhotoChange: (file: File | null) => void;
  onSave: () => void;
}) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <p style={styles.eyebrow}>{editing ? "Edit Employee" : "Create Employee"}</p>
            <h3 style={styles.modalTitle}>{editing ? "Update Employee Profile" : "New Employee Profile"}</h3>
            <p style={styles.modalSubtitle}>Office employee details, IT ownership, and office assignment fields.</p>
          </div>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>
        <div style={styles.modalBody}>
          <section style={styles.formSection}>
            <h4 style={styles.sectionTitle}>Personal Information</h4>
            <div style={styles.formGrid}>
              <input value={form.first_name} onChange={(event) => onChange({ ...form, first_name: event.target.value })} placeholder="First Name" style={styles.input} />
              <input value={form.last_name} onChange={(event) => onChange({ ...form, last_name: event.target.value })} placeholder="Last Name" style={styles.input} />
              <input type="email" value={form.email} onChange={(event) => onChange({ ...form, email: event.target.value })} placeholder="Email" style={styles.input} />
              <input value={form.phone_number} onChange={(event) => onChange({ ...form, phone_number: event.target.value })} placeholder="Mobile Number" style={styles.input} />
              <select value={form.gender} onChange={(event) => onChange({ ...form, gender: event.target.value })} style={styles.input}>
                <option value="">Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              <input type="date" value={form.date_of_birth} onChange={(event) => onChange({ ...form, date_of_birth: event.target.value })} style={styles.input} />
            </div>
          </section>

          <section style={styles.formSection}>
            <h4 style={styles.sectionTitle}>Employment Information</h4>
            <div style={styles.formGrid}>
              <input value={form.department} onChange={(event) => onChange({ ...form, department: event.target.value })} placeholder="Department" style={styles.input} />
              <input value={form.designation} onChange={(event) => onChange({ ...form, designation: event.target.value })} placeholder="Designation" style={styles.input} />
              <input value={form.manager} onChange={(event) => onChange({ ...form, manager: event.target.value })} placeholder="Manager" style={styles.input} />
              <select value={form.employment_type} onChange={(event) => onChange({ ...form, employment_type: event.target.value })} style={styles.input}>
                <option value="Permanent">Permanent</option>
                <option value="Contract">Contract</option>
                <option value="Intern">Intern</option>
                <option value="Temporary">Temporary</option>
              </select>
              <input type="date" value={form.joining_date} onChange={(event) => onChange({ ...form, joining_date: event.target.value })} style={styles.input} />
              <select value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value })} style={styles.input}>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Resigned">Resigned</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </section>

          <section style={styles.formSection}>
            <h4 style={styles.sectionTitle}>Office Information</h4>
            <div style={styles.formGrid}>
              <input value={form.office_branch} onChange={(event) => onChange({ ...form, office_branch: event.target.value })} placeholder="Office Branch" style={styles.input} />
              <input value={form.office_location} onChange={(event) => onChange({ ...form, office_location: event.target.value })} placeholder="Office Location" style={styles.input} />
              <input value={form.floor} onChange={(event) => onChange({ ...form, floor: event.target.value })} placeholder="Floor" style={styles.input} />
              <input value={form.desk_number} onChange={(event) => onChange({ ...form, desk_number: event.target.value })} placeholder="Cabin / Desk Number" style={styles.input} />
              <input value={form.extension_number} onChange={(event) => onChange({ ...form, extension_number: event.target.value })} placeholder="Extension Number" style={styles.input} />
              <label style={styles.fileField}>
                Profile Photo
                <input type="file" accept="image/*" onChange={(event) => onPhotoChange(event.target.files?.[0] || null)} style={styles.fileInput} />
              </label>
            </div>
          </section>

          <div style={styles.modalActions}>
            <button onClick={onClose} style={styles.secondaryButton}>Cancel</button>
            <button onClick={onSave} style={styles.primaryButton}>{saving ? "Saving..." : editing ? "Save Changes" : "Create Employee"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 16 },
  hero: { display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: 22, borderRadius: 24, background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.96) 100%)", border: "1px solid rgba(191, 219, 254, 0.9)", boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)" },
  heroCopy: { maxWidth: 800, display: "grid", gap: 10 },
  eyebrow: { margin: 0, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 11, fontWeight: 800 },
  title: { margin: 0, color: "#0f172a", fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em" },
  subtitle: { margin: 0, color: "#64748b", lineHeight: 1.65 },
  heroActions: { display: "flex", flexWrap: "wrap", gap: 10 },
  heroMetrics: { display: "grid", gridTemplateColumns: "repeat(2, minmax(140px, 1fr))", gap: 10, minWidth: 320 },
  metricCard: { padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.96)", border: "1px solid rgba(191, 219, 254, 0.9)", boxShadow: "0 10px 22px rgba(15,23,42,0.05)" },
  metricLabel: { margin: 0, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 11, fontWeight: 800 },
  metricValue: { display: "block", marginTop: 8, color: "#0f172a", fontSize: 24, fontWeight: 900 },
  toolbar: { display: "grid", gridTemplateColumns: "minmax(260px, 1.5fr) repeat(5, minmax(0, 1fr))", gap: 10, alignItems: "center" },
  searchInput: { width: "100%", padding: 13, borderRadius: 14, border: "1px solid #cbd5e1", background: "white", fontSize: 14 },
  input: { width: "100%", padding: 13, borderRadius: 14, border: "1px solid #cbd5e1", background: "white", fontSize: 14 },
  primaryButton: { border: "none", borderRadius: 14, background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "white", padding: "12px 16px", fontWeight: 800, cursor: "pointer", textDecoration: "none" },
  secondaryButton: { border: "1px solid rgba(191, 219, 254, 0.95)", borderRadius: 14, background: "rgba(255,255,255,0.94)", color: "#0f172a", padding: "12px 16px", fontWeight: 800, cursor: "pointer", textDecoration: "none" },
  listCard: { background: "rgba(255,255,255,0.94)", borderRadius: 22, border: "1px solid rgba(191, 219, 254, 0.9)", boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)", overflow: "hidden" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 1120 },
  th: { textAlign: "left", padding: 14, background: "#f8fafc", color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" },
  td: { padding: 14, borderTop: "1px solid #e2e8f0", color: "#0f172a", verticalAlign: "top" },
  empty: { textAlign: "center", padding: 22, color: "#64748b" },
  avatarLink: { display: "inline-flex", textDecoration: "none" },
  avatar: { width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb 0%, #0f766e 100%)", color: "white", display: "grid", placeItems: "center", fontWeight: 900 },
  avatarImage: { width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(191, 219, 254, 0.9)" },
  nameCell: { display: "grid", gap: 4 },
  nameLink: { color: "#0f172a", fontWeight: 900, textDecoration: "none" },
  muted: { color: "#64748b", fontSize: 12 },
  statusBadge: { display: "inline-flex", padding: "6px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 },
  statusActive: { background: "#dcfce7", color: "#166534" },
  statusInactive: { background: "#e2e8f0", color: "#334155" },
  actionRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  actionButton: { border: "1px solid #cbd5e1", borderRadius: 12, padding: "8px 10px", background: "white", color: "#0f172a", cursor: "pointer", fontWeight: 800, textDecoration: "none" },
  actionDangerButton: { border: "1px solid #fecaca", borderRadius: 12, padding: "8px 10px", background: "#fff1f2", color: "#be123c", cursor: "pointer", fontWeight: 800 },
  paginationBar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: 16, borderTop: "1px solid #e2e8f0", flexWrap: "wrap" },
  paginationActions: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  pageLabel: { color: "#64748b", fontWeight: 700 },
  toast: { position: "fixed", right: 18, bottom: 18, background: "#0f172a", color: "white", borderRadius: 14, padding: "12px 14px", fontWeight: 800, boxShadow: "0 20px 45px rgba(15,23,42,0.18)" },
  skeletonTitle: { width: 280, height: 34, borderRadius: 10, background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)", backgroundSize: "200% 100%", animation: "pulse 1.4s infinite" },
  skeletonLine: { width: "60%", height: 18, marginTop: 12, borderRadius: 10, background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)", backgroundSize: "200% 100%", animation: "pulse 1.4s infinite" },
  skeletonRow: { width: "100%", height: 42, marginTop: 20, borderRadius: 14, background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)", backgroundSize: "200% 100%", animation: "pulse 1.4s infinite" },
  skeletonItem: { height: 88, borderRadius: 16, background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)", backgroundSize: "200% 100%", animation: "pulse 1.4s infinite" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "grid", placeItems: "center", padding: 20, zIndex: 1000 },
  modal: { width: "100%", maxWidth: 1040, maxHeight: "92vh", overflow: "hidden", background: "white", borderRadius: 28, boxShadow: "0 40px 100px rgba(15, 23, 42, 0.22)" },
  modalHeader: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", padding: 24, borderBottom: "1px solid #e2e8f0" },
  modalTitle: { margin: "8px 0 0", color: "#0f172a", fontSize: 26, fontWeight: 900 },
  modalSubtitle: { margin: "8px 0 0", color: "#64748b" },
  closeButton: { width: 42, height: 42, borderRadius: "50%", border: "none", background: "#e2e8f0", color: "#0f172a", fontSize: 24, cursor: "pointer" },
  modalBody: { padding: 24, display: "grid", gap: 18, overflowY: "auto", maxHeight: "calc(92vh - 93px)" },
  formSection: { display: "grid", gap: 10 },
  sectionTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 900 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 },
  fileField: { display: "grid", gap: 8, color: "#334155", fontWeight: 700, fontSize: 13 },
  fileInput: { width: "100%", padding: 10, borderRadius: 12, border: "1px solid #cbd5e1", background: "white" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
};
