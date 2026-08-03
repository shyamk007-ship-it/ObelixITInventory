"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import OfficeAssetModuleNav from "../../../components/office/OfficeAssetModuleNav";
import { supabase } from "../../../lib/supabase";
import { createAuditLog, createNotificationIfNotExists, buildAuditDescription } from "../../../lib/audit";
import { getUserProfile } from "../../../lib/rbac";

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
  created_at?: string | null;
  updated_at?: string | null;
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

interface ActivityRow {
  id: number;
  action?: string | null;
  description?: string | null;
  created_at?: string | null;
}

interface AssetRow {
  id: number;
  asset_name?: string | null;
  asset_tag?: string | null;
  category?: string | null;
  status?: string | null;
}

interface EmployeeDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

const tabs = ["overview", "assets", "tickets", "activity", "documents"] as const;
const localDocKey = (employeeId: number) => `office-employee-documents-${employeeId}`;
const localMetaKey = (employeeId: number) => `office-employee-meta-${employeeId}`;

function normalize(value?: string | null) {
  return String(value || "").trim();
}

function splitFullName(fullName?: string | null) {
  const parts = normalize(fullName).split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function employeeCode(id: number) {
  return `EMP-${String(id).padStart(5, "0")}`;
}

function loadStoredDocuments(employeeId: number): EmployeeDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(localDocKey(employeeId));
    return raw ? (JSON.parse(raw) as EmployeeDocument[]) : [];
  } catch {
    return [];
  }
}

function saveStoredDocuments(employeeId: number, documents: EmployeeDocument[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localDocKey(employeeId), JSON.stringify(documents));
}

function loadStoredMeta(employeeId: number): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(localMetaKey(employeeId));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveStoredMeta(employeeId: number, meta: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localMetaKey(employeeId), JSON.stringify(meta));
}

function officeLabel(employee: EmployeeRow) {
  return [employee.office_branch || employee.office_location, employee.floor ? `F${employee.floor}` : null, employee.desk_number ? `Desk ${employee.desk_number}` : null]
    .filter(Boolean)
    .join(" • ") || "Unassigned";
}

function displayStatus(employee: EmployeeRow) {
  return employee.status || (employee.is_active === false ? "Inactive" : "Active");
}

function isActiveStatus(employee: EmployeeRow) {
  const status = displayStatus(employee).toLowerCase();
  return status === "active" || status === "on leave";
}

export default function EmployeeDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const employeeId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);
  const [allAssets, setAllAssets] = useState<AssetRow[]>([]);
  const [selectedTab, setSelectedTab] = useState<(typeof tabs)[number]>("overview");
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [documentType, setDocumentType] = useState("Other Document");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [assignAssetId, setAssignAssetId] = useState("");
  const [returnAssetId, setReturnAssetId] = useState("");
  const [savingAction, setSavingAction] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const loadData = async () => {
    if (!Number.isFinite(employeeId)) {
      router.replace("/office/employees");
      return;
    }

    setLoading(true);
    const [employeeResponse, assignmentResponse, ticketResponse, activityResponse, assetResponse] = await Promise.all([
      supabase.from("employees").select("*").eq("id", employeeId).maybeSingle(),
      supabase
        .from("assignment_records")
        .select("id, employee_id, asset_id, status, assigned_date, actual_return_date, notes, assets(id, asset_name, asset_tag, category, status)")
        .eq("employee_id", employeeId)
        .order("assigned_date", { ascending: false }),
      supabase.from("tickets").select("id, employee_id, title, category, priority, status, created_at").eq("employee_id", employeeId).order("created_at", { ascending: false }),
      supabase.from("activity_logs").select("id, action, description, created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("assets").select("id, asset_name, asset_tag, category, status").is("vessel_id", null).order("asset_name", { ascending: true }),
    ]);

    if (employeeResponse.error || !employeeResponse.data) {
      setEmployee(null);
      setLoading(false);
      return;
    }

    const loadedEmployee = employeeResponse.data as EmployeeRow;
    setEmployee(loadedEmployee);
    setAssignments((assignmentResponse.data as AssignmentRow[]) || []);
    setTickets((ticketResponse.data as TicketRow[]) || []);
    setActivityRows((activityResponse.data as ActivityRow[]) || []);
    setAllAssets((assetResponse.data as AssetRow[]) || []);
    setDocuments(loadStoredDocuments(loadedEmployee.id));
    const storedMeta = loadStoredMeta(loadedEmployee.id);
    setAssignAssetId(storedMeta.lastAssignAssetId || "");
    setReturnAssetId(storedMeta.lastReturnAssetId || "");
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [employeeId]);

  const activeAssignments = useMemo(() => assignments.filter((row) => (row.status || "").toLowerCase() === "assigned"), [assignments]);
  const assignedAssets = useMemo(() => activeAssignments.map((row) => row.assets).filter(Boolean) as NonNullable<AssignmentRow["assets"]>[], [activeAssignments]);
  const openTickets = useMemo(() => tickets.filter((ticket) => (ticket.status || "").toLowerCase() === "open").length, [tickets]);
  const closedTickets = useMemo(() => tickets.filter((ticket) => (ticket.status || "").toLowerCase() === "closed").length, [tickets]);
  const pendingTickets = useMemo(() => tickets.filter((ticket) => (ticket.status || "").toLowerCase() === "pending").length, [tickets]);

  const currentAssetIds = useMemo(() => new Set(activeAssignments.map((assignment) => assignment.asset_id).filter((value): value is number => typeof value === "number")), [activeAssignments]);
  const availableAssets = useMemo(() => allAssets.filter((asset) => !currentAssetIds.has(asset.id) && (asset.status || "").toLowerCase() !== "assigned"), [allAssets, currentAssetIds]);

  const selectedAsset = useMemo(() => activeAssignments.find((assignment) => assignment.asset_id === selectedAssetId) || null, [activeAssignments, selectedAssetId]);
  const selectedAssetHistory = useMemo(() => assignments.filter((row) => row.asset_id === selectedAssetId), [assignments, selectedAssetId]);
  const employeeMeta = useMemo(() => {
    if (!employee) return {} as Record<string, string>;
    return loadStoredMeta(employee.id);
  }, [employee]);

  const updateStatus = async (targetStatus: string) => {
    if (!employee) return;
    const isActive = targetStatus === "Active" || targetStatus === "On Leave";
    const payloads = [
      { status: targetStatus },
      { is_active: isActive },
    ];
    for (const payload of payloads) {
      await supabase.from("employees").update(payload).eq("id", employee.id);
    }
    const profile = await getUserProfile();
    await createAuditLog({
      action: targetStatus === "Active" ? "Employee Reactivated" : "Employee Deactivated",
      description: buildAuditDescription({
        event: targetStatus === "Active" ? "Employee Reactivated" : "Employee Deactivated",
        userName: profile?.full_name || "Unknown User",
        recordType: "employee",
        recordId: employee.id,
        itemName: employee.full_name || employeeCode(employee.id),
      }),
    });
    await createNotificationIfNotExists({
      title: targetStatus === "Active" ? "Employee Reactivated" : "Employee Deactivated",
      message: `${employee.full_name || employeeCode(employee.id)} was ${targetStatus === "Active" ? "reactivated" : "deactivated"}.`,
      action: targetStatus === "Active" ? "Employee Reactivated" : "Employee Deactivated",
      createdBy: profile?.full_name || undefined,
      recordType: "employee",
      recordId: employee.id,
    });
    showToast(targetStatus === "Active" ? "Employee reactivated." : "Employee deactivated.");
    await loadData();
  };

  const resetPassword = async () => {
    if (!employee) return;
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

  const deleteEmployee = async () => {
    if (!employee) return;
    if (activeAssignments.length > 0) {
      showToast("Cannot delete employee with assigned assets.");
      return;
    }
    if (!window.confirm(`Delete ${employee.full_name || employeeCode(employee.id)}?`)) return;
    const response = await supabase.from("employees").delete().eq("id", employee.id);
    if (response.error) {
      showToast(response.error.message);
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
      message: `${employee.full_name || employeeCode(employee.id)} was deleted.`,
      action: "Employee Deleted",
      createdBy: profile?.full_name || undefined,
      recordType: "employee",
      recordId: employee.id,
    });
    showToast("Employee deleted.");
    router.push("/office/employees");
  };

  const assignAsset = async () => {
    if (!employee || !assignAssetId) return;
    const asset = allAssets.find((row) => row.id === Number(assignAssetId));
    if (!asset || currentAssetIds.has(asset.id) || (asset.status || "").toLowerCase() === "assigned") {
      showToast("Selected asset is already assigned.");
      return;
    }

    setSavingAction(true);
    const assignmentDate = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.from("assignment_records").insert([
      {
        asset_id: asset.id,
        employee_id: employee.id,
        status: "Assigned",
        assigned_date: assignmentDate,
      },
    ]).select("id").single();

    if (error) {
      showToast(error.message);
      setSavingAction(false);
      return;
    }

    await supabase.from("assets").update({ status: "Assigned", currently_assigned_to: employee.id }).eq("id", asset.id);
    const profile = await getUserProfile();
    await createAuditLog({
      action: "Asset Assigned",
      description: buildAuditDescription({
        event: "Asset Assigned",
        userName: profile?.full_name || "Unknown User",
        recordType: "employee",
        recordId: employee.id,
        itemName: `${employee.full_name || employeeCode(employee.id)} -> ${asset.asset_name || asset.asset_tag}`,
      }),
    });
    await createNotificationIfNotExists({
      title: "Asset Assigned",
      message: `${asset.asset_name || asset.asset_tag} assigned to ${employee.full_name || employeeCode(employee.id)}.`,
      action: "Asset Assigned",
      createdBy: profile?.full_name || undefined,
      recordType: "assignment",
      recordId: data?.id,
    });

    const meta = { ...employeeMeta, lastAssignAssetId: assignAssetId };
    saveStoredMeta(employee.id, meta);
    showToast("Asset assigned.");
    setAssignAssetId("");
    await loadData();
    setSavingAction(false);
  };

  const returnAsset = async () => {
    if (!employee || !returnAssetId) return;
    const assignment = activeAssignments.find((row) => String(row.asset_id) === returnAssetId);
    if (!assignment || !assignment.asset_id) {
      showToast("No active assignment found for selected asset.");
      return;
    }

    setSavingAction(true);
    const returnDate = new Date().toISOString().slice(0, 10);
    await supabase.from("assignment_records").update({ status: "Returned", actual_return_date: returnDate }).eq("id", assignment.id);
    await supabase.from("assets").update({ status: "Available", currently_assigned_to: null }).eq("id", assignment.asset_id);

    const profile = await getUserProfile();
    await createAuditLog({
      action: "Asset Returned",
      description: buildAuditDescription({
        event: "Asset Returned",
        userName: profile?.full_name || "Unknown User",
        recordType: "employee",
        recordId: employee.id,
        itemName: `${employee.full_name || employeeCode(employee.id)} -> ${assignment.assets?.asset_name || assignment.assets?.asset_tag}`,
      }),
    });
    await createNotificationIfNotExists({
      title: "Asset Returned",
      message: `${assignment.assets?.asset_name || assignment.assets?.asset_tag} returned by ${employee.full_name || employeeCode(employee.id)}.`,
      action: "Asset Returned",
      createdBy: profile?.full_name || undefined,
      recordType: "assignment",
      recordId: assignment.id,
    });

    const meta = { ...employeeMeta, lastReturnAssetId: returnAssetId };
    saveStoredMeta(employee.id, meta);
    showToast("Asset returned.");
    setReturnAssetId("");
    await loadData();
    setSavingAction(false);
  };

  const saveDocument = async () => {
    if (!employee || !documentFile) return;
    const nextDoc: EmployeeDocument = {
      id: `${Date.now()}-${documentFile.name}`,
      name: documentFile.name,
      type: documentType,
      size: documentFile.size,
      uploadedAt: new Date().toISOString(),
    };
    const nextDocuments = [nextDoc, ...documents];
    setDocuments(nextDocuments);
    saveStoredDocuments(employee.id, nextDocuments);
    setDocumentFile(null);
    showToast("Document saved to workspace profile.");
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <OfficeAssetModuleNav />
        <section style={styles.loadingCard}>Loading employee profile...</section>
      </div>
    );
  }

  if (!employee) {
    return (
      <div style={styles.page}>
        <OfficeAssetModuleNav />
        <section style={styles.emptyCard}>
          <h2 style={styles.notFoundTitle}>Employee not found</h2>
          <p style={styles.subtitle}>The requested office employee profile could not be loaded.</p>
          <Link href="/office/employees" style={styles.primaryButton}>Back to Employees</Link>
        </section>
      </div>
    );
  }

  const employeeName = normalize(employee.full_name) || `${normalize(employee.first_name)} ${normalize(employee.last_name)}`.trim() || "Untitled Employee";
  const employeeProfileUrl = employee.profile_photo_url || employeeMeta.profile_photo_url || "";

  const timeline = activityRows.filter((row) => {
    const text = `${row.action || ""} ${row.description || ""} ${employeeName}`.toLowerCase();
    return text.includes(employeeName.toLowerCase()) || (row.description || "").toLowerCase().includes("employee") || (row.action || "").toLowerCase().includes("employee");
  });

  return (
    <div style={styles.page}>
      <OfficeAssetModuleNav />

      <section style={styles.profileHero}>
        <div style={styles.profileIdentity}>
          {employeeProfileUrl ? <img src={employeeProfileUrl} alt={employeeName} style={styles.profilePhoto} /> : <div style={styles.profileAvatar}>{employeeName.charAt(0)}</div>}
          <div style={styles.identityText}>
            <p style={styles.eyebrow}>Employee Profile</p>
            <h2 style={styles.title}>{employeeName}</h2>
            <p style={styles.subtitle}>{employeeCode(employee.id)} • {employee.department || "Unassigned"} • {officeLabel(employee)}</p>
            <div style={styles.pills}>
              <span style={{ ...styles.statusBadge, ...(isActiveStatus(employee) ? styles.statusActive : styles.statusInactive) }}>{displayStatus(employee)}</span>
              <span style={styles.infoPill}>{employee.employment_type || "Permanent"}</span>
              <span style={styles.infoPill}>{employee.designation || employee.position || "Employee"}</span>
            </div>
          </div>
        </div>
        <div style={styles.profileActions}>
          <button style={styles.secondaryButton} onClick={() => setSelectedTab("overview")}>Overview</button>
          <button style={styles.secondaryButton} onClick={() => setSelectedTab("assets")}>Assign Asset</button>
          <button style={styles.secondaryButton} onClick={() => setSelectedTab("documents")}>Documents</button>
          <button style={styles.secondaryButton} onClick={resetPassword}>Reset Password</button>
          <button style={styles.secondaryButton} onClick={() => void updateStatus(isActiveStatus(employee) ? "Suspended" : "Active")}>{isActiveStatus(employee) ? "Deactivate" : "Reactivate"}</button>
          <button style={styles.actionDangerButton} onClick={deleteEmployee}>Delete</button>
        </div>
      </section>

      <section style={styles.dashboardGrid}>
        <MiniMetric label="Assigned Assets" value={activeAssignments.length} />
        <MiniMetric label="Open Tickets" value={openTickets} />
        <MiniMetric label="Closed Tickets" value={closedTickets} />
        <MiniMetric label="Pending Tickets" value={pendingTickets} />
        <MiniMetric label="Documents" value={documents.length} />
        <MiniMetric label="Employee Since" value={employee.joining_date ? new Date(employee.joining_date).getFullYear() : new Date(employee.created_at || Date.now()).getFullYear()} />
      </section>

      <section style={styles.tabsBar}>
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setSelectedTab(tab)} style={{ ...styles.tabButton, ...(selectedTab === tab ? styles.tabButtonActive : {}) }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </section>

      {selectedTab === "overview" && (
        <section style={styles.contentGrid}>
          <article style={styles.card}>
            <h3 style={styles.cardTitle}>Personal Information</h3>
            <div style={styles.detailGrid}>
              <Detail label="Employee ID" value={employeeCode(employee.id)} />
              <Detail label="First Name" value={splitFullName(employeeName).first || employee.first_name || "-"} />
              <Detail label="Last Name" value={splitFullName(employeeName).last || employee.last_name || "-"} />
              <Detail label="Gender" value={employee.gender || "-"} />
              <Detail label="Date of Birth" value={employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : "-"} />
              <Detail label="Email" value={employee.email || "-"} />
              <Detail label="Mobile Number" value={employee.phone_number || "-"} />
            </div>
          </article>
          <article style={styles.card}>
            <h3 style={styles.cardTitle}>Employment Information</h3>
            <div style={styles.detailGrid}>
              <Detail label="Department" value={employee.department || "-"} />
              <Detail label="Designation" value={employee.designation || employee.position || "-"} />
              <Detail label="Manager" value={employee.manager || "-"} />
              <Detail label="Employment Type" value={employee.employment_type || "-"} />
              <Detail label="Joining Date" value={employee.joining_date ? new Date(employee.joining_date).toLocaleDateString() : "-"} />
              <Detail label="Status" value={displayStatus(employee)} />
            </div>
          </article>
          <article style={styles.card}>
            <h3 style={styles.cardTitle}>Office Information</h3>
            <div style={styles.detailGrid}>
              <Detail label="Office Branch" value={employee.office_branch || employee.office_location || "-"} />
              <Detail label="Floor" value={employee.floor || "-"} />
              <Detail label="Cabin / Desk Number" value={employee.desk_number || "-"} />
              <Detail label="Extension Number" value={employee.extension_number || "-"} />
            </div>
          </article>
          <article style={styles.card}>
            <h3 style={styles.cardTitle}>Support Summary</h3>
            <div style={styles.detailGrid}>
              <Detail label="Open Tickets" value={openTickets} />
              <Detail label="Closed Tickets" value={closedTickets} />
              <Detail label="Pending Tickets" value={pendingTickets} />
              <Detail label="Activity Events" value={timeline.length} />
            </div>
          </article>
        </section>
      )}

      {selectedTab === "assets" && (
        <section style={styles.contentGrid}>
          <article style={styles.card}>
            <h3 style={styles.cardTitle}>Assigned Assets</h3>
            <div style={styles.assetChips}>
              {assignedAssets.length === 0 ? <p style={styles.emptyText}>No active assets assigned.</p> : assignedAssets.map((asset) => (
                <button key={asset.id || asset.asset_tag} style={styles.assetChip} onClick={() => setSelectedAssetId(asset.id || null)}>
                  <strong>{asset.asset_name || asset.asset_tag}</strong>
                  <span>{asset.category || "Asset"}</span>
                </button>
              ))}
            </div>
          </article>

          <article style={styles.card}>
            <h3 style={styles.cardTitle}>Assign Asset</h3>
            <div style={styles.inlineForm}>
              <select value={assignAssetId} onChange={(event) => setAssignAssetId(event.target.value)} style={styles.input}>
                <option value="">Select available asset</option>
                {availableAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>{asset.asset_name || asset.asset_tag}</option>
                ))}
              </select>
              <button style={styles.primaryButton} disabled={savingAction} onClick={() => void assignAsset()}>{savingAction ? "Saving..." : "Assign Asset"}</button>
            </div>
          </article>

          <article style={styles.card}>
            <h3 style={styles.cardTitle}>Return Asset</h3>
            <div style={styles.inlineForm}>
              <select value={returnAssetId} onChange={(event) => setReturnAssetId(event.target.value)} style={styles.input}>
                <option value="">Select assigned asset</option>
                {activeAssignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.asset_id || ""}>{assignment.assets?.asset_name || assignment.assets?.asset_tag}</option>
                ))}
              </select>
              <button style={styles.secondaryButton} disabled={savingAction} onClick={() => void returnAsset()}>{savingAction ? "Saving..." : "Return Asset"}</button>
            </div>
          </article>

          <article style={styles.card}>
            <h3 style={styles.cardTitle}>Asset History</h3>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Asset</th>
                    <th style={styles.th}>Assigned Date</th>
                    <th style={styles.th}>Returned Date</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Assigned By</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr><td colSpan={5} style={styles.empty}>No asset history found.</td></tr>
                  ) : assignments.map((row) => (
                    <tr key={row.id}>
                      <td style={styles.td}>
                        <button style={styles.linkButton} onClick={() => setSelectedAssetId(row.asset_id || null)}>
                          {row.assets?.asset_name || row.assets?.asset_tag || "Asset"}
                        </button>
                      </td>
                      <td style={styles.td}>{row.assigned_date ? new Date(row.assigned_date).toLocaleDateString() : "-"}</td>
                      <td style={styles.td}>{row.actual_return_date ? new Date(row.actual_return_date).toLocaleDateString() : "-"}</td>
                      <td style={styles.td}>{row.status || "-"}</td>
                      <td style={styles.td}>Office Admin</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {selectedTab === "tickets" && (
        <section style={styles.contentGrid}>
          <article style={styles.card}>
            <h3 style={styles.cardTitle}>Support Tickets</h3>
            <div style={styles.ticketGrid}>
              {tickets.length === 0 ? <p style={styles.emptyText}>No tickets recorded.</p> : tickets.map((ticket) => (
                <div key={ticket.id} style={styles.ticketCard}>
                  <strong>{ticket.title || `Ticket #${ticket.id}`}</strong>
                  <span>{ticket.category || "General"}</span>
                  <span>{ticket.priority || "Normal"}</span>
                  <span>{ticket.status || "Open"}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {selectedTab === "activity" && (
        <section style={styles.contentGrid}>
          <article style={styles.card}>
            <h3 style={styles.cardTitle}>Activity Timeline</h3>
            <div style={styles.timeline}>
              {timeline.length === 0 ? <p style={styles.emptyText}>No timeline activity found.</p> : timeline.map((entry) => (
                <div key={entry.id} style={styles.timelineItem}>
                  <strong>{entry.action || "Activity"}</strong>
                  <p>{entry.description || "Employee event"}</p>
                  <span>{entry.created_at ? new Date(entry.created_at).toLocaleString() : ""}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {selectedTab === "documents" && (
        <section style={styles.contentGrid}>
          <article style={styles.card}>
            <h3 style={styles.cardTitle}>Documents</h3>
            <div style={styles.inlineForm}>
              <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} style={styles.input}>
                <option value="Offer Letter">Offer Letter</option>
                <option value="ID Card">ID Card</option>
                <option value="Passport">Passport</option>
                <option value="Driving License">Driving License</option>
                <option value="Other Document">Other Document</option>
              </select>
              <label style={styles.fileField}>
                Upload File
                <input type="file" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} style={styles.fileInput} />
              </label>
              <button style={styles.primaryButton} onClick={() => void saveDocument()} disabled={!documentFile}>Save Document</button>
            </div>
            <div style={styles.documentList}>
              {documents.length === 0 ? <p style={styles.emptyText}>No documents uploaded in this workspace profile yet.</p> : documents.map((doc) => (
                <div key={doc.id} style={styles.documentRow}>
                  <strong>{doc.name}</strong>
                  <span>{doc.type}</span>
                  <span>{Math.round(doc.size / 1024)} KB</span>
                  <span>{new Date(doc.uploadedAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {selectedAsset && selectedTab === "assets" && (
        <div style={styles.assetDrawer}>
          <div style={styles.assetDrawerCard}>
            <div style={styles.drawerHeader}>
              <div>
                <p style={styles.eyebrow}>Asset Detail</p>
                <h3 style={styles.modalTitle}>{selectedAsset.assets?.asset_name || selectedAsset.assets?.asset_tag}</h3>
              </div>
              <button style={styles.closeButton} onClick={() => setSelectedAssetId(null)}>×</button>
            </div>
            <div style={styles.detailGrid}>
              <Detail label="Asset Tag" value={selectedAsset.assets?.asset_tag || "-"} />
              <Detail label="Category" value={selectedAsset.assets?.category || "-"} />
              <Detail label="Status" value={selectedAsset.assets?.status || "-"} />
              <Detail label="Assigned Date" value={selectedAsset.assigned_date ? new Date(selectedAsset.assigned_date).toLocaleDateString() : "-"} />
              <Detail label="Returned Date" value={selectedAsset.actual_return_date ? new Date(selectedAsset.actual_return_date).toLocaleDateString() : "-"} />
              <Detail label="Notes" value={selectedAsset.notes || "-"} />
            </div>
            <h4 style={styles.sectionTitle}>Asset History</h4>
            <div style={styles.historyList}>
              {selectedAssetHistory.length === 0 ? <p style={styles.emptyText}>No additional history.</p> : selectedAssetHistory.map((row) => (
                <div key={row.id} style={styles.historyRow}>
                  <span>{row.assigned_date ? new Date(row.assigned_date).toLocaleDateString() : "-"}</span>
                  <strong>{row.status || "Assigned"}</strong>
                  <span>{row.actual_return_date ? new Date(row.actual_return_date).toLocaleDateString() : "-"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <article style={styles.metricCard}>
      <p style={styles.metricLabel}>{label}</p>
      <strong style={styles.metricValue}>{value}</strong>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.detailCard}>
      <span style={styles.detailLabel}>{label}</span>
      <strong style={styles.detailValue}>{value}</strong>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 16 },
  loadingCard: { padding: 24, borderRadius: 22, background: "rgba(255,255,255,0.94)", border: "1px solid rgba(191, 219, 254, 0.9)" },
  emptyCard: { padding: 24, borderRadius: 22, background: "rgba(255,255,255,0.94)", border: "1px solid rgba(191, 219, 254, 0.9)", display: "grid", gap: 12 },
  notFoundTitle: { margin: 0, color: "#0f172a", fontSize: 24, fontWeight: 900 },
  profileHero: { display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: 22, borderRadius: 24, background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.96) 100%)", border: "1px solid rgba(191, 219, 254, 0.9)", boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)" },
  profileIdentity: { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" },
  profilePhoto: { width: 92, height: 92, borderRadius: "50%", objectFit: "cover", border: "4px solid rgba(37, 99, 235, 0.18)" },
  profileAvatar: { width: 92, height: 92, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg, #2563eb 0%, #0f766e 100%)", color: "white", fontSize: 34, fontWeight: 900 },
  identityText: { display: "grid", gap: 8 },
  eyebrow: { margin: 0, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 11, fontWeight: 800 },
  title: { margin: 0, color: "#0f172a", fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em" },
  subtitle: { margin: 0, color: "#64748b", lineHeight: 1.65 },
  pills: { display: "flex", flexWrap: "wrap", gap: 8 },
  infoPill: { padding: "6px 10px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 800 },
  statusBadge: { display: "inline-flex", padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800 },
  statusActive: { background: "#dcfce7", color: "#166534" },
  statusInactive: { background: "#e2e8f0", color: "#334155" },
  profileActions: { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start", justifyContent: "flex-end" },
  primaryButton: { border: "none", borderRadius: 14, background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "white", padding: "12px 16px", fontWeight: 800, cursor: "pointer", textDecoration: "none" },
  secondaryButton: { border: "1px solid rgba(191, 219, 254, 0.95)", borderRadius: 14, background: "rgba(255,255,255,0.94)", color: "#0f172a", padding: "12px 16px", fontWeight: 800, cursor: "pointer", textDecoration: "none" },
  actionDangerButton: { border: "1px solid #fecaca", borderRadius: 14, background: "#fff1f2", color: "#be123c", padding: "12px 16px", fontWeight: 800, cursor: "pointer" },
  dashboardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 },
  metricCard: { padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.96)", border: "1px solid rgba(191, 219, 254, 0.9)", boxShadow: "0 10px 22px rgba(15,23,42,0.05)" },
  metricLabel: { margin: 0, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 11, fontWeight: 800 },
  metricValue: { display: "block", marginTop: 8, color: "#0f172a", fontSize: 24, fontWeight: 900 },
  tabsBar: { display: "flex", flexWrap: "wrap", gap: 8 },
  tabButton: { border: "1px solid rgba(191, 219, 254, 0.95)", borderRadius: 999, background: "rgba(255,255,255,0.94)", color: "#0f172a", padding: "10px 14px", fontWeight: 800, cursor: "pointer" },
  tabButtonActive: { background: "#2563eb", color: "white", borderColor: "#2563eb" },
  contentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 },
  card: { background: "rgba(255,255,255,0.94)", borderRadius: 22, border: "1px solid rgba(191, 219, 254, 0.9)", padding: 18, boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)" },
  cardTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 900 },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 14 },
  detailCard: { padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", display: "grid", gap: 6 },
  detailLabel: { color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 },
  detailValue: { color: "#0f172a", fontSize: 14 },
  emptyText: { margin: 0, color: "#64748b" },
  assetChips: { display: "grid", gap: 10, marginTop: 12 },
  assetChip: { display: "grid", gap: 4, textAlign: "left", border: "1px solid rgba(191, 219, 254, 0.95)", borderRadius: 16, background: "#eff6ff", color: "#0f172a", padding: 14, cursor: "pointer" },
  inlineForm: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "end" },
  input: { width: "100%", padding: 13, borderRadius: 14, border: "1px solid #cbd5e1", background: "white", fontSize: 14 },
  fileField: { display: "grid", gap: 8, color: "#334155", fontWeight: 700, fontSize: 13 },
  fileInput: { width: "100%", padding: 10, borderRadius: 12, border: "1px solid #cbd5e1", background: "white" },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 16 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
  th: { textAlign: "left", padding: 12, background: "#f8fafc", color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" },
  td: { padding: 12, borderTop: "1px solid #e2e8f0", color: "#0f172a", verticalAlign: "top" },
  linkButton: { border: "none", background: "transparent", color: "#1d4ed8", fontWeight: 800, cursor: "pointer", padding: 0, textAlign: "left" },
  ticketGrid: { display: "grid", gap: 10, marginTop: 12 },
  ticketCard: { display: "grid", gap: 4, padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" },
  timeline: { display: "grid", gap: 10, marginTop: 12 },
  timelineItem: { padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0", display: "grid", gap: 6 },
  documentList: { display: "grid", gap: 10, marginTop: 12 },
  documentRow: { display: "grid", gap: 4, padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" },
  assetDrawer: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", display: "grid", placeItems: "center", padding: 20, zIndex: 1000 },
  assetDrawerCard: { width: "100%", maxWidth: 860, maxHeight: "92vh", overflowY: "auto", background: "white", borderRadius: 28, boxShadow: "0 40px 100px rgba(15,23,42,0.22)", padding: 24 },
  drawerHeader: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 16 },
  modalTitle: { margin: "8px 0 0", color: "#0f172a", fontSize: 24, fontWeight: 900 },
  closeButton: { width: 42, height: 42, borderRadius: "50%", border: "none", background: "#e2e8f0", color: "#0f172a", fontSize: 24, cursor: "pointer" },
  historyList: { display: "grid", gap: 8, marginTop: 12 },
  historyRow: { display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" },
  sectionTitle: { margin: "20px 0 0", color: "#0f172a", fontSize: 18, fontWeight: 900 },
  loadingCard: { padding: 24, borderRadius: 22, background: "rgba(255,255,255,0.94)", border: "1px solid rgba(191, 219, 254, 0.9)" },
  toast: { position: "fixed", right: 18, bottom: 18, background: "#0f172a", color: "white", borderRadius: 14, padding: "12px 14px", fontWeight: 800, boxShadow: "0 20px 45px rgba(15,23,42,0.18)" },
  statusBadge: { display: "inline-flex", padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800 },
  statusActive: { background: "#dcfce7", color: "#166534" },
  statusInactive: { background: "#e2e8f0", color: "#334155" },
};
