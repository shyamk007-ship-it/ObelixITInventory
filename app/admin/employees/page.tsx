"use client";

import { ChangeEvent, DragEvent, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabase";
import { createAuditLog, buildAuditDescription } from "../../lib/audit";
import { getUserProfile } from "../../lib/rbac";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
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
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading employees:", error);
      return;
    }

    setEmployees(data || []);
  };

  const createEmployee = async () => {
    if (!fullName || !email) {
      alert("Please fill all required fields");
      return;
    }

    const { data, error } = await supabase.from("employees").insert([
      {
        full_name: fullName,
        email,
        department,
        position,
        role: "employee",
      },
    ]).select();

    if (error) {
      alert(error.message);
      return;
    }

    const profile = await getUserProfile();
    await createAuditLog({
      action: "Created Employee",
      description: buildAuditDescription({
        event: "Created Employee",
        userName: profile?.full_name || "Unknown User",
        recordType: "employee",
        recordId: data?.[0]?.id,
        itemName: fullName,
      }),
    });

    alert("Employee Added ✅");
    setFullName("");
    setEmail("");
    setDepartment("");
    setPosition("");

    loadEmployees();
  };

  const deleteEmployee = async (id: number, name: string) => {
    const confirmDelete = confirm("Delete employee?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }

    const profile = await getUserProfile();
    await createAuditLog({
      action: "Deleted Employee",
      description: buildAuditDescription({
        event: "Deleted Employee",
        userName: profile?.full_name || "Unknown User",
        recordType: "employee",
        recordId: id,
        itemName: name,
      }),
    });

    loadEmployees();
  };

  const requiredEmployeeColumns = [
    "name",
    "email",
    "department",
    "designation",
    "role",
  ];

  const normalizeKey = (value: any) => String(value ?? "").trim().toLowerCase();

  const findRawKey = (row: Record<string, any>, field: string) =>
    Object.keys(row).find((key) => normalizeKey(key) === field);

  const buildEmployeeImportPreview = async (file: File) => {
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
      const missingColumns = requiredEmployeeColumns.filter(
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
          const values = requiredEmployeeColumns.reduce(
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

      const seenEmails = new Set<string>();
      const duplicatesInFile = new Set<string>();
      parsedRows.forEach((row) => {
        const emailValue = row.values.email.toLowerCase();
        if (!emailValue) return;
        if (seenEmails.has(emailValue)) {
          duplicatesInFile.add(emailValue);
        } else {
          seenEmails.add(emailValue);
        }
      });

      const existingEmailResponse =
        seenEmails.size > 0
          ? await supabase
              .from("employees")
              .select("email")
              .in("email", Array.from(seenEmails))
          : { data: [], error: null };

      const existingEmails = new Set(
        existingEmailResponse.data?.map((employee: any) =>
          String(employee.email).toLowerCase()
        ) || []
      );

      const previewRows = parsedRows.map((row) => {
        const errors: string[] = [];

        requiredEmployeeColumns.forEach((field) => {
          if (!row.values[field]) {
            errors.push(`${field} is required.`);
          }
        });

        const emailValue = row.values.email.toLowerCase();
        if (emailValue && existingEmails.has(emailValue)) {
          errors.push("Email already exists.");
        }

        if (emailValue && duplicatesInFile.has(emailValue)) {
          errors.push("Duplicate email detected in file.");
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

  const handleEmployeeFileSelection = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await buildEmployeeImportPreview(file);
    }
  };

  const handleEmployeeDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await buildEmployeeImportPreview(file);
    }
  };

  const clearEmployeeImportPreview = () => {
    setImportPreviewRows([]);
    setImportErrors([]);
    setImportMessage("");
    setImportSummary({ valid: 0, invalid: 0, skipped: 0 });
  };

  const saveEmployeeImport = async () => {
    const validRows = importPreviewRows
      .filter((row) => row.valid)
      .map((row) => ({
        full_name: row.values.name,
        email: row.values.email,
        department: row.values.department,
        position: row.values.designation,
        role: row.values.role,
      }));

    if (!validRows.length) {
      alert("There are no valid rows to import.");
      return;
    }

    setImportLoading(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .insert(validRows)
        .select("id,full_name");

      if (error) {
        alert(error.message);
        return;
      }

      const profile = await getUserProfile();
      await createAuditLog({
        action: "Bulk Imported Employees",
        description: buildAuditDescription({
          event: "Imported employees from Excel",
          userName: profile?.full_name || "Unknown User",
          recordType: "employee",
          recordId: "bulk",
          itemName: `${data?.length || 0} employees imported`,
        }),
      });

      await loadEmployees();
      clearEmployeeImportPreview();
      setShowImportModal(false);
      alert(`Successfully imported ${data?.length || 0} employees.`);
    } catch (error: any) {
      alert(error?.message || "Import failed.");
    } finally {
      setImportLoading(false);
    }
  };

  const downloadEmployeeTemplate = () => {
    const sampleRow = [
      {
        name: "Jane Doe",
        email: "jane.doe@example.com",
        department: "IT",
        designation: "Support Engineer",
        role: "employee",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRow, {
      header: requiredEmployeeColumns,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "employee-import-template.xlsx");
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

  const exportEmployeesToExcel = async () => {
    setExportLoading(true);
    try {
      let query = supabase
        .from("employees")
        .select("id,full_name,email,department,position,role,created_at");
      query = buildDateFilteredQuery(query);
      const { data, error } = await query;
      if (error) {
        alert(error.message);
        return;
      }
      exportToExcel("Employees", data || [], "employees-export.xlsx");
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

  const clearEmployeeImportModal = () => {
    clearEmployeeImportPreview();
    setShowImportModal(false);
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1>Employees</h1>
          <p style={styles.subtitle}>
            Upload employee records, preview validation, and export Excel data.
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
          <button onClick={exportEmployeesToExcel} style={styles.secondaryButton}>
            Export Employees
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
                <h2>Import Employees</h2>
                <p style={styles.modalSubtitle}>
                  Upload an Excel or CSV file and validate employee rows.
                </p>
              </div>
              <button
                type="button"
                onClick={clearEmployeeImportModal}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <div
                style={styles.uploadArea}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleEmployeeDrop}
              >
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleEmployeeFileSelection}
                  style={styles.fileInput}
                />
                <p>Drag and drop your file here, or click to browse.</p>
                <small>
                  Required columns: name, email, department, designation, role
                </small>
              </div>

              <div style={styles.modalControls}>
                <button
                  type="button"
                  onClick={downloadEmployeeTemplate}
                  style={styles.secondaryButton}
                >
                  Download Sample Template
                </button>
                <button
                  type="button"
                  onClick={clearEmployeeImportPreview}
                  style={styles.secondaryButton}
                >
                  Clear Preview
                </button>
                <button
                  type="button"
                  disabled={importLoading || !importPreviewRows.some((row) => row.valid)}
                  onClick={saveEmployeeImport}
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
                  <span>Duplicate emails skipped: {importSummary.skipped}</span>
                </div>
              )}

              {importPreviewRows.length > 0 && (
                <div style={styles.previewTable}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Row</th>
                        <th style={styles.th}>Name</th>
                        <th style={styles.th}>Email</th>
                        <th style={styles.th}>Department</th>
                        <th style={styles.th}>Designation</th>
                        <th style={styles.th}>Role</th>
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
                          <td style={styles.td}>{row.values.name}</td>
                          <td style={styles.td}>{row.values.email}</td>
                          <td style={styles.td}>{row.values.department}</td>
                          <td style={styles.td}>{row.values.designation}</td>
                          <td style={styles.td}>{row.values.role}</td>
                          <td style={styles.td}>{row.errors.join(" ")}</td>
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
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          style={styles.input}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={styles.input}
        />
        <input
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="Department"
          style={styles.input}
        />
        <input
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Position"
          style={styles.input}
        />
        <button type="button" onClick={createEmployee} style={styles.button}>
          Add Employee
        </button>
      </div>

      <div style={styles.grid}>
        {filteredEmployees.map((employee) => (
          <div key={employee.id} style={styles.card}>
            <div style={styles.avatar}>
              {employee.full_name?.charAt(0) || "?"}
            </div>
            <h3>{employee.full_name}</h3>
            <p>{employee.email}</p>
            <p>{employee.department}</p>
            <p>{employee.position}</p>
            <button
              type="button"
              style={styles.delete}
              onClick={() => deleteEmployee(employee.id, employee.full_name)}
            >
              Delete
            </button>
          </div>
        ))}
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
    flexWrap: "wrap",
    gap: 12,
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 20,
  },
  card: {
    background: "white",
    padding: 20,
    borderRadius: 14,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "#2563eb",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
  },
  delete: {
    marginTop: 15,
    padding: "10px 14px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: 8,
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