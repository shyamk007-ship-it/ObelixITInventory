"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../../lib/supabase";
import { createNotificationIfNotExists } from "../../../lib/audit";
import { getUserProfile } from "../../../lib/rbac";

interface AssetDetail {
  id: number;
  asset_name: string;
  asset_tag: string;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  status?: string | null;
  purchase_date?: string | null;
  warranty_expiry?: string | null;
  vessel_id?: number | null;
  currently_assigned_to?: number | null;
  photo_url?: string | null;
  qr_code?: string | null;
  created_at?: string | null;
  vessels?: { vessel_name?: string | null } | null;
  employees?: { full_name?: string | null } | null;
}

interface LifecycleEvent {
  id: number;
  asset_id: number;
  event_type: string;
  event_title: string;
  remarks?: string | null;
  location?: string | null;
  performed_by?: string | null;
  event_timestamp?: string | null;
}

interface TransferRecord {
  id: number;
  asset_id: number;
  from_vessel_id?: number | null;
  to_vessel_id?: number | null;
  from_department?: string | null;
  to_department?: string | null;
  from_employee_id?: number | null;
  to_employee_id?: number | null;
  transferred_at?: string | null;
  transferred_by?: string | null;
  notes?: string | null;
  transfer_type?: string | null;
}

interface DocumentRecord {
  id: number;
  document_type: string;
  document_name: string;
  document_url: string;
}

interface PhotoRecord {
  id: number;
  photo_name: string;
  photo_url: string;
}

const documentTypes = ["Invoice", "Warranty", "Manual", "Purchase Order", "AMC Contract"];
const lifecycleEvents = ["Created", "Assigned", "Transferred", "Maintenance", "Returned", "Disposed"];
const healthStates = ["Excellent", "Good", "Fair", "Needs Service", "Replace Immediately"];

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = Number(params?.id);
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [history, setHistory] = useState<LifecycleEvent[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [vessels, setVessels] = useState<{ id: number; vessel_name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: number; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventForm, setEventForm] = useState({ event_type: "Created", event_title: "", remarks: "", location: "", performed_by: "" });
  const [transferForm, setTransferForm] = useState({ transfer_type: "vessel", to_vessel_id: "", to_department: "", to_employee_id: "", notes: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    if (!assetId) return;
    void loadAssetData();
  }, [assetId]);

  const loadAssetData = async () => {
    setLoading(true);
    try {
      const [assetResponse, historyResponse, transferResponse, documentResponse, photoResponse, vesselResponse, employeeResponse] = await Promise.all([
        supabase.from("assets").select("*, vessels(vessel_name), employees(full_name)").eq("id", assetId).single(),
        supabase.from("asset_lifecycle_events").select("*").eq("asset_id", assetId).order("event_timestamp", { ascending: false }),
        supabase.from("asset_transfers").select("*").eq("asset_id", assetId).order("transferred_at", { ascending: false }),
        supabase.from("asset_documents").select("*").eq("asset_id", assetId).order("uploaded_at", { ascending: false }),
        supabase.from("asset_photos").select("*").eq("asset_id", assetId).order("uploaded_at", { ascending: false }),
        supabase.from("vessels").select("id, vessel_name").order("vessel_name", { ascending: true }),
        supabase.from("employees").select("id, full_name").order("full_name", { ascending: true }),
      ]);

      if (!assetResponse.error) setAsset(assetResponse.data as AssetDetail);
      if (!historyResponse.error) setHistory((historyResponse.data as LifecycleEvent[]) || []);
      if (!transferResponse.error) setTransfers((transferResponse.data as TransferRecord[]) || []);
      if (!documentResponse.error) setDocuments((documentResponse.data as DocumentRecord[]) || []);
      if (!photoResponse.error) setPhotos((photoResponse.data as PhotoRecord[]) || []);
      if (!vesselResponse.error) setVessels((vesselResponse.data as { id: number; vessel_name: string }[]) || []);
      if (!employeeResponse.error) setEmployees((employeeResponse.data as { id: number; full_name: string }[]) || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addLifecycleEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!asset) return;

    const profile = await getUserProfile();
    const { error } = await supabase.from("asset_lifecycle_events").insert([{ asset_id: asset.id, event_type: eventForm.event_type, event_title: eventForm.event_title || eventForm.event_type, remarks: eventForm.remarks, location: eventForm.location, performed_by: eventForm.performed_by || profile?.full_name || "System" }]);
    if (error) {
      alert(error.message);
      return;
    }

    setEventForm({ event_type: "Created", event_title: "", remarks: "", location: "", performed_by: "" });
    await loadAssetData();
  };

  const createTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!asset) return;

    const profile = await getUserProfile();
    const { error } = await supabase.from("asset_transfers").insert([{ asset_id: asset.id, to_vessel_id: transferForm.to_vessel_id ? Number(transferForm.to_vessel_id) : null, to_department: transferForm.to_department || null, to_employee_id: transferForm.to_employee_id ? Number(transferForm.to_employee_id) : null, notes: transferForm.notes || null, transfer_type: transferForm.transfer_type, transferred_by: profile?.full_name || "System" }]);
    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("assets").update({ vessel_id: transferForm.to_vessel_id ? Number(transferForm.to_vessel_id) : asset.vessel_id, currently_assigned_to: transferForm.to_employee_id ? Number(transferForm.to_employee_id) : asset.currently_assigned_to, status: transferForm.transfer_type === "employee" ? "Assigned" : "In Transit" }).eq("id", asset.id);
    await supabase.from("asset_lifecycle_events").insert([{ asset_id: asset.id, event_type: "Transferred", event_title: "Asset transferred", remarks: transferForm.notes || null, location: transferForm.to_department || transferForm.to_vessel_id ? vessels.find((item) => String(item.id) === transferForm.to_vessel_id)?.vessel_name || null : null, performed_by: profile?.full_name || "System" }]);

    setTransferForm({ transfer_type: "vessel", to_vessel_id: "", to_department: "", to_employee_id: "", notes: "" });
    await loadAssetData();
  };

  const handleDocumentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !asset) return;

    setUploading(true);
    setUploadMessage("Uploading documents...");

    try {
      for (const file of files) {
        const fileName = `${asset.asset_tag}-${file.name}`;
        const filePath = `assets/${asset.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from("asset-documents").upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("asset-documents").getPublicUrl(filePath);
        await supabase.from("asset_documents").insert([{ asset_id: asset.id, document_type: "Upload", document_name: file.name, document_url: data.publicUrl }]);
      }
      setUploadMessage("Documents uploaded successfully.");
      await loadAssetData();
    } catch (error: any) {
      setUploadMessage(error?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !asset) return;

    setUploading(true);
    setUploadMessage("Uploading photos...");

    try {
      for (const file of files) {
        const fileName = `${asset.asset_tag}-${file.name}`;
        const filePath = `assets/photos/${asset.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from("asset-photos").upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("asset-photos").getPublicUrl(filePath);
        await supabase.from("asset_photos").insert([{ asset_id: asset.id, photo_name: file.name, photo_url: data.publicUrl }]);
      }
      setUploadMessage("Photos uploaded successfully.");
      await loadAssetData();
    } catch (error: any) {
      setUploadMessage(error?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const warrantyDays = useMemo(() => {
    if (!asset?.warranty_expiry) return null;
    const expiry = new Date(asset.warranty_expiry);
    const now = new Date();
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [asset?.warranty_expiry]);

  const healthScore = useMemo(() => {
    if (!asset) return "Excellent";
    const daysLeft = warrantyDays ?? 365;
    const isWarrantyClose = daysLeft <= 30;
    const status = asset.status?.toLowerCase() || "";
    if (status.includes("dispose") || status.includes("retired")) return "Replace Immediately";
    if (isWarrantyClose || status.includes("maintenance") || status.includes("transit")) return "Needs Service";
    if (daysLeft > 180) return "Excellent";
    if (daysLeft > 90) return "Good";
    return "Fair";
  }, [asset, warrantyDays]);

  if (loading) {
    return <div style={styles.loading}>Loading asset details…</div>;
  }

  if (!asset) {
    return <div style={styles.loading}>Asset not found.</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Lifecycle Management</p>
          <h1 style={styles.title}>{asset.asset_name}</h1>
          <p style={styles.subtitle}>Detailed asset intelligence, maintenance history, transfer trail, and document sharing.</p>
        </div>
        <button style={styles.secondaryButton} onClick={() => router.push("/admin/assets")}>← Back to Assets</button>
      </div>

      <div style={styles.heroCard}>
        <div style={styles.heroInfo}>
          <p style={styles.metaLabel}>Asset Tag</p>
          <h2 style={styles.metaValue}>{asset.asset_tag}</h2>
          <div style={styles.metaGrid}>
            <div><p style={styles.metaLabel}>Serial Number</p><p style={styles.metaValueSmall}>{asset.serial_number || "—"}</p></div>
            <div><p style={styles.metaLabel}>Category</p><p style={styles.metaValueSmall}>{asset.category || "—"}</p></div>
            <div><p style={styles.metaLabel}>Brand</p><p style={styles.metaValueSmall}>{asset.brand || "—"}</p></div>
            <div><p style={styles.metaLabel}>Model</p><p style={styles.metaValueSmall}>{asset.model || "—"}</p></div>
            <div><p style={styles.metaLabel}>Purchase Date</p><p style={styles.metaValueSmall}>{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : "—"}</p></div>
            <div><p style={styles.metaLabel}>Warranty Expiry</p><p style={styles.metaValueSmall}>{asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString() : "—"}</p></div>
            <div><p style={styles.metaLabel}>Current Vessel</p><p style={styles.metaValueSmall}>{asset.vessels?.vessel_name || "—"}</p></div>
            <div><p style={styles.metaLabel}>Assigned Employee</p><p style={styles.metaValueSmall}>{asset.employees?.full_name || "Unassigned"}</p></div>
            <div><p style={styles.metaLabel}>Status</p><p style={styles.metaValueSmall}>{asset.status || "—"}</p></div>
          </div>
        </div>
        <div style={styles.qrBlock}>
          <QRCodeSVG value={`${window.location.origin}/admin/assets/${asset.id}`} size={180} />
          <p style={styles.qrCaption}>Scan to open this asset page</p>
        </div>
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}><p style={styles.summaryLabel}>Warranty Remaining</p><strong style={styles.summaryValue}>{warrantyDays === null ? "—" : `${warrantyDays} days`}</strong></div>
        <div style={styles.summaryCard}><p style={styles.summaryLabel}>Health Score</p><strong style={styles.summaryValue}>{healthScore}</strong></div>
        <div style={styles.summaryCard}><p style={styles.summaryLabel}>Lifecycle Events</p><strong style={styles.summaryValue}>{history.length}</strong></div>
        <div style={styles.summaryCard}><p style={styles.summaryLabel}>Documents</p><strong style={styles.summaryValue}>{documents.length}</strong></div>
      </div>

      <div style={styles.gridTwo}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Asset History</h3>
          <form onSubmit={addLifecycleEvent} style={styles.formGrid}>
            <select style={styles.input} value={eventForm.event_type} onChange={(event) => setEventForm((current) => ({ ...current, event_type: event.target.value }))}>
              {lifecycleEvents.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <input style={styles.input} placeholder="Event title" value={eventForm.event_title} onChange={(event) => setEventForm((current) => ({ ...current, event_title: event.target.value }))} />
            <input style={styles.input} placeholder="Location" value={eventForm.location} onChange={(event) => setEventForm((current) => ({ ...current, location: event.target.value }))} />
            <input style={styles.input} placeholder="Performed by" value={eventForm.performed_by} onChange={(event) => setEventForm((current) => ({ ...current, performed_by: event.target.value }))} />
            <textarea style={{ ...styles.input, minHeight: 84 }} placeholder="Remarks" value={eventForm.remarks} onChange={(event) => setEventForm((current) => ({ ...current, remarks: event.target.value }))} />
            <button style={styles.primaryButton} type="submit">Add Event</button>
          </form>
          <div style={styles.listSection}>
            {history.map((event) => (
              <div key={event.id} style={styles.listItem}>
                <div>
                  <strong>{event.event_title}</strong>
                  <p style={styles.listText}>{event.remarks || "No remarks provided."}</p>
                </div>
                <div style={styles.listMeta}>
                  <span style={styles.badge}>{event.event_type}</span>
                  <span style={styles.subtle}>{event.event_timestamp ? new Date(event.event_timestamp).toLocaleString() : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Transfer Asset</h3>
          <form onSubmit={createTransfer} style={styles.formGrid}>
            <select style={styles.input} value={transferForm.transfer_type} onChange={(event) => setTransferForm((current) => ({ ...current, transfer_type: event.target.value }))}>
              <option value="vessel">Vessel</option>
              <option value="department">Department</option>
              <option value="employee">Employee</option>
            </select>
            {transferForm.transfer_type === "vessel" && (
              <select style={styles.input} value={transferForm.to_vessel_id} onChange={(event) => setTransferForm((current) => ({ ...current, to_vessel_id: event.target.value }))}>
                <option value="">Select vessel</option>
                {vessels.map((vessel) => <option key={vessel.id} value={vessel.id}>{vessel.vessel_name}</option>)}
              </select>
            )}
            {transferForm.transfer_type === "department" && (
              <input style={styles.input} placeholder="Destination department" value={transferForm.to_department} onChange={(event) => setTransferForm((current) => ({ ...current, to_department: event.target.value }))} />
            )}
            {transferForm.transfer_type === "employee" && (
              <select style={styles.input} value={transferForm.to_employee_id} onChange={(event) => setTransferForm((current) => ({ ...current, to_employee_id: event.target.value }))}>
                <option value="">Assign employee</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
              </select>
            )}
            <textarea style={{ ...styles.input, minHeight: 84 }} placeholder="Transfer notes" value={transferForm.notes} onChange={(event) => setTransferForm((current) => ({ ...current, notes: event.target.value }))} />
            <button style={styles.primaryButton} type="submit">Record Transfer</button>
          </form>
          <div style={styles.listSection}>
            {transfers.map((transfer) => (
              <div key={transfer.id} style={styles.listItem}>
                <div>
                  <strong>{transfer.transfer_type || "Transfer"}</strong>
                  <p style={styles.listText}>{transfer.notes || "No notes provided."}</p>
                </div>
                <div style={styles.listMeta}>
                  <span style={styles.subtle}>{transfer.transferred_at ? new Date(transfer.transferred_at).toLocaleString() : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.gridTwo}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Documents</h3>
          <input type="file" multiple style={styles.fileInput} onChange={handleDocumentUpload} />
          <div style={styles.uploadBox}>Upload invoice, warranty, manual, PO, or AMC document</div>
          {uploadMessage ? <p style={styles.helperText}>{uploadMessage}</p> : null}
          <div style={styles.listSection}>
            {documents.map((document) => (
              <div key={document.id} style={styles.listItem}>
                <div>
                  <strong>{document.document_name}</strong>
                  <p style={styles.listText}>{document.document_type}</p>
                </div>
                <a href={document.document_url} target="_blank" rel="noreferrer" style={styles.link}>Open</a>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Photos</h3>
          <input type="file" multiple accept="image/*" style={styles.fileInput} onChange={handlePhotoUpload} />
          <div style={styles.uploadBox}>Upload multiple photos for this asset</div>
          {uploadMessage ? <p style={styles.helperText}>{uploadMessage}</p> : null}
          <div style={styles.photoGrid}>
            {photos.map((photo) => (
              <a key={photo.id} href={photo.photo_url} target="_blank" rel="noreferrer" style={styles.photoCard}>
                <img src={photo.photo_url} alt={photo.photo_name} style={styles.photoImage} />
                <span style={styles.photoLabel}>{photo.photo_name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  page: { padding: 30, background: "#f8fbff", minHeight: "100vh" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" },
  eyebrow: { margin: 0, color: "#2563eb", textTransform: "uppercase", fontSize: 12, fontWeight: 700, letterSpacing: "0.2em" },
  title: { margin: "4px 0 6px", fontSize: 28, fontWeight: 800, color: "#0f172a" },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 760 },
  secondaryButton: { border: "1px solid #cbd5e1", background: "white", color: "#0f172a", padding: "10px 14px", borderRadius: 999, fontWeight: 700, cursor: "pointer" },
  primaryButton: { border: "none", background: "linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)", color: "white", padding: "10px 14px", borderRadius: 999, fontWeight: 700, cursor: "pointer" },
  heroCard: { background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)", color: "white", borderRadius: 24, padding: 24, display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 20 },
  heroInfo: { flex: 1 },
  metaLabel: { margin: 0, fontSize: 12, color: "#bfdbfe", textTransform: "uppercase", letterSpacing: "0.18em" },
  metaValue: { margin: "4px 0 10px", fontSize: 24, fontWeight: 800 },
  metaValueSmall: { margin: "4px 0 0", fontSize: 14, color: "#e0f2fe" },
  metaGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  qrBlock: { background: "rgba(255,255,255,0.14)", padding: 16, borderRadius: 18, display: "flex", flexDirection: "column", alignItems: "center" },
  qrCaption: { marginTop: 8, fontSize: 12, color: "#e0f2fe" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 },
  summaryCard: { background: "white", borderRadius: 20, padding: 16, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)" },
  summaryLabel: { margin: 0, color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase" },
  summaryValue: { marginTop: 6, display: "block", fontSize: 24, color: "#0f172a" },
  gridTwo: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 20 },
  card: { background: "white", borderRadius: 24, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)" },
  cardTitle: { margin: "0 0 12px", fontSize: 18, color: "#0f172a" },
  formGrid: { display: "grid", gap: 12 },
  input: { padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 14 },
  listSection: { display: "grid", gap: 10, marginTop: 12 },
  listItem: { border: "1px solid #e2e8f0", borderRadius: 16, padding: 12, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" },
  listText: { margin: "4px 0 0", color: "#64748b", fontSize: 13 },
  listMeta: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  badge: { background: "#eff6ff", color: "#1d4ed8", padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  subtle: { color: "#64748b", fontSize: 12 },
  uploadBox: { border: "2px dashed #cbd5e1", borderRadius: 16, padding: 18, textAlign: "center", color: "#64748b", background: "#f8fafc" },
  fileInput: { width: "100%", padding: "10px 0", cursor: "pointer" },
  helperText: { marginTop: 8, color: "#2563eb", fontSize: 13 },
  photoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginTop: 12 },
  photoCard: { border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", textDecoration: "none", color: "#0f172a" },
  photoImage: { width: "100%", height: 110, objectFit: "cover" },
  photoLabel: { display: "block", padding: 8, fontSize: 12 },
  link: { color: "#2563eb", fontWeight: 700, textDecoration: "none" },
  loading: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", color: "#0f172a" },
};
