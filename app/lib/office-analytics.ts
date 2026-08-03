import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { supabase } from "./supabase";

export type OfficeAnalyticsMetric =
  | "total-office-assets"
  | "assigned-assets"
  | "available-assets"
  | "employees"
  | "open-tickets"
  | "resolved-tickets"
  | "critical-issues"
  | "maintenance-due"
  | "warranty-expiring";

export interface OfficeAssetRow {
  id: number;
  asset_name?: string | null;
  asset_tag?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  status?: string | null;
  purchase_date?: string | null;
  warranty_expiry?: string | null;
  currently_assigned_to?: number | null;
  created_at?: string | null;
}

export interface OfficeAssetExtensionRow {
  asset_id: number;
  department?: string | null;
  vendor?: string | null;
  location?: string | null;
  asset_condition?: string | null;
  barcode_value?: string | null;
}

export interface OfficeEmployeeRow {
  id: number;
  full_name?: string | null;
  department?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface OfficeTicketRow {
  id: number;
  title?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface OfficeMaintenanceRow {
  id: number;
  asset_id: number;
  maintenance_date?: string | null;
  vendor?: string | null;
  service_details?: string | null;
  maintenance_cost?: number | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
  assets?: { asset_name?: string | null; asset_tag?: string | null; category?: string | null } | null;
}

export interface OfficeAssignmentRow {
  id: number;
  asset_id?: number | null;
  employee_id?: number | null;
  status?: string | null;
  assigned_date?: string | null;
  expected_return_date?: string | null;
  actual_return_date?: string | null;
  notes?: string | null;
  employees?: { full_name?: string | null; department?: string | null } | null;
  assets?: { asset_name?: string | null; asset_tag?: string | null; category?: string | null } | null;
}

export interface OfficeActivityRow {
  id: number;
  action?: string | null;
  description?: string | null;
  created_at?: string | null;
}

export interface OfficeAnalyticsData {
  assets: OfficeAssetRow[];
  assetExtensions: Record<number, OfficeAssetExtensionRow>;
  employees: OfficeEmployeeRow[];
  tickets: OfficeTicketRow[];
  maintenance: OfficeMaintenanceRow[];
  assignments: OfficeAssignmentRow[];
  activity: OfficeActivityRow[];
}

export interface AnalyticsTableRow extends Record<string, string | number | null | undefined> {
  name: string;
  status: string;
  category: string;
  department: string;
  date: string | null;
  value: number;
  detail: string;
}

export interface AnalyticsSeriesPoint {
  label: string;
  value: number;
}

export interface AnalyticsPageState {
  rows: AnalyticsTableRow[];
  tableColumns: string[];
  summary: Array<{ label: string; value: string | number; hint?: string }>;
  lineData: AnalyticsSeriesPoint[];
  barData: AnalyticsSeriesPoint[];
  pieData: AnalyticsSeriesPoint[];
  doughnutData: AnalyticsSeriesPoint[];
  recentActivity: Array<{ label: string; detail: string; when: string; kind: string }>;
}

export interface DashboardInsightData {
  assetGrowth: AnalyticsSeriesPoint[];
  assetsByCategory: AnalyticsSeriesPoint[];
  assetsByDepartment: AnalyticsSeriesPoint[];
  monthlyAssignments: AnalyticsSeriesPoint[];
  warrantyForecast: AnalyticsSeriesPoint[];
  maintenanceStatus: AnalyticsSeriesPoint[];
  recentActivity: Array<{ label: string; detail: string; when: string; kind: string }>;
  totalOfficeAssets: number;
  assignedAssets: number;
  availableAssets: number;
  employees: number;
  openTickets: number;
  resolvedTickets: number;
  criticalIssues: number;
  maintenanceDue: number;
  warrantyExpiring: number;
}

export const OFFICE_ANALYTICS_METRICS: Record<OfficeAnalyticsMetric, { label: string; path: string; subtitle: string }> = {
  "total-office-assets": { label: "Total Office Assets", path: "/office/analytics/total-office-assets", subtitle: "Asset coverage, lifecycle distribution, and growth trends." },
  "assigned-assets": { label: "Assigned Assets", path: "/office/analytics/assigned-assets", subtitle: "Asset allocations, ownership concentration, and return workload." },
  "available-assets": { label: "Available Assets", path: "/office/analytics/available-assets", subtitle: "Inventory capacity, readiness, and stock balance." },
  employees: { label: "Employees", path: "/office/analytics/employees", subtitle: "Headcount, department mix, and workforce activity." },
  "open-tickets": { label: "Open Tickets", path: "/office/analytics/open-tickets", subtitle: "Queue volume, critical items, and ticket aging." },
  "resolved-tickets": { label: "Resolved Tickets", path: "/office/analytics/resolved-tickets", subtitle: "Closed work, resolution cadence, and service delivery." },
  "critical-issues": { label: "Critical Issues", path: "/office/analytics/critical-issues", subtitle: "Escalations, severity mix, and operational risk." },
  "maintenance-due": { label: "Maintenance Due", path: "/office/analytics/maintenance-due", subtitle: "Upcoming service tasks and preventive maintenance planning." },
  "warranty-expiring": { label: "Warranty Expiring", path: "/office/analytics/warranty-expiring", subtitle: "Warranty risk, expiry forecast, and vendor exposure." },
};

const monthFormatter = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });

const formatMonth = (value?: string | null) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return monthFormatter.format(date);
};

const toCountSeries = (rows: AnalyticsTableRow[], key: keyof Pick<AnalyticsTableRow, "category" | "department" | "status" | "detail">): AnalyticsSeriesPoint[] => {
  const bucket = new Map<string, number>();
  rows.forEach((row) => {
    const value = String(row[key] || "Unknown");
    bucket.set(value, (bucket.get(value) || 0) + 1);
  });
  return Array.from(bucket.entries()).map(([label, value]) => ({ label, value }));
};

const toMonthSeries = (rows: AnalyticsTableRow[]): AnalyticsSeriesPoint[] => {
  const bucket = new Map<string, number>();
  rows.forEach((row) => {
    const label = formatMonth(row.date);
    bucket.set(label, (bucket.get(label) || 0) + 1);
  });
  return Array.from(bucket.entries()).map(([label, value]) => ({ label, value }));
};

const toWarrantyForecast = (assets: OfficeAssetRow[]): AnalyticsSeriesPoint[] => {
  const bucket = new Map<string, number>();
  assets.forEach((asset) => {
    if (!asset.warranty_expiry) return;
    const date = new Date(asset.warranty_expiry);
    if (Number.isNaN(date.getTime())) return;
    bucket.set(formatMonth(asset.warranty_expiry), (bucket.get(formatMonth(asset.warranty_expiry)) || 0) + 1);
  });
  return Array.from(bucket.entries()).slice(0, 12).map(([label, value]) => ({ label, value }));
};

const toRecentActivity = (data: OfficeAnalyticsData) => {
  const rows: Array<{ label: string; detail: string; when: string; kind: string }> = [];

  data.assets.slice(0, 12).forEach((asset) => {
    if (!asset.created_at) return;
    rows.push({ label: `New Asset`, detail: asset.asset_name || asset.asset_tag || "Asset created", when: asset.created_at, kind: "Asset" });
  });

  data.assignments.slice(0, 12).forEach((assignment) => {
    if (!assignment.assigned_date) return;
    rows.push({ label: "Asset Assignment", detail: `${assignment.assets?.asset_name || "Asset"} assigned to ${assignment.employees?.full_name || "Employee"}`, when: assignment.assigned_date, kind: "Assignment" });
  });

  data.employees.slice(0, 12).forEach((employee) => {
    if (!employee.created_at) return;
    rows.push({ label: "Employee Creation", detail: employee.full_name || "Employee record", when: employee.created_at, kind: "Employee" });
  });

  data.tickets.slice(0, 12).forEach((ticket) => {
    if (!ticket.created_at) return;
    rows.push({ label: "Ticket Update", detail: `${ticket.title || "Ticket"} • ${ticket.status || "Open"}`, when: ticket.created_at, kind: "Ticket" });
  });

  data.maintenance.slice(0, 12).forEach((item) => {
    const when = item.created_at || item.maintenance_date;
    if (!when) return;
    rows.push({ label: "Maintenance Update", detail: `${item.assets?.asset_name || "Asset"} • ${item.status || "Pending"}`, when, kind: "Maintenance" });
  });

  return rows
    .filter((row) => row.when)
    .sort((left, right) => new Date(String(right.when)).getTime() - new Date(String(left.when)).getTime())
    .slice(0, 12);
};

export async function loadOfficeAnalyticsData(): Promise<OfficeAnalyticsData> {
  const [assetResponse, employeeResponse, ticketResponse, maintenanceResponse, assignmentResponse, activityResponse, extensionResponse] = await Promise.all([
    supabase.from("assets").select("id, asset_name, asset_tag, category, brand, model, status, purchase_date, warranty_expiry, currently_assigned_to, created_at").is("vessel_id", null).order("created_at", { ascending: false }),
    supabase.from("employees").select("id, full_name, department, status, created_at").order("created_at", { ascending: false }),
    supabase.from("tickets").select("id, title, category, priority, status, created_at").is("vessel_id", null).order("created_at", { ascending: false }),
    supabase.from("asset_maintenance").select("id, asset_id, maintenance_date, vendor, service_details, maintenance_cost, status, notes, created_at, assets(asset_name, asset_tag, category)").order("maintenance_date", { ascending: false }),
    supabase.from("assignment_records").select("id, asset_id, employee_id, status, assigned_date, expected_return_date, actual_return_date, notes, employees(full_name, department), assets(asset_name, asset_tag, category)").order("assigned_date", { ascending: false }),
    supabase.from("activity_logs").select("id, action, description, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("asset_register_extensions").select("asset_id, department, vendor, location, asset_condition, barcode_value"),
  ]);

  const assetExtensions: Record<number, OfficeAssetExtensionRow> = {};
  ((extensionResponse.data || []) as OfficeAssetExtensionRow[]).forEach((row) => {
    assetExtensions[row.asset_id] = row;
  });

  return {
    assets: (assetResponse.data as OfficeAssetRow[]) || [],
    assetExtensions,
    employees: (employeeResponse.data as OfficeEmployeeRow[]) || [],
    tickets: (ticketResponse.data as OfficeTicketRow[]) || [],
    maintenance: (maintenanceResponse.data as OfficeMaintenanceRow[]) || [],
    assignments: (assignmentResponse.data as OfficeAssignmentRow[]) || [],
    activity: (activityResponse.data as OfficeActivityRow[]) || [],
  };
}

export function getDashboardInsights(data: OfficeAnalyticsData): DashboardInsightData {
  const now = Date.now();
  const assignedAssets = data.assets.filter((asset) => asset.status === "Assigned" || asset.currently_assigned_to !== null).length;
  const availableAssets = data.assets.filter((asset) => String(asset.status || "").toLowerCase() === "available").length;
  const openTickets = data.tickets.filter((ticket) => String(ticket.status || "").toLowerCase() === "open").length;
  const resolvedTickets = data.tickets.filter((ticket) => ["resolved", "closed"].includes(String(ticket.status || "").toLowerCase())).length;
  const criticalIssues = data.tickets.filter((ticket) => String(ticket.priority || "").toLowerCase() === "critical").length;
  const warrantyExpiring = data.assets.filter((asset) => {
    if (!asset.warranty_expiry) return false;
    const deltaDays = (new Date(asset.warranty_expiry).getTime() - now) / (1000 * 60 * 60 * 24);
    return deltaDays >= 0 && deltaDays <= 30;
  }).length;
  const maintenanceDue = data.maintenance.filter((row) => {
    if (!row.maintenance_date) return false;
    const deltaDays = (new Date(row.maintenance_date).getTime() - now) / (1000 * 60 * 60 * 24);
    return String(row.status || "").toLowerCase() === "pending" && deltaDays >= 0 && deltaDays <= 30;
  }).length;

  const assetGrowth = toMonthSeries(
    data.assets.map((asset) => ({
      name: asset.asset_name || asset.asset_tag || "Asset",
      status: asset.status || "Unknown",
      category: asset.category || "Uncategorized",
      department: data.assetExtensions[asset.id]?.department || "Unassigned",
      date: asset.created_at || null,
      value: 1,
      detail: asset.brand || asset.model || "Asset created",
    }))
  );

  return {
    assetGrowth,
    assetsByCategory: toCountSeries(
      data.assets.map((asset) => ({
        name: asset.asset_name || asset.asset_tag || "Asset",
        status: asset.status || "Unknown",
        category: asset.category || "Uncategorized",
        department: data.assetExtensions[asset.id]?.department || "Unassigned",
        date: asset.created_at || null,
        value: 1,
        detail: data.assetExtensions[asset.id]?.vendor || "Office Asset",
      })),
      "category"
    ),
    assetsByDepartment: toCountSeries(
      data.assets.map((asset) => ({
        name: asset.asset_name || asset.asset_tag || "Asset",
        status: asset.status || "Unknown",
        category: asset.category || "Uncategorized",
        department: data.assetExtensions[asset.id]?.department || "Unassigned",
        date: asset.created_at || null,
        value: 1,
        detail: data.assetExtensions[asset.id]?.vendor || "Office Asset",
      })),
      "department"
    ),
    monthlyAssignments: toMonthSeries(
      data.assignments.map((assignment) => ({
        name: assignment.assets?.asset_name || "Assignment",
        status: assignment.status || "Assigned",
        category: assignment.assets?.category || "Uncategorized",
        department: assignment.employees?.department || "Unassigned",
        date: assignment.assigned_date || null,
        value: 1,
        detail: assignment.employees?.full_name || "Employee",
      }))
    ),
    warrantyForecast: toWarrantyForecast(data.assets),
    maintenanceStatus: toCountSeries(
      data.maintenance.map((row) => ({
        name: row.assets?.asset_name || "Maintenance",
        status: row.status || "Pending",
        category: row.assets?.category || "Uncategorized",
        department: data.assetExtensions[row.asset_id]?.department || "Unassigned",
        date: row.created_at || row.maintenance_date || null,
        value: 1,
        detail: row.vendor || row.service_details || "Scheduled maintenance",
      })),
      "status"
    ),
    recentActivity: toRecentActivity(data),
    totalOfficeAssets: data.assets.length,
    assignedAssets,
    availableAssets,
    employees: data.employees.length,
    openTickets,
    resolvedTickets,
    criticalIssues,
    maintenanceDue,
    warrantyExpiring,
  };
}

export function buildAnalyticsPageState(metric: OfficeAnalyticsMetric, data: OfficeAnalyticsData): AnalyticsPageState {
  const assetRows = data.assets.map((asset) => ({
    name: asset.asset_name || asset.asset_tag || "Asset",
    status: asset.status || "Unknown",
    category: asset.category || "Uncategorized",
    department: data.assetExtensions[asset.id]?.department || "Unassigned",
    date: asset.created_at || null,
    value: 1,
    detail: [data.assetExtensions[asset.id]?.vendor, asset.brand, asset.model].filter(Boolean).join(" • ") || "Office Asset",
    asset_tag: asset.asset_tag || "",
    warranty_expiry: asset.warranty_expiry || null,
    purchase_date: asset.purchase_date || null,
  }));

  const employeeRows = data.employees.map((employee) => ({
    name: employee.full_name || "Employee",
    status: employee.status || "Active",
    category: employee.department || "Unassigned",
    department: employee.department || "Unassigned",
    date: employee.created_at || null,
    value: 1,
    detail: employee.department || "Office Employee",
  }));

  const ticketRows = data.tickets.map((ticket) => ({
    name: ticket.title || "Ticket",
    status: ticket.status || "Open",
    category: ticket.category || "General",
    department: "Office Support",
    date: ticket.created_at || null,
    value: 1,
    detail: ticket.priority || "Normal",
  }));

  const maintenanceRows = data.maintenance.map((row) => ({
    name: row.assets?.asset_name || "Maintenance",
    status: row.status || "Pending",
    category: row.assets?.category || "Uncategorized",
    department: data.assetExtensions[row.asset_id]?.department || "Unassigned",
    date: row.maintenance_date || row.created_at || null,
    value: Number(row.maintenance_cost || 0),
    detail: row.vendor || row.service_details || "Scheduled maintenance",
  }));

  const assignmentRows = data.assignments.map((row) => ({
    name: row.assets?.asset_name || "Assignment",
    status: row.status || "Assigned",
    category: row.assets?.category || "Uncategorized",
    department: row.employees?.department || "Unassigned",
    date: row.assigned_date || null,
    value: 1,
    detail: row.employees?.full_name || "Employee",
  }));

  const rowsByMetric: Record<OfficeAnalyticsMetric, AnalyticsTableRow[]> = {
    "total-office-assets": assetRows,
    "assigned-assets": assetRows.filter((row) => row.status === "Assigned" || row.value > 0 && row.detail),
    "available-assets": assetRows.filter((row) => String(row.status).toLowerCase() === "available"),
    employees: employeeRows,
    "open-tickets": ticketRows.filter((row) => String(row.status).toLowerCase() === "open"),
    "resolved-tickets": ticketRows.filter((row) => ["resolved", "closed"].includes(String(row.status).toLowerCase())),
    "critical-issues": ticketRows.filter((row) => String(row.detail).toLowerCase().includes("critical")),
    "maintenance-due": maintenanceRows.filter((row) => String(row.status).toLowerCase() === "pending"),
    "warranty-expiring": assetRows.filter((row) => {
      if (!row.warranty_expiry) return false;
      const deltaDays = (new Date(String(row.warranty_expiry)).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return deltaDays >= 0 && deltaDays <= 30;
    }),
  };

  const rowColumnsByMetric: Record<OfficeAnalyticsMetric, string[]> = {
    "total-office-assets": ["name", "asset_tag", "category", "department", "status", "date", "detail"],
    "assigned-assets": ["name", "asset_tag", "category", "department", "status", "date", "detail"],
    "available-assets": ["name", "asset_tag", "category", "department", "status", "date", "detail"],
    employees: ["name", "department", "status", "date", "detail"],
    "open-tickets": ["name", "category", "status", "date", "detail"],
    "resolved-tickets": ["name", "category", "status", "date", "detail"],
    "critical-issues": ["name", "category", "status", "date", "detail"],
    "maintenance-due": ["name", "category", "department", "status", "date", "detail", "value"],
    "warranty-expiring": ["name", "asset_tag", "category", "department", "status", "date", "warranty_expiry"],
  };

  const summary = {
    "total-office-assets": [
      { label: "Total Assets", value: rowsByMetric[metric].length },
      { label: "Assigned", value: assetRows.filter((row) => row.status === "Assigned").length },
      { label: "Available", value: assetRows.filter((row) => String(row.status).toLowerCase() === "available").length },
      { label: "Categories", value: new Set(assetRows.map((row) => row.category)).size },
    ],
    "assigned-assets": [
      { label: "Assigned Assets", value: rowsByMetric[metric].length },
      { label: "Employees", value: data.employees.length },
      { label: "Assignments", value: data.assignments.length },
      { label: "Open Returns", value: data.assignments.filter((row) => row.status === "Assigned").length },
    ],
    "available-assets": [
      { label: "Available Assets", value: rowsByMetric[metric].length },
      { label: "Total Assets", value: data.assets.length },
      { label: "Assigned", value: data.assets.filter((row) => row.status === "Assigned").length },
      { label: "Warranty Alerts", value: data.assets.filter((row) => {
        if (!row.warranty_expiry) return false;
        const deltaDays = (new Date(String(row.warranty_expiry)).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return deltaDays >= 0 && deltaDays <= 30;
      }).length },
    ],
    employees: [
      { label: "Employees", value: data.employees.length },
      { label: "Active", value: data.employees.filter((row) => String(row.status || "Active").toLowerCase() === "active").length },
      { label: "Departments", value: new Set(data.employees.map((row) => row.department || "Unassigned")).size },
      { label: "Tickets", value: data.tickets.length },
    ],
    "open-tickets": [
      { label: "Open Tickets", value: rowsByMetric[metric].length },
      { label: "Critical", value: data.tickets.filter((row) => String(row.priority || "").toLowerCase() === "critical").length },
      { label: "Resolved", value: data.tickets.filter((row) => ["resolved", "closed"].includes(String(row.status || "").toLowerCase())).length },
      { label: "Total Tickets", value: data.tickets.length },
    ],
    "resolved-tickets": [
      { label: "Resolved Tickets", value: rowsByMetric[metric].length },
      { label: "Open", value: data.tickets.filter((row) => String(row.status || "").toLowerCase() === "open").length },
      { label: "Critical", value: data.tickets.filter((row) => String(row.priority || "").toLowerCase() === "critical").length },
      { label: "Total Tickets", value: data.tickets.length },
    ],
    "critical-issues": [
      { label: "Critical Issues", value: rowsByMetric[metric].length },
      { label: "Open Tickets", value: data.tickets.filter((row) => String(row.status || "").toLowerCase() === "open").length },
      { label: "Resolved Tickets", value: data.tickets.filter((row) => ["resolved", "closed"].includes(String(row.status || "").toLowerCase())).length },
      { label: "Total Tickets", value: data.tickets.length },
    ],
    "maintenance-due": [
      { label: "Maintenance Due", value: rowsByMetric[metric].length },
      { label: "Scheduled", value: data.maintenance.length },
      { label: "Completed", value: data.maintenance.filter((row) => String(row.status || "").toLowerCase() === "completed").length },
      { label: "Spend", value: `$${data.maintenance.reduce((sum, row) => sum + Number(row.maintenance_cost || 0), 0).toLocaleString()}` },
    ],
    "warranty-expiring": [
      { label: "Expiring", value: rowsByMetric[metric].length },
      { label: "Total Assets", value: data.assets.length },
      { label: "Assigned", value: data.assets.filter((row) => row.status === "Assigned").length },
      { label: "Maintenance", value: data.maintenance.length },
    ],
  };

  const rows = rowsByMetric[metric];

  return {
    rows,
    tableColumns: rowColumnsByMetric[metric],
    summary: summary[metric],
    lineData: toMonthSeries(rows),
    barData: toCountSeries(rows, metric === "employees" ? "department" : "category"),
    pieData: toCountSeries(rows, metric === "employees" ? "status" : "status"),
    doughnutData: toCountSeries(rows, metric === "maintenance-due" ? "department" : "detail"),
    recentActivity: toRecentActivity(data),
  };
}

export const filterAnalyticsRows = (
  rows: AnalyticsTableRow[],
  filters: { search: string; department: string; category: string; status: string; startDate: string; endDate: string }
) => {
  const search = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    const matchesSearch = !search || [row.name, row.category, row.department, row.status, row.detail, row.value].some((value) => String(value || "").toLowerCase().includes(search));
    const matchesDepartment = filters.department === "all" || row.department === filters.department;
    const matchesCategory = filters.category === "all" || row.category === filters.category;
    const matchesStatus = filters.status === "all" || row.status === filters.status;
    const matchesStart = !filters.startDate || !row.date || new Date(String(row.date)).getTime() >= new Date(filters.startDate).getTime();
    const matchesEnd = !filters.endDate || !row.date || new Date(String(row.date)).getTime() <= new Date(filters.endDate).getTime();
    return matchesSearch && matchesDepartment && matchesCategory && matchesStatus && matchesStart && matchesEnd;
  });
};

export const exportAnalyticsToExcel = (rows: Array<Record<string, unknown>>, fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, fileName.replace(/\.[^.]+$/, ""));
  XLSX.writeFile(workbook, fileName);
};

export const exportAnalyticsToCsv = (rows: Array<Record<string, unknown>>, fileName: string) => {
  const keys = Object.keys(rows[0] || {});
  const csv = [keys, ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`))]
    .map((row) => row.join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const exportAnalyticsToPdf = (title: string, rows: Array<Record<string, unknown>>, fileName: string) => {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  const keys = Object.keys(rows[0] || {});
  doc.text(keys.join(" | "), 14, 26);
  rows.slice(0, 40).forEach((row, index) => {
    const y = 34 + index * 7;
    doc.text(keys.map((key) => String(row[key] ?? "")).join(" | "), 14, y);
  });
  doc.save(fileName);
};
