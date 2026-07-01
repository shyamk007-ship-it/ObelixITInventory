"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

interface Vessel {
  id: number;
  vessel_name?: string | null;
  imo_number?: string | null;
  call_sign?: string | null;
  vessel_type?: string | null;
  flag?: string | null;
  owner?: string | null;
  manager?: string | null;
  fleet?: string | null;
  captain?: string | null;
  chief_engineer?: string | null;
  internet_provider?: string | null;
  satellite_provider?: string | null;
  starlink_enabled?: boolean | null;
  operating_region?: string | null;
  status?: string | null;
  year_built?: number | null;
  gross_tonnage?: number | null;
  last_it_inspection?: string | null;
  next_it_inspection?: string | null;
  remarks?: string | null;
}

interface VesselFormState {
  vessel_name: string;
  imo_number: string;
  call_sign: string;
  vessel_type: string;
  flag: string;
  owner: string;
  manager: string;
  fleet: string;
  captain: string;
  chief_engineer: string;
  internet_provider: string;
  satellite_provider: string;
  starlink_enabled: boolean;
  operating_region: string;
  status: string;
  year_built: string;
  gross_tonnage: string;
  last_it_inspection: string;
  next_it_inspection: string;
  remarks: string;
}

type ModalMode = "create" | "edit" | "view";
type StatusFilter = "All" | "Active" | "Dry Dock" | "Under Maintenance" | "Out of Service";

const emptyForm = (): VesselFormState => ({
  vessel_name: "",
  imo_number: "",
  call_sign: "",
  vessel_type: "",
  flag: "",
  owner: "",
  manager: "",
  fleet: "",
  captain: "",
  chief_engineer: "",
  internet_provider: "",
  satellite_provider: "",
  starlink_enabled: false,
  operating_region: "",
  status: "Active",
  year_built: "",
  gross_tonnage: "",
  last_it_inspection: "",
  next_it_inspection: "",
  remarks: "",
});

const statusOptions: StatusFilter[] = ["All", "Active", "Dry Dock", "Under Maintenance", "Out of Service"];

const basicFields = [
  { key: "vessel_name", label: "Vessel Name", type: "text" as const },
  { key: "imo_number", label: "IMO Number", type: "text" as const },
  { key: "call_sign", label: "Call Sign", type: "text" as const },
  { key: "vessel_type", label: "Vessel Type", type: "text" as const },
  { key: "flag", label: "Flag", type: "text" as const },
  { key: "owner", label: "Owner", type: "text" as const },
  { key: "manager", label: "Manager", type: "text" as const },
  { key: "fleet", label: "Fleet", type: "text" as const },
  { key: "captain", label: "Captain", type: "text" as const },
  { key: "chief_engineer", label: "Chief Engineer", type: "text" as const },
  { key: "internet_provider", label: "Internet Provider", type: "text" as const },
  { key: "satellite_provider", label: "Satellite Provider", type: "text" as const },
  { key: "operating_region", label: "Operating Region", type: "text" as const },
  { key: "status", label: "Status", type: "select" as const },
  { key: "year_built", label: "Year Built", type: "number" as const },
  { key: "gross_tonnage", label: "Gross Tonnage", type: "number" as const },
  { key: "last_it_inspection", label: "Last IT Inspection", type: "date" as const },
  { key: "next_it_inspection", label: "Next IT Inspection", type: "date" as const },
];

export default function VesselsPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<VesselFormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadVessels();
  }, []);

  const loadVessels = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.from("vessels").select("*");

      if (error) {
        console.error(error);
        setVessels([]);
        return;
      }

      setVessels((data as Vessel[]) || []);
    } catch (error) {
      console.error(error);
      setVessels([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredVessels = useMemo(() => {
    const query = search.trim().toLowerCase();

    return vessels.filter((vessel) => {
      const matchesStatus = statusFilter === "All" || vessel.status === statusFilter;
      const matchesSearch =
        !query ||
        [vessel.vessel_name, vessel.imo_number, vessel.captain, vessel.fleet]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter, vessels]);

  const stats = useMemo(() => {
    const total = vessels.length;
    const active = vessels.filter((vessel) => vessel.status === "Active").length;
    const dryDock = vessels.filter((vessel) => vessel.status === "Dry Dock").length;
    const underMaintenance = vessels.filter((vessel) => vessel.status === "Under Maintenance").length;

    return { total, active, dryDock, underMaintenance };
  }, [vessels]);

  const openCreateModal = () => {
    setForm(emptyForm());
    setEditingId(null);
    setModalMode("create");
    setShowModal(true);
  };

  const openEditModal = (vessel: Vessel) => {
    setEditingId(vessel.id ?? null);
    setModalMode("edit");
    setForm({
      vessel_name: vessel.vessel_name || "",
      imo_number: vessel.imo_number || "",
      call_sign: vessel.call_sign || "",
      vessel_type: vessel.vessel_type || "",
      flag: vessel.flag || "",
      owner: vessel.owner || "",
      manager: vessel.manager || "",
      fleet: vessel.fleet || "",
      captain: vessel.captain || "",
      chief_engineer: vessel.chief_engineer || "",
      internet_provider: vessel.internet_provider || "",
      satellite_provider: vessel.satellite_provider || "",
      starlink_enabled: Boolean(vessel.starlink_enabled),
      operating_region: vessel.operating_region || "",
      status: vessel.status || "Active",
      year_built: vessel.year_built ? String(vessel.year_built) : "",
      gross_tonnage: vessel.gross_tonnage ? String(vessel.gross_tonnage) : "",
      last_it_inspection: vessel.last_it_inspection || "",
      next_it_inspection: vessel.next_it_inspection || "",
      remarks: vessel.remarks || "",
    });
    setShowModal(true);
  };

  const openViewModal = (vessel: Vessel) => {
    setEditingId(vessel.id ?? null);
    setModalMode("view");
    setForm({
      vessel_name: vessel.vessel_name || "",
      imo_number: vessel.imo_number || "",
      call_sign: vessel.call_sign || "",
      vessel_type: vessel.vessel_type || "",
      flag: vessel.flag || "",
      owner: vessel.owner || "",
      manager: vessel.manager || "",
      fleet: vessel.fleet || "",
      captain: vessel.captain || "",
      chief_engineer: vessel.chief_engineer || "",
      internet_provider: vessel.internet_provider || "",
      satellite_provider: vessel.satellite_provider || "",
      starlink_enabled: Boolean(vessel.starlink_enabled),
      operating_region: vessel.operating_region || "",
      status: vessel.status || "Active",
      year_built: vessel.year_built ? String(vessel.year_built) : "",
      gross_tonnage: vessel.gross_tonnage ? String(vessel.gross_tonnage) : "",
      last_it_inspection: vessel.last_it_inspection || "",
      next_it_inspection: vessel.next_it_inspection || "",
      remarks: vessel.remarks || "",
    });
    setShowModal(true);
  };

  const handleChange = (field: keyof VesselFormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.vessel_name || !form.imo_number) {
      alert("Vessel name and IMO number are required.");
      return;
    }

    setSubmitting(true);

    const payload = {
      vessel_name: form.vessel_name,
      imo_number: form.imo_number,
      call_sign: form.call_sign || null,
      vessel_type: form.vessel_type || null,
      flag: form.flag || null,
      owner: form.owner || null,
      manager: form.manager || null,
      fleet: form.fleet || null,
      captain: form.captain || null,
      chief_engineer: form.chief_engineer || null,
      internet_provider: form.internet_provider || null,
      satellite_provider: form.satellite_provider || null,
      starlink_enabled: form.starlink_enabled,
      operating_region: form.operating_region || null,
      status: form.status || "Active",
      year_built: form.year_built ? Number(form.year_built) : null,
      gross_tonnage: form.gross_tonnage ? Number(form.gross_tonnage) : null,
      last_it_inspection: form.last_it_inspection || null,
      next_it_inspection: form.next_it_inspection || null,
      remarks: form.remarks || null,
    };

    try {
      if (modalMode === "edit" && editingId) {
        const { error } = await supabase.from("vessels").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vessels").insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      await loadVessels();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Unable to save vessel.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (vessel: Vessel) => {
    const confirmed = window.confirm(`Delete ${vessel.vessel_name || "this vessel"}?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("vessels").delete().eq("id", vessel.id);
      if (error) throw error;
      await loadVessels();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Unable to delete vessel.");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Fleet Operations</p>
          <h1 style={styles.title}>Vessel Management</h1>
          <p style={styles.subtitle}>Monitor fleet readiness, inspection dates, and vessel status in one place.</p>
        </div>
        <button style={styles.primaryButton} onClick={openCreateModal}>
          + Add Vessel
        </button>
      </div>

      <div style={styles.kpiGrid}>
        <KpiCard label="Total Vessels" value={stats.total} />
        <KpiCard label="Active Vessels" value={stats.active} />
        <KpiCard label="Dry Dock" value={stats.dryDock} />
        <KpiCard label="Under Maintenance" value={stats.underMaintenance} />
      </div>

      <div style={styles.card}>
        <div style={styles.toolbar}>
          <input
            style={styles.input}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by vessel name, IMO, captain, or fleet"
          />
          <select style={styles.select} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={styles.spinnerWrap}>
            <div style={styles.spinner} />
            <span style={styles.spinnerText}>Loading vessels…</span>
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Vessel Name</th>
                  <th style={styles.th}>IMO Number</th>
                  <th style={styles.th}>Vessel Type</th>
                  <th style={styles.th}>Fleet</th>
                  <th style={styles.th}>Captain</th>
                  <th style={styles.th}>Internet Provider</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Last IT Inspection</th>
                  <th style={styles.th}>Next IT Inspection</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVessels.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={styles.emptyState}>
                      No vessels found for the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredVessels.map((vessel) => (
                    <tr key={vessel.id} style={styles.row}>
                      <td style={styles.td}>{vessel.vessel_name || "—"}</td>
                      <td style={styles.td}>{vessel.imo_number || "—"}</td>
                      <td style={styles.td}>{vessel.vessel_type || "—"}</td>
                      <td style={styles.td}>{vessel.fleet || "—"}</td>
                      <td style={styles.td}>{vessel.captain || "—"}</td>
                      <td style={styles.td}>{vessel.internet_provider || "—"}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusBadge, ...getStatusStyle(vessel.status || "Active") }}>
                          {vessel.status || "Active"}
                        </span>
                      </td>
                      <td style={styles.td}>{vessel.last_it_inspection || "—"}</td>
                      <td style={styles.td}>{vessel.next_it_inspection || "—"}</td>
                      <td style={styles.td}>
                        <div style={styles.actionsRow}>
                          <button style={styles.ghostButton} onClick={() => openViewModal(vessel)}>
                            View
                          </button>
                          <button style={styles.ghostButton} onClick={() => openEditModal(vessel)}>
                            Edit
                          </button>
                          <button style={styles.deleteButton} onClick={() => handleDelete(vessel)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <p style={styles.eyebrow}>Fleet record</p>
                <h2 style={styles.modalTitle}>{modalMode === "create" ? "Add Vessel" : modalMode === "edit" ? "Edit Vessel" : "Vessel Details"}</h2>
              </div>
              <button style={styles.closeButton} onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.formGrid}>
              {basicFields.map((field) => (
                <div key={field.key} style={styles.fieldGroup}>
                  <label style={styles.label}>{field.label}</label>
                  {field.type === "select" ? (
                    <select
                      style={styles.input}
                      value={form[field.key as keyof VesselFormState] as string}
                      onChange={(event) => handleChange(field.key as keyof VesselFormState, event.target.value)}
                      disabled={modalMode === "view"}
                    >
                      {statusOptions.filter((option) => option !== "All").map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "number" ? (
                    <input
                      style={styles.input}
                      type="number"
                      value={form[field.key as keyof VesselFormState] as string}
                      onChange={(event) => handleChange(field.key as keyof VesselFormState, event.target.value)}
                      disabled={modalMode === "view"}
                    />
                  ) : field.type === "date" ? (
                    <input
                      style={styles.input}
                      type="date"
                      value={form[field.key as keyof VesselFormState] as string}
                      onChange={(event) => handleChange(field.key as keyof VesselFormState, event.target.value)}
                      disabled={modalMode === "view"}
                    />
                  ) : (
                    <input
                      style={styles.input}
                      type="text"
                      value={form[field.key as keyof VesselFormState] as string}
                      onChange={(event) => handleChange(field.key as keyof VesselFormState, event.target.value)}
                      disabled={modalMode === "view"}
                    />
                  )}
                </div>
              ))}

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Starlink Enabled</label>
                <input
                  type="checkbox"
                  checked={form.starlink_enabled}
                  onChange={(event) => handleChange("starlink_enabled", event.target.checked)}
                  disabled={modalMode === "view"}
                />
              </div>

              <div style={{ ...styles.fieldGroup, gridColumn: "1 / -1" }}>
                <label style={styles.label}>Remarks</label>
                <textarea
                  style={{ ...styles.input, minHeight: 96, resize: "vertical" }}
                  value={form.remarks}
                  onChange={(event) => handleChange("remarks", event.target.value)}
                  disabled={modalMode === "view"}
                />
              </div>

              {modalMode !== "view" && (
                <div style={{ ...styles.fieldGroup, gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button type="button" style={styles.secondaryButton} onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.primaryButton} disabled={submitting}>
                    {submitting ? "Saving…" : modalMode === "edit" ? "Save Changes" : "Create Vessel"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.kpiCard}>
      <p style={styles.kpiLabel}>{label}</p>
      <h3 style={styles.kpiValue}>{value}</h3>
    </div>
  );
}

function getStatusStyle(status: string): CSSProperties {
  switch (status) {
    case "Active":
      return { background: "#dbeafe", color: "#1d4ed8" };
    case "Dry Dock":
      return { background: "#fef3c7", color: "#b45309" };
    case "Under Maintenance":
      return { background: "#fce7f3", color: "#be185d" };
    case "Out of Service":
      return { background: "#fee2e2", color: "#b91c1c" };
    default:
      return { background: "#e2e8f0", color: "#334155" };
  }
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f8fbff",
    color: "#0f172a",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  eyebrow: {
    margin: 0,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#2563eb",
  },
  title: {
    margin: "4px 0 4px",
    fontSize: 28,
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    color: "#475569",
    fontSize: 14,
  },
  primaryButton: {
    border: "none",
    background: "linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)",
    color: "white",
    padding: "12px 16px",
    borderRadius: 999,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(37, 99, 235, 0.25)",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "white",
    color: "#0f172a",
    padding: "10px 14px",
    borderRadius: 999,
    fontWeight: 700,
    cursor: "pointer",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    background: "white",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
    border: "1px solid #e2e8f0",
  },
  kpiLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: 13,
    fontWeight: 600,
  },
  kpiValue: {
    margin: "8px 0 0",
    fontSize: 28,
    color: "#0f172a",
  },
  card: {
    background: "white",
    borderRadius: 24,
    padding: 20,
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
    border: "1px solid #e2e8f0",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  input: {
    flex: 1,
    minWidth: 220,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    fontSize: 14,
  },
  select: {
    minWidth: 200,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    fontSize: 14,
  },
  spinnerWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
    color: "#2563eb",
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    border: "3px solid #bfdbfe",
    borderTopColor: "#2563eb",
    animation: "spin 1s linear infinite",
  },
  spinnerText: {
    fontWeight: 600,
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 1020,
  },
  th: {
    textAlign: "left",
    padding: "12px 10px",
    borderBottom: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  td: {
    padding: "12px 10px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: 14,
    color: "#334155",
  },
  row: {
    background: "white",
  },
  actionsRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  ghostButton: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "6px 10px",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },
  deleteButton: {
    border: "none",
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "6px 10px",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },
  emptyState: {
    textAlign: "center",
    padding: 24,
    color: "#64748b",
  },
  statusBadge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    display: "inline-block",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 1000,
  },
  modalCard: {
    background: "white",
    borderRadius: 24,
    width: "min(960px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: 24,
    boxShadow: "0 18px 50px rgba(15, 23, 42, 0.25)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    margin: "4px 0 0",
    fontSize: 22,
  },
  closeButton: {
    border: "none",
    background: "#f1f5f9",
    color: "#334155",
    width: 36,
    height: 36,
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 20,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: "#334155",
  },
};
