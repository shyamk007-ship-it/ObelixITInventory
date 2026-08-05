"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { fetchDocuments, fetchEmployees, safeErrorMessage } from "../../../lib/people";
import { supabase } from "../../../lib/supabase";
import { usePeoplePermissions, useToast } from "../../../hooks/usePeopleModule";
import { PeopleHeader, StatCard } from "../../../components/people";

const docTypes = ["Passport", "PAN", "Aadhaar", "Offer Letter", "NDA", "Certificate", "Contract", "Other"];

export default function PeopleDocumentsPage() {
  const permissions = usePeoplePermissions();
  const { toast, showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Awaited<ReturnType<typeof fetchEmployees>>>([]);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchDocuments>>>([]);
  const [form, setForm] = useState({
    employee_id: "",
    document_type: "Passport",
    document_name: "",
    document_url: "",
    issued_on: "",
    expiry_date: "",
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [employeeRows, documentRows] = await Promise.all([fetchEmployees(), fetchDocuments()]);
      setEmployees(employeeRows);
      setRows(documentRows);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load document records."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const summary = useMemo(() => {
    const byType = new Map<string, number>();
    rows.forEach((row) => {
      byType.set(row.document_type, (byType.get(row.document_type) || 0) + 1);
    });

    const now = Date.now();
    const expiring = rows.filter((row) => row.expiry_date && new Date(row.expiry_date).getTime() - now < 1000 * 60 * 60 * 24 * 45).length;

    return {
      total: rows.length,
      expiring,
      passport: byType.get("Passport") || 0,
      contracts: byType.get("Contract") || 0,
    };
  }, [rows]);

  const createDocument = async () => {
    if (!permissions.canManageDocuments) {
      showToast("You do not have permission to manage employee documents.");
      return;
    }
    if (!form.employee_id || !form.document_name.trim()) {
      showToast("Employee and document name are required.");
      return;
    }

    setSaving(true);
    const response = await supabase.from("office_employee_documents").insert([
      {
        employee_id: Number(form.employee_id),
        document_type: form.document_type,
        document_name: form.document_name.trim(),
        document_url: form.document_url.trim() || null,
        issued_on: form.issued_on || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes.trim() || null,
      },
    ]);
    setSaving(false);

    if (response.error) {
      showToast(`Save failed: ${response.error.message}`);
      return;
    }

    showToast("Document record saved.");
    setForm({ employee_id: "", document_type: "Passport", document_name: "", document_url: "", issued_on: "", expiry_date: "", notes: "" });
    await loadData();
  };

  return (
    <section style={styles.page}>
      <PeopleHeader title="Documents" subtitle="Manage employee documents including identity proofs, contracts, letters, and certifications." />

      <div style={styles.kpis}>
        <StatCard title="Total Documents" value={summary.total} />
        <StatCard title="Expiring Soon" value={summary.expiring} />
        <StatCard title="Passports" value={summary.passport} />
        <StatCard title="Contracts" value={summary.contracts} />
      </div>

      <div style={styles.formCard}>
        <h3 style={styles.sectionTitle}>Add Document</h3>
        <div style={styles.formGrid}>
          <select style={styles.input} value={form.employee_id} onChange={(event) => setForm((prev) => ({ ...prev, employee_id: event.target.value }))}>
            <option value="">Employee</option>
            {employees.map((row) => (
              <option key={row.id} value={String(row.id)}>{row.full_name || `Employee #${row.id}`}</option>
            ))}
          </select>
          <select style={styles.input} value={form.document_type} onChange={(event) => setForm((prev) => ({ ...prev, document_type: event.target.value }))}>
            {docTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input style={styles.input} value={form.document_name} placeholder="Document Name" onChange={(event) => setForm((prev) => ({ ...prev, document_name: event.target.value }))} />
          <input style={styles.input} value={form.document_url} placeholder="Document URL" onChange={(event) => setForm((prev) => ({ ...prev, document_url: event.target.value }))} />
          <input style={styles.input} type="date" value={form.issued_on} onChange={(event) => setForm((prev) => ({ ...prev, issued_on: event.target.value }))} />
          <input style={styles.input} type="date" value={form.expiry_date} onChange={(event) => setForm((prev) => ({ ...prev, expiry_date: event.target.value }))} />
          <input style={styles.inputWide} value={form.notes} placeholder="Notes" onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </div>
        <button type="button" style={styles.buttonPrimary} onClick={() => void createDocument()} disabled={saving}>{saving ? "Saving..." : "Save Document"}</button>
      </div>

      {loading ? <div style={styles.skeleton} /> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
      {!loading && !error && rows.length === 0 ? <div style={styles.empty}>No document records found.</div> : null}

      {!loading && !error && rows.length > 0 ? (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Document</th>
                <th style={styles.th}>Issued</th>
                <th style={styles.th}>Expiry</th>
                <th style={styles.th}>URL</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={styles.td}>{row.employees?.full_name || `Employee #${row.employee_id}`}</td>
                  <td style={styles.td}>{row.document_type}</td>
                  <td style={styles.td}>{row.document_name}</td>
                  <td style={styles.td}>{row.issued_on || "-"}</td>
                  <td style={styles.td}>{row.expiry_date || "-"}</td>
                  <td style={styles.td}>{row.document_url ? <a href={row.document_url} target="_blank" rel="noreferrer" style={styles.link}>Open</a> : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {toast ? <div style={styles.toast}>{toast}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  kpis: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 },
  formCard: { borderRadius: 14, border: "1px solid #dbeafe", background: "#ffffff", padding: 12, display: "grid", gap: 10 },
  sectionTitle: { margin: 0, color: "#0f172a", fontSize: 16, fontWeight: 800 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 },
  input: { border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", fontSize: 13, background: "#fff" },
  inputWide: { border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", fontSize: 13, background: "#fff", gridColumn: "span 4" },
  buttonPrimary: { border: "none", borderRadius: 10, background: "#2563eb", color: "white", fontWeight: 700, padding: "8px 12px", cursor: "pointer" },
  tableWrap: { overflowX: "auto", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 860 },
  th: { textAlign: "left", padding: "10px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", background: "#f8fafc" },
  td: { padding: "10px", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#0f172a" },
  link: { color: "#2563eb", textDecoration: "none", fontWeight: 700 },
  skeleton: { borderRadius: 14, height: 220, background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)", backgroundSize: "200% 100%", animation: "pulse 1.4s ease-in-out infinite" },
  error: { borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: 12, fontWeight: 700 },
  empty: { borderRadius: 12, border: "1px dashed #cbd5e1", padding: 14, color: "#64748b", fontWeight: 600, background: "#ffffff" },
  toast: { position: "fixed", right: 24, bottom: 22, borderRadius: 10, background: "#0f172a", color: "white", padding: "10px 12px", fontSize: 13, fontWeight: 700, zIndex: 2000 },
};
