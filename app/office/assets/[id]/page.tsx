"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { usePathname } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import OfficeAssetModuleNav from "../../../components/office/OfficeAssetModuleNav";
import { createAuditLog, createNotificationIfNotExists, buildAuditDescription } from "../../../lib/audit";
import { getUserProfile } from "../../../lib/rbac";
import { assignOfficeAsset, returnOfficeAsset } from "../../../lib/office-assignments-api";
import { supabase } from "../../../lib/supabase";

type AssetDetail = {
  id: number;
  asset_name: string;
  asset_tag: string;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  status?: string | null;
  purchase_date?: string | null;
  purchase_cost?: number | null;
  warranty_expiry?: string | null;
  currently_assigned_to?: number | null;
  created_at?: string | null;
};

type AssetExtensionRow = {
  asset_id: number;
  vendor?: string | null;
  department?: string | null;
  location?: string | null;
  asset_condition?: string | null;
  remarks?: string | null;
  barcode_value?: string | null;
  invoice_url?: string | null;
  photo_url?: string | null;
};

type EmployeeRow = {
  id: number;
  full_name: string;
  department?: string | null;
};

type AssignmentRow = {
  id: number;
  asset_id: number;
  employee_id: number;
  assigned_date?: string | null;
  expected_return_date?: string | null;
  actual_return_date?: string | null;
  status: string;
  notes?: string | null;
  assigned_by?: string | null;
  employees?: { full_name?: string | null; department?: string | null } | null;
};

type MaintenanceRow = {
  id: number;
  asset_id: number;
  maintenance_date?: string | null;
  warranty_expiry?: string | null;
  vendor?: string | null;
  service_details?: string | null;
  maintenance_cost?: number | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type DisposalRow = {
  id: number;
  asset_id: number;
  disposal_date?: string | null;
  method?: string | null;
  sale_value?: number | null;
  remarks?: string | null;
  disposed_by?: string | null;
};

type TransferRow = {
  id: number;
  asset_id: number;
  from_department?: string | null;
  to_department?: string | null;
  from_employee_id?: number | null;
  to_employee_id?: number | null;
  transferred_at?: string | null;
  transferred_by?: string | null;
  notes?: string | null;
  transfer_type?: string | null;
};

type TimelineRow = {
  kind: string;
  title: string;
  details: string;
  when?: string | null;
};

type AssetDocumentRow = {
  id: number;
  document_type: string;
  document_name: string;
  document_url: string;
  uploaded_at?: string | null;
};

type AssetPhotoRow = {
  id: number;
  photo_name: string;
  photo_url: string;
  uploaded_at?: string | null;
};

const statusOptions = ["Available", "Assigned", "In Maintenance", "Under Repair", "Retired"];
const lifecycleEventTypes = ["Created", "Assigned", "Transferred", "Maintenance", "Returned", "Disposed"];

export default function OfficeAssetDetailPage() {
  const pathname = usePathname();
  const assetId = Number(pathname.split("/").filter(Boolean).pop());
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [extension, setExtension] = useState<AssetExtensionRow | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRow[]>([]);
  const [disposals, setDisposals] = useState<DisposalRow[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [documents, setDocuments] = useState<AssetDocumentRow[]>([]);
  const [photos, setPhotos] = useState<AssetPhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [statusForm, setStatusForm] = useState({ status: "Available", remarks: "" });
  const [assignmentForm, setAssignmentForm] = useState({ employee_id: "", expected_return_date: "", notes: "" });
  const [maintenanceForm, setMaintenanceForm] = useState({ maintenance_date: new Date().toISOString().slice(0, 10), vendor: "", service_details: "", maintenance_cost: "", warranty_expiry: "", notes: "" });
  const [eventForm, setEventForm] = useState({ event_type: "Created", event_title: "", location: "", remarks: "" });

  const showMessage = (value: string) => {
    setMessage(value);
    window.setTimeout(() => setMessage(null), 2600);
  };

  const load = async () => {
    if (!assetId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [assetResponse, extensionResponse, assignmentResponse, maintenanceResponse, disposalResponse, transferResponse, timelineResponse, documentResponse, photoResponse, employeeResponse] = await Promise.all([
      supabase.from("assets").select("id, asset_name, asset_tag, category, brand, model, serial_number, status, purchase_date, purchase_cost, warranty_expiry, currently_assigned_to, created_at").eq("id", assetId).maybeSingle(),
      supabase.from("asset_register_extensions").select("*").eq("asset_id", assetId).maybeSingle(),
      supabase.from("assignment_records").select("id, asset_id, employee_id, assigned_date, expected_return_date, actual_return_date, status, notes, assigned_by, employees(full_name, department)").eq("asset_id", assetId).order("assigned_date", { ascending: false }),
      supabase.from("asset_maintenance").select("id, asset_id, maintenance_date, warranty_expiry, vendor, service_details, maintenance_cost, status, notes, created_at").eq("asset_id", assetId).order("maintenance_date", { ascending: false }),
      supabase.from("asset_disposals").select("id, asset_id, disposal_date, method, sale_value, remarks, disposed_by").eq("asset_id", assetId).order("disposal_date", { ascending: false }),
      supabase.from("asset_transfers").select("id, asset_id, from_department, to_department, from_employee_id, to_employee_id, transferred_at, transferred_by, notes, transfer_type").eq("asset_id", assetId).order("transferred_at", { ascending: false }),
      supabase.from("asset_lifecycle_events").select("id, asset_id, event_type, event_title, remarks, location, performed_by, event_timestamp").eq("asset_id", assetId).order("event_timestamp", { ascending: false }),
      supabase.from("asset_documents").select("id, document_type, document_name, document_url, uploaded_at").eq("asset_id", assetId).order("uploaded_at", { ascending: false }),
      supabase.from("asset_photos").select("id, photo_name, photo_url, uploaded_at").eq("asset_id", assetId).order("uploaded_at", { ascending: false }),
      supabase.from("employees").select("id, full_name, department").order("full_name", { ascending: true }),
    ]);

    setAsset((assetResponse.data as AssetDetail | null) || null);
    setExtension((extensionResponse.data as AssetExtensionRow | null) || null);
    setAssignments((assignmentResponse.data as AssignmentRow[]) || []);
    setMaintenance((maintenanceResponse.data as MaintenanceRow[]) || []);
    setDisposals((disposalResponse.data as DisposalRow[]) || []);
    setTransfers((transferResponse.data as TransferRow[]) || []);
    setTimeline(
      ((timelineResponse.data as Array<{ event_type?: string; event_title?: string; remarks?: string | null; location?: string | null; performed_by?: string | null; event_timestamp?: string | null }>) || []).map((item) => ({
        kind: item.event_type || "Event",
        title: item.event_title || item.event_type || "Event",
        details: [item.location, item.performed_by, item.remarks].filter(Boolean).join(" • "),
        when: item.event_timestamp || null,
      }))
    );
    setDocuments((documentResponse.data as AssetDocumentRow[]) || []);
    setPhotos((photoResponse.data as AssetPhotoRow[]) || []);
    setEmployees((employeeResponse.data as EmployeeRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [assetId]);

  const activeAssignment = useMemo(() => assignments.find((row) => row.status === "Assigned") || null, [assignments]);

  const warrantyDays = useMemo(() => {
    if (!asset?.warranty_expiry) return null;
    return Math.ceil((new Date(asset.warranty_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, [asset?.warranty_expiry]);

  const healthState = useMemo(() => {
    if (!asset) return "Unknown";
    const status = (asset.status || "").toLowerCase();
    if (status.includes("retired") || status.includes("disposed")) return "Retired";
    if (status.includes("repair") || status.includes("maintenance")) return "Needs Service";
    if (warrantyDays !== null && warrantyDays <= 30) return "Warranty Attention";
    return "Operational";
  }, [asset, warrantyDays]);

  const timelineRows = useMemo(() => {
    const rows: TimelineRow[] = [];

    if (asset) {
      rows.push({
        kind: "Created",
        title: "Asset created",
        details: asset.asset_name,
        when: asset.created_at || null,
      });
    }

    timeline.forEach((item) => rows.push(item));
    assignments.forEach((item) => {
      rows.push({
        kind: item.status,
        title: item.status === "Assigned" ? "Assigned to employee" : `Assignment ${item.status.toLowerCase()}`,
        details: [item.employees?.full_name, item.assigned_by, item.notes].filter(Boolean).join(" • "),
        when: item.actual_return_date || item.assigned_date || null,
      });
    });
    transfers.forEach((item) => {
      rows.push({
        kind: item.transfer_type || "Transfer",
        title: "Transfer recorded",
        details: [item.transferred_by, item.notes, item.to_department || item.from_department].filter(Boolean).join(" • "),
        when: item.transferred_at || null,
      });
    });
    maintenance.forEach((item) => {
      rows.push({
        kind: item.status || "Maintenance",
        title: item.status === "Completed" ? "Maintenance completed" : "Maintenance scheduled",
        details: [item.vendor, item.service_details, item.notes].filter(Boolean).join(" • "),
        when: item.created_at || item.maintenance_date || null,
      });
    });
    disposals.forEach((item) => {
      rows.push({
        kind: "Disposed",
        title: "Disposal recorded",
        details: [item.method, item.disposed_by, item.remarks].filter(Boolean).join(" • "),
        when: item.disposal_date || null,
      });
    });

    return rows.filter((row) => row.when).sort((left, right) => new Date(String(right.when)).getTime() - new Date(String(left.when)).getTime());
  }, [asset, assignments, disposals, maintenance, timeline, transfers]);

  const statusCounts = {
    documents: documents.length,
    photos: photos.length,
    maintenance: maintenance.length,
    timeline: timelineRows.length,
    assignments: assignments.length,
  };

  const latestDisposal = disposals[0] || null;

  const appendLifecycleEvent = async (eventType: string, title: string, remarks?: string | null, location?: string | null) => {
    if (!asset) return;
    const profile = await getUserProfile();
    await supabase.from("asset_lifecycle_events").insert([
      {
        asset_id: asset.id,
        event_type: eventType,
        event_title: title,
        remarks: remarks || null,
        location: location || null,
        performed_by: profile?.full_name || "Office Admin",
      },
    ]);
    await createAuditLog({
      action: `Office Asset ${title}`,
      description: buildAuditDescription({
        event: title,
        userName: profile?.full_name || "Office Admin",
        recordType: "asset",
        recordId: asset.id,
        itemName: asset.asset_name,
        context: remarks || undefined,
      }),
    });
    await createNotificationIfNotExists({
      title: `Asset ${eventType.toLowerCase()}`,
      message: `${asset.asset_name} was updated in the Office asset register.`,
      action: `office-asset-${eventType.toLowerCase()}`,
      createdBy: profile?.full_name || undefined,
      recordType: "asset",
      recordId: asset.id,
    });
  };

  const saveStatus = async () => {
    if (!asset) return;
    setStatusSaving(true);
    const nextStatus = statusForm.status || "Available";
    const updateResponse = await supabase
      .from("assets")
      .update({
        status: nextStatus,
        assigned_to: nextStatus === "Assigned" ? asset.currently_assigned_to : null,
        currently_assigned_to: nextStatus === "Assigned" ? asset.currently_assigned_to : null,
      })
      .eq("id", asset.id);

    if (updateResponse.error) {
      showMessage(updateResponse.error.message);
      setStatusSaving(false);
      return;
    }

    await appendLifecycleEvent("Status Update", `Status changed to ${nextStatus}`, statusForm.remarks || null, extension?.location || null);
    setStatusForm({ status: nextStatus, remarks: "" });
    showMessage(`Asset marked as ${nextStatus}.`);
    await load();
    setStatusSaving(false);
  };

  const assignAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!asset || !assignmentForm.employee_id) return;

    const profile = await getUserProfile();
    const employeeId = Number(assignmentForm.employee_id);
    try {
      await assignOfficeAsset({
        assetId: asset.id,
        employeeId,
        assignedBy: profile?.full_name || "Office Admin",
        expectedReturnDate: assignmentForm.expected_return_date || null,
        notes: assignmentForm.notes || null,
      });
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Failed to assign asset.");
      return;
    }

    await appendLifecycleEvent("Assigned", `Assigned to ${employees.find((row) => row.id === employeeId)?.full_name || "employee"}`, assignmentForm.notes || null, extension?.location || null);
    await createNotificationIfNotExists({
      title: "Asset assigned",
      message: `${asset.asset_name} is now assigned to ${employees.find((row) => row.id === employeeId)?.full_name || "an employee"}.`,
      action: "office-asset-assigned",
      createdBy: profile?.full_name || undefined,
      recordType: "asset",
      recordId: asset.id,
    });

    setAssignmentForm({ employee_id: "", expected_return_date: "", notes: "" });
    showMessage("Assignment recorded.");
    await load();
  };

  const processReturn = async (status: "Returned" | "Lost" | "Damaged") => {
    if (!asset || !activeAssignment) {
      showMessage("No active assignment found.");
      return;
    }

    const profile = await getUserProfile();
    try {
      await returnOfficeAsset({
        assignmentId: activeAssignment.id,
        assetId: asset.id,
        employeeId: activeAssignment.employee_id,
        outcome: status,
      });
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Failed to process return.");
      return;
    }

    await appendLifecycleEvent(status, `Marked ${status.toLowerCase()}`, `Processed by ${profile?.full_name || "Office Admin"}`, extension?.location || null);
    await createNotificationIfNotExists({
      title: `Asset ${status.toLowerCase()}`,
      message: `${asset.asset_name} was marked as ${status}.`,
      action: `office-asset-${status.toLowerCase()}`,
      createdBy: profile?.full_name || undefined,
      recordType: "asset",
      recordId: asset.id,
    });

    showMessage(`Asset marked as ${status}.`);
    await load();
  };

  const scheduleMaintenance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!asset || !maintenanceForm.maintenance_date || !maintenanceForm.vendor.trim()) {
      showMessage("Maintenance date and vendor are required.");
      return;
    }

    const profile = await getUserProfile();
    const response = await supabase.from("asset_maintenance").insert([
      {
        asset_id: asset.id,
        maintenance_date: maintenanceForm.maintenance_date,
        warranty_expiry: maintenanceForm.warranty_expiry || null,
        vendor: maintenanceForm.vendor.trim(),
        service_details: maintenanceForm.service_details.trim(),
        maintenance_cost: maintenanceForm.maintenance_cost ? Number(maintenanceForm.maintenance_cost) : null,
        status: "Pending",
        notes: maintenanceForm.notes.trim() || null,
      },
    ]);

    if (response.error) {
      showMessage(response.error.message);
      return;
    }

    const updates: Record<string, unknown> = { status: "In Maintenance" };
    if (maintenanceForm.warranty_expiry) updates.warranty_expiry = maintenanceForm.warranty_expiry;
    await supabase.from("assets").update(updates).eq("id", asset.id);
    await appendLifecycleEvent("Maintenance", "Maintenance scheduled", maintenanceForm.notes || maintenanceForm.service_details || null, extension?.location || null);
    await createNotificationIfNotExists({
      title: "Maintenance scheduled",
      message: `${asset.asset_name} has been scheduled for maintenance with ${maintenanceForm.vendor}.`,
      action: "office-asset-maintenance",
      createdBy: profile?.full_name || undefined,
      recordType: "asset",
      recordId: asset.id,
    });

    setMaintenanceForm({ maintenance_date: new Date().toISOString().slice(0, 10), vendor: "", service_details: "", maintenance_cost: "", warranty_expiry: "", notes: "" });
    showMessage("Maintenance record created.");
    await load();
  };

  const completeMaintenance = async (id: number) => {
    if (!asset) return;
    const profile = await getUserProfile();
    const response = await supabase.from("asset_maintenance").update({ status: "Completed" }).eq("id", id);
    if (response.error) {
      showMessage(response.error.message);
      return;
    }

    await supabase.from("assets").update({ status: "Available" }).eq("id", asset.id);
    await appendLifecycleEvent("Maintenance", "Maintenance completed", `Completed by ${profile?.full_name || "Office Admin"}`, extension?.location || null);
    showMessage("Maintenance marked complete.");
    await load();
  };

  const handleDocumentUpload = async () => {
    if (!asset || documentFiles.length === 0) return;
    setDocumentUploading(true);
    try {
      for (const file of documentFiles) {
        const fileName = `${asset.asset_tag}-${file.name}`;
        const filePath = `office-assets/${asset.id}/documents/${fileName}`;
        const upload = await supabase.storage.from("asset-documents").upload(filePath, file, { upsert: true });
        if (upload.error) throw upload.error;
        const { data } = supabase.storage.from("asset-documents").getPublicUrl(filePath);
        await supabase.from("asset_documents").insert([{ asset_id: asset.id, document_type: "Upload", document_name: file.name, document_url: data.publicUrl }]);
      }
      await appendLifecycleEvent("Document", "Document uploaded", `${documentFiles.length} file(s) added`, extension?.location || null);
      setDocumentFiles([]);
      showMessage("Documents uploaded.");
      await load();
    } catch (error: any) {
      showMessage(error?.message || "Document upload failed.");
    } finally {
      setDocumentUploading(false);
    }
  };

  const handlePhotoUpload = async () => {
    if (!asset || photoFiles.length === 0) return;
    setPhotoUploading(true);
    try {
      for (const file of photoFiles) {
        const fileName = `${asset.asset_tag}-${file.name}`;
        const filePath = `office-assets/${asset.id}/photos/${fileName}`;
        const upload = await supabase.storage.from("asset-photos").upload(filePath, file, { upsert: true });
        if (upload.error) throw upload.error;
        const { data } = supabase.storage.from("asset-photos").getPublicUrl(filePath);
        await supabase.from("asset_photos").insert([{ asset_id: asset.id, photo_name: file.name, photo_url: data.publicUrl }]);
      }
      await appendLifecycleEvent("Photo", "Photo uploaded", `${photoFiles.length} image(s) added`, extension?.location || null);
      setPhotoFiles([]);
      showMessage("Photos uploaded.");
      await load();
    } catch (error: any) {
      showMessage(error?.message || "Photo upload failed.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const addLifecycleEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!asset) return;
    const profile = await getUserProfile();
    const response = await supabase.from("asset_lifecycle_events").insert([
      {
        asset_id: asset.id,
        event_type: eventForm.event_type,
        event_title: eventForm.event_title || eventForm.event_type,
        location: eventForm.location || null,
        remarks: eventForm.remarks || null,
        performed_by: profile?.full_name || "Office Admin",
      },
    ]);
    if (response.error) {
      showMessage(response.error.message);
      return;
    }

    setEventForm({ event_type: "Created", event_title: "", location: "", remarks: "" });
    showMessage("Lifecycle event added.");
    await load();
  };

  if (loading) {
    return <div style={styles.loading}>Loading asset details...</div>;
  }

  if (!asset) {
    return (
      <div style={styles.page}>
        <OfficeAssetModuleNav />
        <section style={styles.headerCard}>
          <div>
            <p style={styles.eyebrow}>Asset Details</p>
            <h2 style={styles.title}>Asset not found</h2>
            <p style={styles.subtitle}>The selected asset could not be loaded.</p>
          </div>
          <Link href="/office/assets/register" style={styles.backLink}>Back to Register</Link>
        </section>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <OfficeAssetModuleNav />

      <section style={styles.headerCard}>
        <div>
          <p style={styles.eyebrow}>Asset Details</p>
          <h2 style={styles.title}>{asset.asset_name}</h2>
          <p style={styles.subtitle}>Lifecycle history, assignment trail, service records, documents, and labels for the Office asset register.</p>
        </div>
        <div style={styles.headerActions}>
          <Link href="/office/assets/register" style={styles.backLink}>Back to Register</Link>
          <Link href={`/office/assets/register?asset=${asset.id}`} style={styles.secondaryLink}>Open Register</Link>
        </div>
      </section>

      <section style={styles.heroGrid}>
        <article style={styles.heroCard}>
          <div style={styles.heroTopRow}>
            <div>
              <p style={styles.metaLabel}>Asset Tag</p>
              <h3 style={styles.metaValue}>{asset.asset_tag}</h3>
              <p style={styles.metaSubtle}>{extension?.barcode_value || asset.asset_tag}</p>
            </div>
            <div style={styles.healthBadge}>{healthState}</div>
          </div>
          <div style={styles.detailGrid}>
            <Detail label="Category" value={asset.category || "-"} />
            <Detail label="Brand / Model" value={[asset.brand, asset.model].filter(Boolean).join(" / ") || "-"} />
            <Detail label="Serial" value={asset.serial_number || "-"} />
            <Detail label="Vendor" value={extension?.vendor || "-"} />
            <Detail label="Department" value={extension?.department || "-"} />
            <Detail label="Location" value={extension?.location || "-"} />
            <Detail label="Condition" value={extension?.asset_condition || "-"} />
            <Detail label="Status" value={asset.status || "-"} />
            <Detail label="Assigned To" value={activeAssignment?.employees?.full_name || "Unassigned"} />
            <Detail label="Warranty" value={asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString() : "-"} />
          </div>
        </article>

        <article style={styles.labelCard}>
          <QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/office/assets/${asset.id}`} size={180} />
          <p style={styles.labelCaption}>Scan to open this Office asset detail page.</p>
          <div style={styles.labelStats}>
            <SmallStat label="Timeline" value={statusCounts.timeline} />
            <SmallStat label="Docs" value={statusCounts.documents} />
            <SmallStat label="Photos" value={statusCounts.photos} />
            <SmallStat label="Maintenance" value={statusCounts.maintenance} />
          </div>
        </article>
      </section>

      <section style={styles.summaryGrid}>
        <Summary label="Warranty Remaining" value={warrantyDays === null ? "-" : `${warrantyDays} days`} />
        <Summary label="Status" value={asset.status || "-"} />
        <Summary label="Assignments" value={statusCounts.assignments} />
        <Summary label="Latest Disposal" value={latestDisposal ? latestDisposal.method || "Recorded" : "None"} />
      </section>

      <section style={styles.gridTwo}>
        <article style={styles.card}>
          <div style={styles.sectionHeading}>
            <div>
              <p style={styles.eyebrow}>Controls</p>
              <h3 style={styles.cardTitle}>Status and Assignment Workflow</h3>
            </div>
          </div>
          <div style={styles.statusPills}>
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                style={{ ...styles.statusButton, ...(statusForm.status === status ? styles.statusButtonActive : {}) }}
                onClick={() => setStatusForm((current) => ({ ...current, status }))}
              >
                {status}
              </button>
            ))}
          </div>
          <textarea value={statusForm.remarks} onChange={(event) => setStatusForm((current) => ({ ...current, remarks: event.target.value }))} placeholder="Status remarks" style={{ ...styles.input, minHeight: 84 }} />
          <div style={styles.actionsRow}>
            <button type="button" style={styles.primaryButton} disabled={statusSaving} onClick={() => void saveStatus()}>{statusSaving ? "Saving..." : "Save Status"}</button>
            <button type="button" style={styles.secondaryButton} onClick={() => void processReturn("Returned")}>Mark Returned</button>
            <button type="button" style={styles.warningButton} onClick={() => void processReturn("Damaged")}>Mark Damaged</button>
            <button type="button" style={styles.dangerButton} onClick={() => void processReturn("Lost")}>Mark Lost</button>
          </div>
          <form style={styles.formStack} onSubmit={assignAsset}>
            <h4 style={styles.subTitle}>Assign Asset</h4>
            <select value={assignmentForm.employee_id} onChange={(event) => setAssignmentForm((current) => ({ ...current, employee_id: event.target.value }))} style={styles.input}>
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.full_name}{employee.department ? ` - ${employee.department}` : ""}</option>
              ))}
            </select>
            <input type="date" value={assignmentForm.expected_return_date} onChange={(event) => setAssignmentForm((current) => ({ ...current, expected_return_date: event.target.value }))} style={styles.input} />
            <textarea value={assignmentForm.notes} onChange={(event) => setAssignmentForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Assignment notes" style={{ ...styles.input, minHeight: 84 }} />
            <button type="submit" style={styles.primaryButton}>Create Assignment</button>
          </form>
        </article>

        <article style={styles.card}>
          <p style={styles.eyebrow}>Service</p>
          <h3 style={styles.cardTitle}>Maintenance Scheduling</h3>
          <form style={styles.formGrid} onSubmit={scheduleMaintenance}>
            <input type="date" value={maintenanceForm.maintenance_date} onChange={(event) => setMaintenanceForm((current) => ({ ...current, maintenance_date: event.target.value }))} style={styles.input} />
            <input type="date" value={maintenanceForm.warranty_expiry} onChange={(event) => setMaintenanceForm((current) => ({ ...current, warranty_expiry: event.target.value }))} style={styles.input} />
            <input value={maintenanceForm.vendor} onChange={(event) => setMaintenanceForm((current) => ({ ...current, vendor: event.target.value }))} placeholder="Vendor" style={styles.input} />
            <input type="number" value={maintenanceForm.maintenance_cost} onChange={(event) => setMaintenanceForm((current) => ({ ...current, maintenance_cost: event.target.value }))} placeholder="Cost" style={styles.input} />
            <textarea value={maintenanceForm.service_details} onChange={(event) => setMaintenanceForm((current) => ({ ...current, service_details: event.target.value }))} placeholder="Service details" style={{ ...styles.input, minHeight: 84, gridColumn: "1 / -1" }} />
            <textarea value={maintenanceForm.notes} onChange={(event) => setMaintenanceForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Maintenance notes" style={{ ...styles.input, minHeight: 84, gridColumn: "1 / -1" }} />
            <button type="submit" style={styles.primaryButton}>Schedule Maintenance</button>
          </form>
          <div style={styles.recordList}>
            {maintenance.length === 0 ? <p style={styles.empty}>No maintenance records.</p> : maintenance.map((row) => (
              <div key={row.id} style={styles.recordItem}>
                <div>
                  <strong>{row.vendor || "Maintenance"}</strong>
                  <p style={styles.recordText}>{row.service_details || row.notes || "No details provided."}</p>
                </div>
                <div style={styles.recordMeta}>
                  <span style={styles.recordBadge}>{row.status || "Pending"}</span>
                  {row.status !== "Completed" && <button type="button" style={styles.secondaryButton} onClick={() => void completeMaintenance(row.id)}>Complete</button>}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section style={styles.gridTwo}>
        <article style={styles.card}>
          <p style={styles.eyebrow}>Timeline</p>
          <h3 style={styles.cardTitle}>Lifecycle History</h3>
          <form style={styles.formGrid} onSubmit={addLifecycleEvent}>
            <select value={eventForm.event_type} onChange={(event) => setEventForm((current) => ({ ...current, event_type: event.target.value }))} style={styles.input}>
              {lifecycleEventTypes.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <input value={eventForm.event_title} onChange={(event) => setEventForm((current) => ({ ...current, event_title: event.target.value }))} placeholder="Event title" style={styles.input} />
            <input value={eventForm.location} onChange={(event) => setEventForm((current) => ({ ...current, location: event.target.value }))} placeholder="Location" style={styles.input} />
            <textarea value={eventForm.remarks} onChange={(event) => setEventForm((current) => ({ ...current, remarks: event.target.value }))} placeholder="Remarks" style={{ ...styles.input, minHeight: 84, gridColumn: "1 / -1" }} />
            <button type="submit" style={styles.primaryButton}>Add Timeline Event</button>
          </form>
          <div style={styles.recordList}>
            {timelineRows.length === 0 ? <p style={styles.empty}>No lifecycle events yet.</p> : timelineRows.map((row, index) => (
              <div key={`${row.kind}-${index}`} style={styles.recordItem}>
                <div>
                  <strong>{row.title}</strong>
                  <p style={styles.recordText}>{row.details || "No additional details."}</p>
                </div>
                <div style={styles.recordMeta}>
                  <span style={styles.recordBadge}>{row.kind}</span>
                  <span style={styles.recordDate}>{row.when ? new Date(String(row.when)).toLocaleString() : "-"}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article style={styles.card}>
          <p style={styles.eyebrow}>Documents</p>
          <h3 style={styles.cardTitle}>Files, Photos, and Labels</h3>
          <div style={styles.uploadGrid}>
            <label style={styles.fileLabel}>
              Asset Documents
              <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => setDocumentFiles(Array.from(event.target.files || []))} style={styles.fileInput} />
            </label>
            <button type="button" style={styles.primaryButton} disabled={documentUploading} onClick={() => void handleDocumentUpload()}>{documentUploading ? "Uploading..." : "Upload Documents"}</button>
            <label style={styles.fileLabel}>
              Asset Photos
              <input type="file" multiple accept="image/*" onChange={(event) => setPhotoFiles(Array.from(event.target.files || []))} style={styles.fileInput} />
            </label>
            <button type="button" style={styles.primaryButton} disabled={photoUploading} onClick={() => void handlePhotoUpload()}>{photoUploading ? "Uploading..." : "Upload Photos"}</button>
          </div>
          <div style={styles.splitLists}>
            <div>
              <h4 style={styles.subTitle}>Documents</h4>
              {documents.length === 0 ? <p style={styles.empty}>No documents uploaded.</p> : documents.map((doc) => (
                <div key={doc.id} style={styles.fileRow}>
                  <div>
                    <strong>{doc.document_name}</strong>
                    <p style={styles.recordText}>{doc.document_type}</p>
                  </div>
                  <a href={doc.document_url} target="_blank" rel="noreferrer" style={styles.link}>Open</a>
                </div>
              ))}
            </div>
            <div>
              <h4 style={styles.subTitle}>Photos</h4>
              {photos.length === 0 ? <p style={styles.empty}>No photos uploaded.</p> : photos.map((photo) => (
                <div key={photo.id} style={styles.fileRow}>
                  <div>
                    <strong>{photo.photo_name}</strong>
                    <p style={styles.recordText}>{photo.uploaded_at ? new Date(photo.uploaded_at).toLocaleString() : ""}</p>
                  </div>
                  <a href={photo.photo_url} target="_blank" rel="noreferrer" style={styles.link}>Open</a>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section style={styles.card}>
        <p style={styles.eyebrow}>History</p>
        <h3 style={styles.cardTitle}>Assignment, Transfer, and Disposal Records</h3>
        <div style={styles.historyGrid}>
          <HistoryTable
            title="Assignments"
            columns={["Employee", "Assigned", "Expected Return", "Status"]}
            rows={assignments}
            emptyMessage="No assignment records."
            renderRow={(row: AssignmentRow) => (
              <tr key={row.id}>
                <td style={styles.td}>{row.employees?.full_name || "-"}</td>
                <td style={styles.td}>{row.assigned_date ? new Date(row.assigned_date).toLocaleDateString() : "-"}</td>
                <td style={styles.td}>{row.expected_return_date ? new Date(row.expected_return_date).toLocaleDateString() : "-"}</td>
                <td style={styles.td}>{row.status}</td>
              </tr>
            )}
          />
          <HistoryTable
            title="Transfers"
            columns={["Type", "Transferred At", "By", "Notes"]}
            rows={transfers}
            emptyMessage="No transfer records."
            renderRow={(row: TransferRow) => (
              <tr key={row.id}>
                <td style={styles.td}>{row.transfer_type || "-"}</td>
                <td style={styles.td}>{row.transferred_at ? new Date(row.transferred_at).toLocaleString() : "-"}</td>
                <td style={styles.td}>{row.transferred_by || "-"}</td>
                <td style={styles.td}>{row.notes || "-"}</td>
              </tr>
            )}
          />
          <HistoryTable
            title="Disposals"
            columns={["Date", "Method", "Recovery", "Disposed By"]}
            rows={disposals}
            emptyMessage="No disposal records."
            renderRow={(row: DisposalRow) => (
              <tr key={row.id}>
                <td style={styles.td}>{row.disposal_date ? new Date(row.disposal_date).toLocaleDateString() : "-"}</td>
                <td style={styles.td}>{row.method || "-"}</td>
                <td style={styles.td}>${Number(row.sale_value || 0).toLocaleString()}</td>
                <td style={styles.td}>{row.disposed_by || "-"}</td>
              </tr>
            )}
          />
        </div>
      </section>

      {message && <div style={styles.toast}>{message}</div>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.detailCard}>
      <p style={styles.detailLabel}>{label}</p>
      <p style={styles.detailValue}>{value}</p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.summaryCard}>
      <p style={styles.summaryLabel}>{label}</p>
      <p style={styles.summaryValue}>{value}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.smallStatCard}>
      <p style={styles.smallStatLabel}>{label}</p>
      <p style={styles.smallStatValue}>{value}</p>
    </div>
  );
}

function HistoryTable({
  title,
  columns,
  rows,
  emptyMessage,
  renderRow,
}: {
  title: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  emptyMessage: string;
  renderRow: (row: any) => ReactElement;
}) {
  return (
    <div style={styles.historyCard}>
      <h4 style={styles.subTitle}>{title}</h4>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} style={styles.th}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} style={styles.empty}>{emptyMessage}</td></tr>
            ) : (
              rows.map((row) => renderRow(row))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "grid", gap: 14 },
  loading: { minHeight: 240, display: "grid", placeItems: "center", background: "white", border: "1px solid #e2e8f0", borderRadius: 14, color: "#0f172a", fontWeight: 800 },
  headerCard: { background: "white", borderRadius: 14, border: "1px solid #dbeafe", padding: 16, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  headerActions: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  eyebrow: { margin: 0, color: "#0369a1", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" },
  title: { margin: "6px 0", color: "#0f172a", fontSize: 26, fontWeight: 900 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 880 },
  backLink: { border: "1px solid #2563eb", background: "#2563eb", color: "white", borderRadius: 10, padding: "10px 14px", textDecoration: "none", fontWeight: 700 },
  secondaryLink: { border: "1px solid #cbd5e1", background: "#f8fafc", color: "#0f172a", borderRadius: 10, padding: "10px 14px", textDecoration: "none", fontWeight: 700 },
  heroGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1.8fr) minmax(280px, 0.9fr)", gap: 12 },
  heroCard: { background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, display: "grid", gap: 12 },
  heroTopRow: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "start" },
  metaLabel: { margin: 0, color: "#64748b", fontSize: 11, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em" },
  metaValue: { margin: "6px 0 2px", color: "#0f172a", fontSize: 24, fontWeight: 900 },
  metaSubtle: { margin: 0, color: "#475569", fontSize: 12, fontWeight: 700 },
  healthBadge: { alignSelf: "start", borderRadius: 999, background: "#dbeafe", color: "#1e3a8a", fontSize: 12, fontWeight: 800, padding: "6px 10px" },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 },
  detailCard: { border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" },
  detailLabel: { margin: 0, color: "#64748b", fontSize: 11, textTransform: "uppercase", fontWeight: 800 },
  detailValue: { margin: "6px 0 0", color: "#0f172a", fontSize: 14, fontWeight: 800 },
  labelCard: { background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, display: "grid", gap: 12, justifyItems: "center", alignContent: "start" },
  labelCaption: { margin: 0, color: "#475569", fontSize: 12, textAlign: "center" },
  labelStats: { width: "100%", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 },
  smallStatCard: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 },
  smallStatLabel: { margin: 0, color: "#64748b", fontSize: 11, textTransform: "uppercase", fontWeight: 800 },
  smallStatValue: { margin: "6px 0 0", color: "#0f172a", fontSize: 20, fontWeight: 900 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 },
  summaryCard: { background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 },
  summaryLabel: { margin: 0, color: "#64748b", fontSize: 11, textTransform: "uppercase", fontWeight: 800 },
  summaryValue: { margin: "6px 0 0", color: "#0f172a", fontSize: 20, fontWeight: 900 },
  gridTwo: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  card: { background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, display: "grid", gap: 12 },
  sectionHeading: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" },
  cardTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 900 },
  subTitle: { margin: 0, color: "#0f172a", fontSize: 15, fontWeight: 900 },
  statusPills: { display: "flex", flexWrap: "wrap", gap: 8 },
  statusButton: { border: "1px solid #cbd5e1", background: "#f8fafc", color: "#0f172a", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" },
  statusButtonActive: { background: "#2563eb", borderColor: "#2563eb", color: "white" },
  input: { width: "100%", borderRadius: 10, border: "1px solid #cbd5e1", padding: "10px 12px", fontSize: 13, background: "white" },
  actionsRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  primaryButton: { border: "none", borderRadius: 10, background: "#2563eb", color: "white", padding: "10px 14px", fontWeight: 800, cursor: "pointer" },
  secondaryButton: { border: "1px solid #cbd5e1", borderRadius: 10, background: "#f8fafc", color: "#0f172a", padding: "10px 14px", fontWeight: 800, cursor: "pointer" },
  warningButton: { border: "1px solid #fde68a", borderRadius: 10, background: "#fef3c7", color: "#92400e", padding: "10px 14px", fontWeight: 800, cursor: "pointer" },
  dangerButton: { border: "1px solid #fecaca", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", padding: "10px 14px", fontWeight: 800, cursor: "pointer" },
  formStack: { display: "grid", gap: 10 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 },
  recordList: { display: "grid", gap: 10 },
  recordItem: { border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", background: "#f8fafc" },
  recordText: { margin: "6px 0 0", color: "#475569", fontSize: 12 },
  recordMeta: { display: "grid", gap: 6, justifyItems: "end", alignContent: "start" },
  recordBadge: { borderRadius: 999, background: "#dbeafe", color: "#1e3a8a", padding: "4px 8px", fontSize: 11, fontWeight: 800 },
  recordDate: { color: "#64748b", fontSize: 12, fontWeight: 700 },
  empty: { margin: 0, color: "#64748b", fontSize: 13 },
  uploadGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, alignItems: "start" },
  fileLabel: { display: "grid", gap: 6, color: "#334155", fontWeight: 800, fontSize: 13 },
  fileInput: { width: "100%" },
  splitLists: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  fileRow: { display: "flex", justifyContent: "space-between", gap: 10, padding: 10, borderRadius: 10, border: "1px solid #e2e8f0", background: "white", marginBottom: 8 },
  link: { color: "#1d4ed8", fontWeight: 800, textDecoration: "none" },
  historyGrid: { display: "grid", gap: 12 },
  historyCard: { display: "grid", gap: 10 },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 540 },
  th: { textAlign: "left", padding: 10, background: "#f8fafc", fontSize: 12, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.06em" },
  td: { padding: 10, borderTop: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, verticalAlign: "top" },
  toast: { position: "fixed", right: 16, bottom: 16, background: "#0f172a", color: "white", borderRadius: 10, padding: "10px 14px", fontWeight: 800, fontSize: 13, zIndex: 1000 },
};
