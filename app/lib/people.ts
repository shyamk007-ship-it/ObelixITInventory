import { supabase } from "./supabase";

export type PeopleRole = "super_admin" | "admin" | "hr" | "manager" | "employee" | "viewer";

export interface EmployeeLite {
  id: number;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  department?: string | null;
  designation?: string | null;
  manager?: string | null;
  status?: string | null;
  joining_date?: string | null;
  date_of_birth?: string | null;
  created_at?: string | null;
}

export interface DepartmentRow {
  id: number;
  name: string;
  manager_employee_id?: number | null;
  location?: string | null;
  budget?: number | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface VisitorRow {
  id: number;
  visitor_name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  host_employee_id?: number | null;
  host_department?: string | null;
  purpose?: string | null;
  vehicle_number?: string | null;
  photo_url?: string | null;
  id_proof_url?: string | null;
  badge_number?: string | null;
  visit_time?: string | null;
  expected_exit_time?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  status?: string | null;
  is_blocked?: boolean | null;
  created_at?: string | null;
  employees?: { full_name?: string | null } | null;
}

export interface AttendanceRow {
  id: number;
  employee_id: number;
  attendance_date: string;
  status: "Present" | "Absent" | "Half Day" | "Leave";
  check_in_time?: string | null;
  check_out_time?: string | null;
  late_by_minutes?: number | null;
  overtime_minutes?: number | null;
  notes?: string | null;
  created_at?: string | null;
  employees?: { full_name?: string | null; department?: string | null } | null;
}

export interface LeaveRow {
  id: number;
  employee_id: number;
  leave_type: "Casual" | "Sick" | "Earned" | "Maternity" | "Paternity" | "Unpaid";
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string | null;
  status: "Pending" | "Approved" | "Rejected";
  approved_by_employee_id?: number | null;
  approved_at?: string | null;
  created_at?: string | null;
  employees?: { full_name?: string | null; department?: string | null } | null;
}

export interface PerformanceRow {
  id: number;
  employee_id: number;
  review_period: string;
  kpi_score?: number | null;
  goals_score?: number | null;
  overall_rating?: number | null;
  comments?: string | null;
  reviewer_employee_id?: number | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  employees?: { full_name?: string | null; department?: string | null } | null;
}

export interface TrainingRow {
  id: number;
  employee_id: number;
  course_name: string;
  provider?: string | null;
  certification_name?: string | null;
  completion_date?: string | null;
  expiry_date?: string | null;
  status?: "Planned" | "In Progress" | "Completed" | "Expired";
  score?: number | null;
  notes?: string | null;
  created_at?: string | null;
  employees?: { full_name?: string | null; department?: string | null } | null;
}

export interface EmployeeDocumentRow {
  id: number;
  employee_id: number;
  document_type:
    | "Passport"
    | "PAN"
    | "Aadhaar"
    | "Offer Letter"
    | "NDA"
    | "Certificate"
    | "Contract"
    | "Other";
  document_name: string;
  document_url?: string | null;
  issued_on?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  created_at?: string | null;
  employees?: { full_name?: string | null; department?: string | null } | null;
}

export const peopleTables = {
  departments: "office_departments",
  visitors: "office_visitors",
  attendance: "office_attendance",
  leave: "office_leave_requests",
  performance: "office_performance_reviews",
  training: "office_training_records",
  documents: "office_employee_documents",
} as const;

const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export async function fetchEmployees() {
  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, email, phone_number, department, designation, manager, status, joining_date, date_of_birth, created_at")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data || []) as EmployeeLite[];
}

export async function fetchDepartments() {
  const { data, error } = await supabase
    .from(peopleTables.departments)
    .select("id, name, manager_employee_id, location, budget, notes, created_at")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as DepartmentRow[];
}

export async function fetchVisitors(rangeDays = 60) {
  const since = new Date();
  since.setDate(since.getDate() - rangeDays);

  const { data, error } = await supabase
    .from(peopleTables.visitors)
    .select("id, visitor_name, company, phone, email, host_employee_id, host_department, purpose, vehicle_number, photo_url, id_proof_url, badge_number, visit_time, expected_exit_time, check_in_time, check_out_time, status, is_blocked, created_at, employees!office_visitors_host_employee_id_fkey(full_name)")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as VisitorRow[];
}

export async function fetchAttendance(month = new Date()) {
  const from = firstDayOfMonth(month);
  const to = new Date(from);
  to.setMonth(to.getMonth() + 1);

  const { data, error } = await supabase
    .from(peopleTables.attendance)
    .select("id, employee_id, attendance_date, status, check_in_time, check_out_time, late_by_minutes, overtime_minutes, notes, created_at, employees!office_attendance_employee_id_fkey(full_name, department)")
    .gte("attendance_date", from.toISOString().slice(0, 10))
    .lt("attendance_date", to.toISOString().slice(0, 10))
    .order("attendance_date", { ascending: false });

  if (error) throw error;
  return (data || []) as AttendanceRow[];
}

export async function fetchLeaves(year = new Date().getFullYear()) {
  const from = `${year}-01-01`;
  const to = `${year + 1}-01-01`;

  const { data, error } = await supabase
    .from(peopleTables.leave)
    .select("id, employee_id, leave_type, start_date, end_date, total_days, reason, status, approved_by_employee_id, approved_at, created_at, employees!office_leave_requests_employee_id_fkey(full_name, department)")
    .gte("start_date", from)
    .lt("start_date", to)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as LeaveRow[];
}

export async function fetchPerformance() {
  const { data, error } = await supabase
    .from(peopleTables.performance)
    .select("id, employee_id, review_period, kpi_score, goals_score, overall_rating, comments, reviewer_employee_id, reviewed_at, created_at, employees!office_performance_reviews_employee_id_fkey(full_name, department)")
    .order("reviewed_at", { ascending: false });

  if (error) throw error;
  return (data || []) as PerformanceRow[];
}

export async function fetchTraining() {
  const { data, error } = await supabase
    .from(peopleTables.training)
    .select("id, employee_id, course_name, provider, certification_name, completion_date, expiry_date, status, score, notes, created_at, employees!office_training_records_employee_id_fkey(full_name, department)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as TrainingRow[];
}

export async function fetchDocuments() {
  const { data, error } = await supabase
    .from(peopleTables.documents)
    .select("id, employee_id, document_type, document_name, document_url, issued_on, expiry_date, notes, created_at, employees!office_employee_documents_employee_id_fkey(full_name, department)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as EmployeeDocumentRow[];
}

export async function fetchPeopleDashboardData() {
  const [employees, departments, visitors, leaves, attendance, performance, training] = await Promise.all([
    fetchEmployees(),
    fetchDepartments(),
    fetchVisitors(45),
    fetchLeaves(),
    fetchAttendance(new Date()),
    fetchPerformance(),
    fetchTraining(),
  ]);

  return {
    employees,
    departments,
    visitors,
    leaves,
    attendance,
    performance,
    training,
  };
}

export const safeErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message || "").trim();
    return message || fallback;
  }
  return fallback;
};
