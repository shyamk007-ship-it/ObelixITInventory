"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import OfficeAssetModuleNav from "../../../components/office/OfficeAssetModuleNav";
import BarcodeLabel from "../../../components/shared/BarcodeLabel";
import { supabase } from "../../../lib/supabase";

interface AssetRow {
  id: number;
  asset_name: string;
  asset_tag: string;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  purchase_cost?: number | null;
  warranty_expiry?: string | null;
  currently_assigned_to?: number | null;
  status?: string | null;
  created_at?: string | null;
}

interface AssetExtensionRow {
  asset_id: number;
  vendor?: string | null;
  department?: string | null;
  location?: string | null;
  asset_condition?: string | null;
  remarks?: string | null;
  barcode_value?: string | null;
  invoice_url?: string | null;
  photo_url?: string | null;
}

interface EmployeeRow {
  id: number;
  full_name: string;
}

interface RegisterFormState {
  asset_name: string;
  asset_tag: string;
  category: string;
  brand: string;
  model: string;
  serial_number: string;
  purchase_date: string;
  purchase_cost: string;
  warranty_expiry: string;
  department: string;
  assigned_user: string;
  location: string;
  status: string;
  asset_condition: string;
  vendor: string;
  remarks: string;
}

const initialForm: RegisterFormState = {
  asset_name: "",
  asset_tag: "",
  category: "",
  brand: "",
  model: "",
  serial_number: "",
  purchase_date: "",
  purchase_cost: "",
  warranty_expiry: "",
  department: "",
  assigned_user: "",
  location: "",
  status: "Available",
  asset_condition: "Good",
  vendor: "",
  remarks: "",
};

export default function OfficeAssetRegisterPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [extensions, setExtensions] = useState<Record<number, AssetExtensionRow>>({});
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
  const [form, setForm] = useState<RegisterFormState>(initialForm);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [assetResponse, employeeResponse] = await Promise.all([
      supabase
        .from("assets")
        .select("id, asset_name, asset_tag, category, brand, model, serial_number, purchase_date, purchase_cost, warranty_expiry, currently_assigned_to, status, created_at")
        .is("vessel_id", null)
        .order("created_at", { ascending: false }),
      supabase.from("employees").select("id, full_name").order("full_name", { ascending: true }),
    ]);

    const assetRows = (assetResponse.data as AssetRow[]) || [];
    setAssets(assetRows);
    setEmployees((employeeResponse.data as EmployeeRow[]) || []);

    const ids = assetRows.map((row) => row.id);
    if (ids.length) {
      const extensionResponse = await supabase.from("asset_register_extensions").select("*").in("asset_id", ids);
      if (!extensionResponse.error) {
        const map = new Map<number, AssetExtensionRow>();
        (extensionResponse.data as AssetExtensionRow[]).forEach((row) => map.set(row.asset_id, row));
        setExtensions(Object.fromEntries(map.entries()));
      } else {
        setExtensions({});
      }
    } else {
      setExtensions({});
    }

    setLoading(false);
  };

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return assets;

    return assets.filter((asset) => {
      const extra = extensions[asset.id];
      const assignedName = employees.find((employee) => employee.id === asset.currently_assigned_to)?.full_name || "";
      return [
        asset.asset_name,
        asset.asset_tag,
        asset.category,
        asset.serial_number,
        asset.status,
        extra?.vendor,
        extra?.department,
        extra?.location,
        assignedName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [assets, employees, extensions, search]);

  const openCreate = () => {
    setEditingAssetId(null);
    setForm(initialForm);
    setInvoiceFile(null);
    setPhotoFile(null);
    setShowModal(true);
  };

  const openEdit = (asset: AssetRow) => {
    const extra = extensions[asset.id];
    setEditingAssetId(asset.id);
    setForm({
      asset_name: asset.asset_name || "",
      asset_tag: asset.asset_tag || "",
      category: asset.category || "",
      brand: asset.brand || "",
      model: asset.model || "",
      serial_number: asset.serial_number || "",
      purchase_date: asset.purchase_date || "",
      purchase_cost: asset.purchase_cost ? String(asset.purchase_cost) : "",
      warranty_expiry: asset.warranty_expiry || "",
      department: extra?.department || "",
      assigned_user: asset.currently_assigned_to ? String(asset.currently_assigned_to) : "",
      location: extra?.location || "",
      status: asset.status || "Available",
      asset_condition: extra?.asset_condition || "Good",
      vendor: extra?.vendor || "",
      remarks: extra?.remarks || "",
    });
    setInvoiceFile(null);
    setPhotoFile(null);
    setShowModal(true);
  };

  const upsertExtension = async (assetId: number, invoiceUrl?: string | null, photoUrl?: string | null) => {
    const extensionPayload: AssetExtensionRow = {
      asset_id: assetId,
      vendor: form.vendor || null,
      department: form.department || null,
      location: form.location || null,
      asset_condition: form.asset_condition || null,
      remarks: form.remarks || null,
      barcode_value: form.asset_tag || null,
      invoice_url: invoiceUrl ?? extensions[assetId]?.invoice_url ?? null,
      photo_url: photoUrl ?? extensions[assetId]?.photo_url ?? null,
    };

    const response = await supabase.from("asset_register_extensions").upsert([extensionPayload], { onConflict: "asset_id" });
    if (response.error) {
      showToast("Asset saved, but extensions table is missing. Run Phase 2.3 schema SQL.");
    }
  };

  const saveAsset = async () => {
    if (!form.asset_name.trim() || !form.asset_tag.trim()) {
      showToast("Asset Name and Asset ID are required.");
      return;
    }

    setSaving(true);
    const payload = {
      asset_name: form.asset_name,
      asset_tag: form.asset_tag,
      category: form.category || null,
      brand: form.brand || null,
      model: form.model || null,
      serial_number: form.serial_number || null,
      purchase_date: form.purchase_date || null,
      purchase_cost: form.purchase_cost ? Number(form.purchase_cost) : null,
      warranty_expiry: form.warranty_expiry || null,
      currently_assigned_to: form.assigned_user ? Number(form.assigned_user) : null,
      status: form.status || "Available",
      vessel_id: null,
    };

    let uploadedInvoiceUrl: string | null = null;
    if (invoiceFile) {
      const invoicePath = `office-assets/invoices/${Date.now()}-${invoiceFile.name}`;
      const uploadInvoice = await supabase.storage.from("asset-documents").upload(invoicePath, invoiceFile, { upsert: true });
      if (!uploadInvoice.error) {
        uploadedInvoiceUrl = supabase.storage.from("asset-documents").getPublicUrl(invoicePath).data.publicUrl;
      }
    }

    let uploadedPhotoUrl: string | null = null;
    if (photoFile) {
      const photoPath = `office-assets/photos/${Date.now()}-${photoFile.name}`;
      const uploadPhoto = await supabase.storage.from("asset-photos").upload(photoPath, photoFile, { upsert: true });
      if (!uploadPhoto.error) {
        uploadedPhotoUrl = supabase.storage.from("asset-photos").getPublicUrl(photoPath).data.publicUrl;
      }
    }

    if (editingAssetId) {
      const updateResponse = await supabase.from("assets").update(payload).eq("id", editingAssetId).select().single();
      if (updateResponse.error) {
        showToast(updateResponse.error.message);
        setSaving(false);
        return;
      }
      await upsertExtension(editingAssetId, uploadedInvoiceUrl, uploadedPhotoUrl);
      showToast("Asset updated.");
    } else {
      const insertResponse = await supabase.from("assets").insert([payload]).select().single();
      if (insertResponse.error) {
        showToast(insertResponse.error.message);
        setSaving(false);
        return;
      }
      await upsertExtension(insertResponse.data.id, uploadedInvoiceUrl, uploadedPhotoUrl);
      showToast("Asset created.");
    }

    setShowModal(false);
    setForm(initialForm);
    setEditingAssetId(null);
    setInvoiceFile(null);
    setPhotoFile(null);
    await loadData();
    setSaving(false);
  };

  const deleteAsset = async (asset: AssetRow) => {
    if (!window.confirm(`Delete ${asset.asset_name}?`)) return;
    const response = await supabase.from("assets").delete().eq("id", asset.id);
    if (response.error) {
      showToast(response.error.message);
      return;
    }
    showToast("Asset deleted.");
    await loadData();
  };

  const duplicateAsset = async (asset: AssetRow) => {
    const extra = extensions[asset.id];
    const newTag = `${asset.asset_tag}-COPY-${Date.now().toString().slice(-4)}`;
    const duplicateResponse = await supabase
      .from("assets")
      .insert([
        {
          asset_name: `${asset.asset_name} Copy`,
          asset_tag: newTag,
          category: asset.category || null,
          brand: asset.brand || null,
          model: asset.model || null,
          serial_number: asset.serial_number || null,
          purchase_date: asset.purchase_date || null,
          purchase_cost: asset.purchase_cost || null,
          warranty_expiry: asset.warranty_expiry || null,
          currently_assigned_to: null,
          status: "Available",
          vessel_id: null,
        },
      ])
      .select()
      .single();

    if (duplicateResponse.error) {
      showToast(duplicateResponse.error.message);
      return;
    }

    await supabase.from("asset_register_extensions").upsert([
      {
        asset_id: duplicateResponse.data.id,
        vendor: extra?.vendor || null,
        department: extra?.department || null,
        location: extra?.location || null,
        asset_condition: extra?.asset_condition || null,
        remarks: extra?.remarks || null,
        barcode_value: newTag,
        invoice_url: extra?.invoice_url || null,
        photo_url: extra?.photo_url || null,
      },
    ]);

    showToast("Asset duplicated.");
    await loadData();
  };

  const importFile = async (file: File | null) => {
    if (!file) return;

    const lower = file.name.toLowerCase();
    let rows: Record<string, any>[] = [];

    if (lower.endsWith(".csv")) {
      const text = await file.text();
      const workbook = XLSX.read(text, { type: "string" });
      const first = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(first);
    } else {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const first = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(first);
    }

    if (!rows.length) {
      showToast("Import file is empty.");
      return;
    }

    let imported = 0;
    for (const row of rows) {
      const payload = {
        asset_name: String(row.asset_name || row.AssetName || "").trim(),
        asset_tag: String(row.asset_tag || row.AssetID || row.AssetTag || "").trim(),
        category: String(row.category || "").trim() || null,
        brand: String(row.brand || "").trim() || null,
        model: String(row.model || "").trim() || null,
        serial_number: String(row.serial_number || row.SerialNumber || "").trim() || null,
        purchase_date: String(row.purchase_date || "").trim() || null,
        purchase_cost: row.purchase_cost ? Number(row.purchase_cost) : null,
        warranty_expiry: String(row.warranty_expiry || "").trim() || null,
        status: String(row.status || "Available").trim() || "Available",
        vessel_id: null,
      };

      if (!payload.asset_name || !payload.asset_tag) {
        continue;
      }

      const insertResponse = await supabase.from("assets").insert([payload]).select().single();
      if (insertResponse.error) {
        continue;
      }

      await supabase.from("asset_register_extensions").upsert([
        {
          asset_id: insertResponse.data.id,
          vendor: String(row.vendor || "").trim() || null,
          department: String(row.department || "").trim() || null,
          location: String(row.location || "").trim() || null,
          asset_condition: String(row.condition || row.asset_condition || "").trim() || null,
          remarks: String(row.remarks || "").trim() || null,
          barcode_value: String(row.barcode || payload.asset_tag).trim() || null,
        },
      ]);

      imported += 1;
    }

    await loadData();
    showToast(`Imported ${imported} assets.`);
  };

  const exportExcel = () => {
    const rows = filteredAssets.map((asset) => {
      const extra = extensions[asset.id];
      const assignedUser = employees.find((employee) => employee.id === asset.currently_assigned_to)?.full_name || "";
      return {
        asset_id: asset.asset_tag,
        asset_name: asset.asset_name,
        category: asset.category || "",
        brand: asset.brand || "",
        model: asset.model || "",
        serial_number: asset.serial_number || "",
        vendor: extra?.vendor || "",
        purchase_date: asset.purchase_date || "",
        purchase_cost: asset.purchase_cost || "",
        warranty_expiry: asset.warranty_expiry || "",
        department: extra?.department || "",
        assigned_user: assignedUser,
        location: extra?.location || "",
        status: asset.status || "",
        condition: extra?.asset_condition || "",
        barcode: extra?.barcode_value || asset.asset_tag,
        remarks: extra?.remarks || "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "OfficeAssets");
    XLSX.writeFile(workbook, "office-asset-register.xlsx");
    showToast("Excel export generated.");
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Office Asset Register", 14, 16);
    doc.setFontSize(9);

    filteredAssets.slice(0, 30).forEach((asset, index) => {
      const extra = extensions[asset.id];
      const y = 28 + index * 8;
      doc.text(`${index + 1}. ${asset.asset_name} | ${asset.asset_tag} | ${asset.category || ""} | ${asset.status || ""} | ${extra?.location || ""}`, 14, y);
    });

    doc.save("office-asset-register.pdf");
    showToast("PDF export generated.");
  };

  if (loading) {
    return <div style={styles.loading}>Loading office asset register...</div>;
  }

  return (
    <div style={styles.page}>
      <OfficeAssetModuleNav />

      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Asset Register</p>
          <h2 style={styles.title}>Office Asset Registry</h2>
          <p style={styles.subtitle}>Create, edit, duplicate, import, export, and track enterprise asset metadata with QR and barcode labels.</p>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.primaryButton} onClick={openCreate}>Create Asset</button>
          <label style={styles.secondaryButton}>
            Bulk Import
            <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={(event) => void importFile(event.target.files?.[0] || null)} />
          </label>
          <button style={styles.secondaryButton} onClick={exportExcel}>Export Excel</button>
          <button style={styles.secondaryButton} onClick={exportPdf}>Export PDF</button>
        </div>
      </section>

      <section style={styles.card}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by asset ID, name, category, serial, vendor, department, location, assigned user"
          style={styles.input}
        />

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Asset ID</th>
                <th style={styles.th}>QR</th>
                <th style={styles.th}>Barcode</th>
                <th style={styles.th}>Asset Name</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Brand/Model</th>
                <th style={styles.th}>Serial</th>
                <th style={styles.th}>Vendor</th>
                <th style={styles.th}>Purchase</th>
                <th style={styles.th}>Warranty</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Assigned User</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Condition</th>
                <th style={styles.th}>Photo</th>
                <th style={styles.th}>Invoice</th>
                <th style={styles.th}>Remarks</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={19} style={styles.emptyCell}>No assets found.</td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const extra = extensions[asset.id];
                  const assigned = employees.find((employee) => employee.id === asset.currently_assigned_to)?.full_name || "-";

                  return (
                    <tr key={asset.id}>
                      <td style={styles.td}>{asset.asset_tag}</td>
                      <td style={styles.td}><QRCodeSVG value={`office-asset:${asset.asset_tag}`} size={42} /></td>
                      <td style={styles.td}><BarcodeLabel value={extra?.barcode_value || asset.asset_tag} /></td>
                      <td style={styles.td}>{asset.asset_name}</td>
                      <td style={styles.td}>{asset.category || "-"}</td>
                      <td style={styles.td}>{[asset.brand, asset.model].filter(Boolean).join(" / ") || "-"}</td>
                      <td style={styles.td}>{asset.serial_number || "-"}</td>
                      <td style={styles.td}>{extra?.vendor || "-"}</td>
                      <td style={styles.td}>{asset.purchase_date ? `${new Date(asset.purchase_date).toLocaleDateString()}\n$${Number(asset.purchase_cost || 0).toLocaleString()}` : "-"}</td>
                      <td style={styles.td}>{asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString() : "-"}</td>
                      <td style={styles.td}>{extra?.department || "-"}</td>
                      <td style={styles.td}>{assigned}</td>
                      <td style={styles.td}>{extra?.location || "-"}</td>
                      <td style={styles.td}>{asset.status || "-"}</td>
                      <td style={styles.td}>{extra?.asset_condition || "-"}</td>
                      <td style={styles.td}>{extra?.photo_url ? <a href={extra.photo_url} target="_blank" rel="noreferrer" style={styles.link}>View</a> : "-"}</td>
                      <td style={styles.td}>{extra?.invoice_url ? <a href={extra.invoice_url} target="_blank" rel="noreferrer" style={styles.link}>View</a> : "-"}</td>
                      <td style={styles.td}>{extra?.remarks || "-"}</td>
                      <td style={styles.td}>
                        <div style={styles.actionsColumn}>
                          <button style={styles.actionButton} onClick={() => openEdit(asset)}>Edit</button>
                          <button style={styles.actionButton} onClick={() => void duplicateAsset(asset)}>Duplicate</button>
                          <button style={styles.actionDangerButton} onClick={() => void deleteAsset(asset)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>{editingAssetId ? "Edit Asset" : "Create Asset"}</h3>
            <div style={styles.formGrid}>
              <input value={form.asset_name} onChange={(event) => setForm((prev) => ({ ...prev, asset_name: event.target.value }))} placeholder="Asset Name" style={styles.input} />
              <input value={form.asset_tag} onChange={(event) => setForm((prev) => ({ ...prev, asset_tag: event.target.value }))} placeholder="Asset ID" style={styles.input} />
              <input value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} placeholder="Category" style={styles.input} />
              <input value={form.brand} onChange={(event) => setForm((prev) => ({ ...prev, brand: event.target.value }))} placeholder="Brand" style={styles.input} />
              <input value={form.model} onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))} placeholder="Model" style={styles.input} />
              <input value={form.serial_number} onChange={(event) => setForm((prev) => ({ ...prev, serial_number: event.target.value }))} placeholder="Serial Number" style={styles.input} />
              <input type="date" value={form.purchase_date} onChange={(event) => setForm((prev) => ({ ...prev, purchase_date: event.target.value }))} style={styles.input} />
              <input type="number" value={form.purchase_cost} onChange={(event) => setForm((prev) => ({ ...prev, purchase_cost: event.target.value }))} placeholder="Purchase Cost" style={styles.input} />
              <input type="date" value={form.warranty_expiry} onChange={(event) => setForm((prev) => ({ ...prev, warranty_expiry: event.target.value }))} style={styles.input} />
              <input value={form.department} onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))} placeholder="Department" style={styles.input} />
              <select value={form.assigned_user} onChange={(event) => setForm((prev) => ({ ...prev, assigned_user: event.target.value }))} style={styles.input}>
                <option value="">Assigned User</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                ))}
              </select>
              <input value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} placeholder="Location" style={styles.input} />
              <input value={form.vendor} onChange={(event) => setForm((prev) => ({ ...prev, vendor: event.target.value }))} placeholder="Vendor" style={styles.input} />
              <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} style={styles.input}>
                <option value="Available">Available</option>
                <option value="Assigned">Assigned</option>
                <option value="In Maintenance">In Maintenance</option>
                <option value="Under Repair">Under Repair</option>
                <option value="Retired">Retired</option>
              </select>
              <select value={form.asset_condition} onChange={(event) => setForm((prev) => ({ ...prev, asset_condition: event.target.value }))} style={styles.input}>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
              <label style={styles.fileLabel}>
                Asset Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
                  style={styles.input}
                />
              </label>
              <label style={styles.fileLabel}>
                Invoice Upload
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => setInvoiceFile(event.target.files?.[0] || null)}
                  style={styles.input}
                />
              </label>
              <textarea value={form.remarks} onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))} placeholder="Remarks" style={{ ...styles.input, minHeight: 90, gridColumn: "1 / -1" }} />
            </div>
            <div style={styles.modalActions}>
              <button style={styles.secondaryButton} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={styles.primaryButton} disabled={saving} onClick={() => void saveAsset()}>{saving ? "Saving..." : "Save Asset"}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 14 },
  loading: { minHeight: 220, background: "white", borderRadius: 12, border: "1px solid #e2e8f0", display: "grid", placeItems: "center", color: "#0f172a", fontWeight: 700 },
  header: { background: "white", borderRadius: 14, border: "1px solid #dbeafe", padding: 16, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  eyebrow: { margin: 0, color: "#0369a1", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" },
  title: { margin: "6px 0", color: "#0f172a", fontSize: 26, fontWeight: 900 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 760 },
  headerActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  card: { background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 12, display: "grid", gap: 10 },
  input: { width: "100%", borderRadius: 10, border: "1px solid #cbd5e1", padding: "10px 12px", fontSize: 13, background: "white" },
  fileLabel: { display: "grid", gap: 6, color: "#334155", fontWeight: 700, fontSize: 13 },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 2200 },
  th: { textAlign: "left", padding: 10, background: "#f8fafc", fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" },
  td: { padding: 10, borderTop: "1px solid #e2e8f0", verticalAlign: "top", color: "#0f172a", fontSize: 12, whiteSpace: "pre-line" },
  emptyCell: { textAlign: "center", padding: 20, color: "#64748b" },
  actionsColumn: { display: "grid", gap: 6 },
  actionButton: { border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", color: "#0f172a", padding: "6px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  actionDangerButton: { border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", padding: "6px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  link: { color: "#1d4ed8", fontWeight: 700, textDecoration: "none" },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(2, 6, 23, 0.45)", display: "grid", placeItems: "center", zIndex: 1000 },
  modalCard: { width: "min(1120px, 96vw)", maxHeight: "90vh", overflowY: "auto", background: "white", borderRadius: 14, border: "1px solid #dbeafe", padding: 16, display: "grid", gap: 10 },
  modalTitle: { margin: 0, color: "#0f172a", fontSize: 20, fontWeight: 900 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 8 },
  primaryButton: { border: "none", borderRadius: 10, background: "#2563eb", color: "white", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  secondaryButton: { border: "1px solid #cbd5e1", borderRadius: 10, background: "#f8fafc", color: "#0f172a", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  toast: { position: "fixed", right: 16, bottom: 16, background: "#0f172a", color: "white", borderRadius: 10, padding: "10px 14px", fontWeight: 700, fontSize: 13 },
};
