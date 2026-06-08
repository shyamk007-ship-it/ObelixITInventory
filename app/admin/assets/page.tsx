"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabase";
import { createAuditLog, buildAuditDescription } from "../../lib/audit";
import { getUserProfile } from "../../lib/rbac";

interface Asset {
  id: number;
  asset_name: string;
  asset_tag: string;
  category?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  status?: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState<any[]>([]);
  const [importSummary, setImportSummary] = useState({ valid: 0, invalid: 0, skipped: 0 });
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const { data, error } = await supabase
        .from("assets")
        .select("*");

      if (error) {
        console.error(error);
        return;
      }

      setAssets(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const createAsset = async () => {
    if (!assetName || !assetTag) {
      alert("Asset name and tag required");
      return;
    }

    const { data, error } = await supabase.from("assets").insert([
      {
        asset_name: assetName,
        asset_tag: assetTag,
        category,
        brand,
        model,
        serial_number: serialNumber,
        status: "Available",
      },
    ]).select();

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    const profile = await getUserProfile();
    await createAuditLog({
      action: "Created Asset",
      description: buildAuditDescription({
        event: "Created Asset",
        userName: profile?.full_name || "Unknown User",
        recordType: "asset",
        recordId: data?.[0]?.id,
        itemName: assetName,
      }),
    });

    setAssetName("");
    setAssetTag("");
    setCategory("");
    setBrand("");
    setModel("");
    setSerialNumber("");

    await loadAssets();
    alert("Asset Added");
  };

  const deleteAsset = async (id: number, name: string) => {
    const confirmDelete = confirm("Delete this asset?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }

    const profile = await getUserProfile();
    await createAuditLog({
      action: "Deleted Asset",
      description: buildAuditDescription({
        event: "Deleted Asset",
        userName: profile?.full_name || "Unknown User",
        recordType: "asset",
        recordId: id,
        itemName: name,
      }),
    });

    await loadAssets();
  };

  const requiredAssetColumns = [
    "asset_name",
    "asset_tag",
    "category",
    "brand",
    "model",
    "serial_number",
    "status",
  ];

  const normalizeKey = (value: any) => String(value ?? "").trim().toLowerCase();

  const findRawKey = (row: Record<string, any>, field: string) =>
    Object.keys(row).find((key) => normalizeKey(key) === field);

  const buildImportPreview = async (file: File) => {
    setImportLoading(true);
    setImportErrors([]);
    setImportMessage("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      if (!workbook.SheetNames.length) {
        setImportErrors(["Workbook contains no sheets."]);
        return;
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
        defval: "",
      });

      if (!rawRows.length) {
        setImportErrors(["The selected sheet is empty."]);
        return;
      }

      const headers = Object.keys(rawRows[0]).map((key) => normalizeKey(key));
      const missingColumns = requiredAssetColumns.filter(
        (field) => !headers.includes(field)
      );

      if (missingColumns.length) {
        setImportErrors([
          `Missing required columns: ${missingColumns.join(", ")}`,
          "Download the sample template and try again.",
        ]);
        return;
      }

      const parsedRows = rawRows
        .map((row, index) => {
          const values = requiredAssetColumns.reduce(
            (acc, field) => {
              const rawKey = findRawKey(row, field);
              acc[field] = String(rawKey ? row[rawKey] : "").trim();
              return acc;
            },
            {} as Record<string, string>
          );

          return {
            rowNumber: index + 2,
            values,
          };
        })
        .filter(
          (row) =>
            Object.values(row.values).some((value) => String(value).trim() !== "")
        );

      const seenTags = new Set<string>();
      const duplicatesInFile = new Set<string>();
      parsedRows.forEach((row) => {
        const tag = row.values.asset_tag;
        if (!tag) return;
        if (seenTags.has(tag)) {
          duplicatesInFile.add(tag);
        } else {
          seenTags.add(tag);
        }
      });

      const existingTagResponse =
        seenTags.size > 0
          ? await supabase
              .from("assets")
              .select("asset_tag")
              .in("asset_tag", Array.from(seenTags))
          : { data: [], error: null };

      const existingTags = new Set(
        existingTagResponse.data?.map((asset: any) => asset.asset_tag) || []
      );

      const previewRows = parsedRows.map((row) => {
        const errors: string[] = [];
        requiredAssetColumns.forEach((field) => {
          if (!row.values[field]) {
            errors.push(`${field} is required.`);
          }
        });

        if (row.values.asset_tag && existingTags.has(row.values.asset_tag)) {
          errors.push("Asset tag already exists.");
        }

        if (
          row.values.asset_tag &&
          duplicatesInFile.has(row.values.asset_tag)
        ) {
          errors.push("Duplicate asset tag detected in file.");
        }

        return {
          ...row,
          valid: errors.length === 0,
          errors,
        };
      });

      const validCount = previewRows.filter((row) => row.valid).length;
      const invalidCount = previewRows.length - validCount;

      setImportPreviewRows(previewRows);
      setImportSummary({
        valid: validCount,
        invalid: invalidCount,
        skipped: duplicatesInFile.size,
      });
      setImportMessage(
        `Previewing ${previewRows.length} rows: ${validCount} valid, ${invalidCount} invalid.`
      );
    } catch (error: any) {
      setImportErrors([error?.message || "Unable to parse the selected file."]);
    } finally {
      setImportLoading(false);
    }
  };

  const handleAssetFileSelection = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await buildImportPreview(file);
    }
  };

  const handleAssetDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await buildImportPreview(file);
    }
  };

  const clearAssetImportPreview = () => {
    setImportPreviewRows([]);
    setImportErrors([]);
    setImportMessage("");
    setImportSummary({ valid: 0, invalid: 0, skipped: 0 });
  };

  const saveAssetImport = async () => {
    const validRows = importPreviewRows
      .filter((row) => row.valid)
      .map((row) => ({
        asset_name: row.values.asset_name,
        asset_tag: row.values.asset_tag,
        category: row.values.category,
        brand: row.values.brand,
        model: row.values.model,
        serial_number: row.values.serial_number,
        status: row.values.status,
      }));

    if (!validRows.length) {
      alert("There are no valid rows to import.");
      return;
    }

    setImportLoading(true);
    try {
      const { data, error } = await supabase
        .from("assets")
        .insert(validRows)
        .select("id,asset_name");

      if (error) {
        alert(error.message);
        return;
      }

      const profile = await getUserProfile();
      await createAuditLog({
        action: "Bulk Imported Assets",
        description: buildAuditDescription({
          event: "Imported assets from Excel",
          userName: profile?.full_name || "Unknown User",
          recordType: "asset",
          recordId: "bulk",
          itemName: `${data?.length || 0} assets imported`,
        }),
      });

      await loadAssets();
      clearAssetImportPreview();
      setShowImportModal(false);
      alert(`Successfully imported ${data?.length || 0} assets.`);
    } catch (error: any) {
      alert(error?.message || "Import failed.");
    } finally {
      setImportLoading(false);
    }
  };

  const downloadAssetTemplate = () => {
    const sampleRow = [
      {
        asset_name: "Laptop",
        asset_tag: "ASSET-001",
        category: "Hardware",
        brand: "Dell",
        model: "Latitude 7420",
        serial_number: "SN123456",
        status: "Available",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRow, {
      header: requiredAssetColumns,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");
    XLSX.writeFile(workbook, "asset-import-template.xlsx");
  };

  const exportToExcel = (sheetName: string, data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  };

  const buildDateFilteredQuery = (query: any) => {
    if (exportFrom) {
      query = query.gte("created_at", `${exportFrom}T00:00:00Z`);
    }
    if (exportTo) {
      query = query.lte("created_at", `${exportTo}T23:59:59Z`);
    }
    return query;
  };

  const exportAssetsToExcel = async () => {
    setExportLoading(true);
    try {
      let query = supabase
        .from("assets")
        .select(
          "id,asset_name,asset_tag,category,brand,model,serial_number,status,created_at"
        );
      query = buildDateFilteredQuery(query);
      const { data, error } = await query;
      if (error) {
        alert(error.message);
        return;
      }
      exportToExcel("Assets", data || [], "assets-export.xlsx");
    } catch (error: any) {
      alert(error?.message || "Export failed.");
    } finally {
      setExportLoading(false);
    }
  };

  const exportTicketsToExcel = async () => {
    setExportLoading(true);
    try {
      let query = supabase
        .from("tickets")
        .select("id,title,category,priority,status,created_at");
      query = buildDateFilteredQuery(query);
      const { data, error } = await query;
      if (error) {
        alert(error.message);
        return;
      }
      exportToExcel("Tickets", data || [], "tickets-export.xlsx");
    } catch (error: any) {
      alert(error?.message || "Export failed.");
    } finally {
      setExportLoading(false);
    }
  };

  const clearImportModal = () => {
    clearAssetImportPreview();
    setShowImportModal(false);
  };

  const filteredAssets = useMemo(
    () =>
      assets.filter((asset) =>
        asset.asset_name?.toLowerCase().includes(search.toLowerCase())
      ),
    [assets, search]
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1>Assets</h1>
          <p style={styles.subtitle}>
            Import or export asset records with Excel and CSV upload support.
          </p>
        </div>
        <div style={styles.headerActions}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              From
              <input
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
                style={styles.dateInput}
              />
            </label>
            <label style={styles.filterLabel}>
              To
              <input
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
                style={styles.dateInput}
              />
            </label>
          </div>
          <button onClick={exportAssetsToExcel} style={styles.secondaryButton}>
            Export Assets
          </button>
          <button onClick={exportTicketsToExcel} style={styles.secondaryButton}>
            Export Tickets
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            style={styles.button}
          >
            Import
          </button>
        </div>
      </div>

      {showImportModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h2>Import Assets</h2>
                <p style={styles.modalSubtitle}>
                  Upload an Excel or CSV file and preview rows before saving.
                </p>
              </div>
              <button
                type="button"
                onClick={clearImportModal}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <div
                style={styles.uploadArea}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleAssetDrop}
              >
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleAssetFileSelection}
                  style={styles.fileInput}
                />
                <p>Drag and drop your file here, or click to browse.</p>
                <small>
                  Required columns: asset_name, asset_tag, category, brand,
                  model, serial_number, status
                </small>
              </div>

              <div style={styles.modalControls}>
                <button
                  type="button"
                  onClick={downloadAssetTemplate}
                  style={styles.secondaryButton}
                >
                  Download Sample Template
                </button>
                <button
                  type="button"
                  onClick={clearAssetImportPreview}
                  style={styles.secondaryButton}
                >
                  Clear Preview
                </button>
                <button
                  type="button"
                  disabled={importLoading || !importPreviewRows.some((row) => row.valid)}
                  onClick={saveAssetImport}
                  style={styles.button}
                >
                  Save Valid Rows
                </button>
              </div>

              {importLoading && (
                <div style={styles.loadingText}>Processing file, please wait…</div>
              )}

              {importErrors.length > 0 && (
                <div style={styles.errorBox}>
                  {importErrors.map((error, idx) => (
                    <p key={idx} style={styles.errorText}>
                      {error}
                    </p>
                  ))}
                </div>
              )}

              {importMessage && (
                <div style={styles.importNotice}>{importMessage}</div>
              )}

              {importPreviewRows.length > 0 && (
                <div style={styles.previewSummary}>
                  <span>Valid rows: {importSummary.valid}</span>
                  <span>Invalid rows: {importSummary.invalid}</span>
                  <span>Duplicate tags skipped: {importSummary.skipped}</span>
                </div>
              )}

              {importPreviewRows.length > 0 && (
                <div style={styles.previewTable}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Row</th>
                        <th style={styles.th}>Asset Name</th>
                        <th style={styles.th}>Asset Tag</th>
                        <th style={styles.th}>Category</th>
                        <th style={styles.th}>Brand</th>
                        <th style={styles.th}>Model</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreviewRows.slice(0, 20).map((row) => (
                        <tr
                          key={row.rowNumber}
                          style={row.valid ? undefined : styles.invalidRow}
                        >
                          <td style={styles.td}>{row.rowNumber}</td>
                          <td style={styles.td}>{row.values.asset_name}</td>
                          <td style={styles.td}>{row.values.asset_tag}</td>
                          <td style={styles.td}>{row.values.category}</td>
                          <td style={styles.td}>{row.values.brand}</td>
                          <td style={styles.td}>{row.values.model}</td>
                          <td style={styles.td}>{row.values.status}</td>
                          <td style={styles.td}>
                            {row.errors.join(" ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={styles.form}>
        <input
          placeholder="Asset Name"
          value={assetName}
          onChange={(e) => setAssetName(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="Asset Tag"
          value={assetTag}
          onChange={(e) => setAssetTag(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="Brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="Model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="Serial Number"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          style={styles.input}
        />
        <button onClick={createAsset} style={styles.button}>
          Add Asset
        </button>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Asset</th>
              <th style={styles.th}>Tag</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Brand</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map((asset) => (
              <tr key={asset.id}>
                <td style={styles.td}>{asset.asset_name}</td>
                <td style={styles.td}>{asset.asset_tag}</td>
                <td style={styles.td}>{asset.category}</td>
                <td style={styles.td}>{asset.brand}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: 20,
                      background:
                        asset.status === "Assigned"
                          ? "#fee2e2"
                          : "#dcfce7",
                      color:
                        asset.status === "Assigned"
                          ? "#dc2626"
                          : "#16a34a",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    {asset.status}
                  </span>
                </td>
                <td style={styles.td}>
                  <button
                    style={styles.delete}
                    onClick={() => deleteAsset(asset.id, asset.asset_name)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: any = {
  container: {
    padding: 30,
    background: "#f1f5f9",
    minHeight: "100vh",
    fontFamily: "Arial",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  search: {
    padding: 12,
    width: 260,
    borderRadius: 8,
    border: "1px solid #d1d5db",
  },
  form: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 30,
    background: "white",
    padding: 20,
    borderRadius: 14,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    border: "1px solid #d1d5db",
  },
  button: {
    padding: 12,
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },
  tableWrap: {
    overflowX: "auto",
    background: "white",
    borderRadius: 14,
    padding: 20,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: 14,
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: 14,
    borderBottom: "1px solid #f1f5f9",
  },
  delete: {
    padding: "8px 14px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  subtitle: {
    margin: 0,
    color: "#475569",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  filterGroup: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  filterLabel: {
    display: "grid",
    gap: 6,
    fontSize: 12,
    color: "#334155",
  },
  dateInput: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    minWidth: 150,
  },
  secondaryButton: {
    padding: 12,
    background: "#1d4ed8",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 1000,
  },
  modal: {
    width: "100%",
    maxWidth: 980,
    background: "white",
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: "0 40px 100px rgba(15, 23, 42, 0.2)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 28px",
    borderBottom: "1px solid #e2e8f0",
  },
  modalSubtitle: {
    margin: "8px 0 0",
    color: "#475569",
    fontSize: 14,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    border: "none",
    background: "#e2e8f0",
    color: "#334155",
    fontSize: 24,
    cursor: "pointer",
  },
  modalBody: {
    padding: 24,
    display: "grid",
    gap: 18,
  },
  uploadArea: {
    minHeight: 170,
    border: "2px dashed #cbd5e1",
    borderRadius: 18,
    background: "#f8fafc",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    padding: 24,
    position: "relative",
  },
  fileInput: {
    position: "absolute",
    inset: 0,
    opacity: 0,
    width: "100%",
    height: "100%",
    cursor: "pointer",
  },
  modalControls: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  loadingText: {
    padding: 14,
    background: "#eff6ff",
    borderRadius: 12,
    color: "#1e40af",
    fontWeight: 600,
  },
  errorBox: {
    background: "#fee2e2",
    borderRadius: 12,
    padding: 16,
    color: "#991b1b",
  },
  errorText: {
    margin: 0,
    fontSize: 14,
  },
  importNotice: {
    padding: 14,
    background: "#e0f2fe",
    borderRadius: 12,
    color: "#0c4a6e",
  },
  previewSummary: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    color: "#334155",
    fontWeight: 600,
  },
  previewTable: {
    overflowX: "auto",
    borderRadius: 14,
    background: "#ffffff",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
  },
  invalidRow: {
    background: "#fef2f2",
  },
};
