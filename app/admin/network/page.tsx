"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { supabase } from "../../lib/supabase";
import { createNotificationIfNotExists } from "../../lib/audit";

interface VesselOption {
  id: number;
  vessel_name?: string | null;
}

interface NetworkDevice {
  id: number;
  vessel_id?: number | null;
  device_name?: string | null;
  device_type?: string | null;
  ip_address?: string | null;
  status?: string | null;
  firmware?: string | null;
  last_seen?: string | null;
  internet_speed_mbps?: number | null;
  notes?: string | null;
  vessels?: { vessel_name?: string | null } | null;
}

interface NetworkAlert {
  id: number;
  device_id?: number | null;
  title?: string | null;
  message?: string | null;
  severity?: string | null;
  created_at?: string | null;
  resolved?: boolean | null;
  network_devices?: { device_name?: string | null } | null;
}

interface DeviceFormState {
  vessel_id: string;
  device_name: string;
  device_type: string;
  ip_address: string;
  status: string;
  firmware: string;
  last_seen: string;
  internet_speed_mbps: string;
  notes: string;
}

type ModalMode = "create" | "edit" | "view";
type StatusFilter = "All" | "Online" | "Offline" | "Warning";

const deviceTypes = [
  "Router",
  "Firewall",
  "Switch",
  "Access Point",
  "VSAT",
  "Starlink",
  "Printer",
  "Server",
  "NAS",
  "UPS",
  "CCTV",
  "VoIP",
];

const statusOptions = ["Online", "Warning", "Offline"];
const filterOptions: StatusFilter[] = ["All", "Online", "Offline", "Warning"];

const emptyForm = (): DeviceFormState => ({
  vessel_id: "",
  device_name: "",
  device_type: "Router",
  ip_address: "",
  status: "Online",
  firmware: "",
  last_seen: new Date().toISOString().slice(0, 16),
  internet_speed_mbps: "",
  notes: "",
});

export default function NetworkPage() {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [alerts, setAlerts] = useState<NetworkAlert[]>([]);
  const [vessels, setVessels] = useState<VesselOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedVesselId, setSelectedVesselId] = useState("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DeviceFormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);

    try {
      const [devicesResult, vesselsResult, alertsResult] = await Promise.all([
        supabase.from("network_devices").select("*, vessels(vessel_name)").order("last_seen", { ascending: false }),
        supabase.from("vessels").select("id, vessel_name").order("vessel_name", { ascending: true }),
        supabase.from("network_alerts").select("*, network_devices(device_name)").order("created_at", { ascending: false }).limit(8),
      ]);

      if (!devicesResult.error) {
        setDevices((devicesResult.data as NetworkDevice[]) || []);
      } else {
        console.warn("network_devices unavailable", devicesResult.error.message);
        setDevices([]);
      }

      if (!vesselsResult.error) {
        setVessels((vesselsResult.data as VesselOption[]) || []);
      } else {
        console.warn("vessels unavailable", vesselsResult.error.message);
        setVessels([]);
      }

      if (!alertsResult.error) {
        setAlerts((alertsResult.data as NetworkAlert[]) || []);
      } else {
        console.warn("network_alerts unavailable", alertsResult.error.message);
        setAlerts([]);
      }
    } catch (error) {
      console.error(error);
      setDevices([]);
      setVessels([]);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const visibleDevices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return devices.filter((device) => {
      const vesselMatch = selectedVesselId === "All" || String(device.vessel_id) === selectedVesselId;
      const statusMatch = statusFilter === "All" || device.status === statusFilter;
      const searchText = [device.device_name, device.ip_address, device.vessels?.vessel_name, device.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const searchMatch = !query || searchText.includes(query);

      return vesselMatch && statusMatch && searchMatch;
    });
  }, [devices, search, selectedVesselId, statusFilter]);

  const stats = useMemo(() => {
    const total = visibleDevices.length;
    const online = visibleDevices.filter((device) => device.status === "Online").length;
    const offline = visibleDevices.filter((device) => device.status === "Offline").length;
    const warning = visibleDevices.filter((device) => device.status === "Warning").length;
    const activeAlerts = alerts.filter((alert) => !alert.resolved).length;
    const latestSync = visibleDevices
      .map((device) => device.last_seen)
      .filter(Boolean)
      .sort((left, right) => (right ? new Date(right).getTime() : 0) - (left ? new Date(left).getTime() : 0))[0];

    const healthScore = total === 0 ? 100 : Math.round((online / total) * 100);
    const internetStatus = offline > 0 && online === 0 ? "Offline" : offline > 0 ? "Degraded" : "Connected";

    return {
      total,
      online,
      offline,
      warning,
      activeAlerts,
      healthScore,
      internetStatus,
      latestSync,
    };
  }, [visibleDevices, alerts]);

  const chartData = useMemo(() => {
    const summary = [
      { name: "Online", value: stats.online, color: "#22c55e" },
      { name: "Warning", value: stats.warning, color: "#f59e0b" },
      { name: "Offline", value: stats.offline, color: "#ef4444" },
    ];

    return summary.filter((entry) => entry.value > 0);
  }, [stats]);

  const speedTrend = useMemo(() => {
    if (visibleDevices.length === 0) {
      return [
        { label: "06:00", speed: 68 },
        { label: "08:00", speed: 72 },
        { label: "10:00", speed: 78 },
        { label: "12:00", speed: 74 },
        { label: "14:00", speed: 82 },
        { label: "16:00", speed: 80 },
      ];
    }

    return visibleDevices
      .slice(0, 6)
      .map((device, index) => ({
        label: device.device_name || `Device ${index + 1}`,
        speed: device.internet_speed_mbps ?? 60 + index * 4,
      }));
  }, [visibleDevices]);

  const openCreateModal = () => {
    setForm(emptyForm());
    setEditingId(null);
    setModalMode("create");
    setShowModal(true);
  };

  const openEditModal = (device: NetworkDevice) => {
    setEditingId(device.id);
    setModalMode("edit");
    setForm({
      vessel_id: device.vessel_id ? String(device.vessel_id) : "",
      device_name: device.device_name || "",
      device_type: device.device_type || "Router",
      ip_address: device.ip_address || "",
      status: device.status || "Online",
      firmware: device.firmware || "",
      last_seen: device.last_seen ? new Date(device.last_seen).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      internet_speed_mbps: device.internet_speed_mbps ? String(device.internet_speed_mbps) : "",
      notes: device.notes || "",
    });
    setShowModal(true);
  };

  const openViewModal = (device: NetworkDevice) => {
    setEditingId(device.id);
    setModalMode("view");
    setForm({
      vessel_id: device.vessel_id ? String(device.vessel_id) : "",
      device_name: device.device_name || "",
      device_type: device.device_type || "Router",
      ip_address: device.ip_address || "",
      status: device.status || "Online",
      firmware: device.firmware || "",
      last_seen: device.last_seen ? new Date(device.last_seen).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      internet_speed_mbps: device.internet_speed_mbps ? String(device.internet_speed_mbps) : "",
      notes: device.notes || "",
    });
    setShowModal(true);
  };

  const handleChange = (field: keyof DeviceFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.device_name || !form.ip_address) {
      alert("Device name and IP address are required.");
      return;
    }

    setSubmitting(true);

    const payload = {
      vessel_id: form.vessel_id ? Number(form.vessel_id) : null,
      device_name: form.device_name,
      device_type: form.device_type,
      ip_address: form.ip_address,
      status: form.status,
      firmware: form.firmware || null,
      last_seen: form.last_seen ? new Date(form.last_seen).toISOString() : new Date().toISOString(),
      internet_speed_mbps: form.internet_speed_mbps ? Number(form.internet_speed_mbps) : null,
      notes: form.notes || null,
    };

    try {
      const currentDevice = devices.find((device) => device.id === editingId);
      const shouldTriggerOfflineAlert = currentDevice?.status !== "Offline" && payload.status === "Offline";

      if (modalMode === "edit" && editingId) {
        const { error } = await supabase.from("network_devices").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("network_devices").insert([payload]);
        if (error) throw error;
      }

      if (shouldTriggerOfflineAlert) {
        const resolvedDevice = modalMode === "edit" && editingId
          ? { id: editingId, device_name: form.device_name }
          : { id: null, device_name: form.device_name };

        await createNotificationIfNotExists({
          title: "Network device offline",
          message: `${form.device_name} is now offline on ${form.ip_address}.`,
          action: "Device Offline",
          recordType: "network_device",
          recordId: resolvedDevice.id ?? form.device_name,
        });

        await supabase.from("network_alerts").insert([
          {
            device_id: resolvedDevice.id,
            title: "Offline alert",
            message: `${form.device_name} reported an offline status.`,
            severity: "high",
            created_at: new Date().toISOString(),
            resolved: false,
          },
        ]);
      }

      setShowModal(false);
      await loadAll();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Unable to save network device.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (device: NetworkDevice) => {
    const confirmed = window.confirm(`Delete ${device.device_name || "this device"}?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("network_devices").delete().eq("id", device.id);
      if (error) throw error;
      await loadAll();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Unable to delete device.");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Network Operations</p>
          <h1 style={styles.title}>Network & Communication Monitoring</h1>
          <p style={styles.subtitle}>Track vessel connectivity, device health, and service alerts in one command center.</p>
        </div>
        <div style={styles.headerActions}>
          <select style={styles.select} value={selectedVesselId} onChange={(event) => setSelectedVesselId(event.target.value)}>
            <option value="All">All vessels</option>
            {vessels.map((vessel) => (
              <option key={vessel.id} value={String(vessel.id)}>
                {vessel.vessel_name || `Vessel ${vessel.id}`}
              </option>
            ))}
          </select>
          <button style={styles.primaryButton} onClick={openCreateModal}>
            + Add Device
          </button>
        </div>
      </div>

      <div style={styles.kpiGrid}>
        <KpiCard label="Online Devices" value={stats.online} tone="green" />
        <KpiCard label="Offline Devices" value={stats.offline} tone="red" />
        <KpiCard label="Active Alerts" value={stats.activeAlerts} tone="amber" />
        <KpiCard label="Internet Status" value={stats.internetStatus} tone="blue" />
        <KpiCard label="Network Health" value={`${stats.healthScore}%`} tone="indigo" />
        <KpiCard label="Last Sync" value={stats.latestSync ? new Date(stats.latestSync).toLocaleString() : "No data"} tone="slate" />
      </div>

      <div style={styles.gridTwo}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardEyebrow}>Asset posture</p>
              <h3 style={styles.cardTitle}>Device Status</h3>
            </div>
          </div>
          {chartData.length === 0 ? (
            <div style={styles.emptyChart}>No status data available yet.</div>
          ) : (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardEyebrow}>Performance</p>
              <h3 style={styles.cardTitle}>Internet Speed</h3>
            </div>
          </div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={speedTrend}>
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="speed" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.toolbar}>
          <input
            style={styles.input}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by device, IP, vessel, or status"
          />
          <select style={styles.select} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            {filterOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={styles.spinnerWrap}>
            <div style={styles.spinner} />
            <span style={styles.spinnerText}>Loading network inventory…</span>
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Device Name</th>
                  <th style={styles.th}>Device Type</th>
                  <th style={styles.th}>IP Address</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Firmware</th>
                  <th style={styles.th}>Last Seen</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleDevices.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={styles.emptyState}>
                      No devices found for the current filters.
                    </td>
                  </tr>
                ) : (
                  visibleDevices.map((device) => (
                    <tr key={device.id} style={styles.row}>
                      <td style={styles.td}>
                        <div style={styles.deviceCell}>
                          <strong>{device.device_name || "—"}</strong>
                          <span style={styles.subtleText}>{device.vessels?.vessel_name || "Unassigned vessel"}</span>
                        </div>
                      </td>
                      <td style={styles.td}>{device.device_type || "—"}</td>
                      <td style={styles.td}>{device.ip_address || "—"}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusBadge, ...getStatusStyle(device.status || "Online") }}>{device.status || "Online"}</span>
                      </td>
                      <td style={styles.td}>{device.firmware || "—"}</td>
                      <td style={styles.td}>{device.last_seen ? new Date(device.last_seen).toLocaleString() : "—"}</td>
                      <td style={styles.td}>
                        <div style={styles.actionsRow}>
                          <button style={styles.ghostButton} onClick={() => openViewModal(device)}>
                            View
                          </button>
                          <button style={styles.ghostButton} onClick={() => openEditModal(device)}>
                            Edit
                          </button>
                          <button style={styles.deleteButton} onClick={() => handleDelete(device)}>
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

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <p style={styles.cardEyebrow}>Operational events</p>
            <h3 style={styles.cardTitle}>Alert History</h3>
          </div>
        </div>
        {alerts.length === 0 ? (
          <div style={styles.emptyState}>No alert history recorded yet.</div>
        ) : (
          <div style={styles.alertList}>
            {alerts.map((alert) => (
              <div key={alert.id} style={styles.alertItem}>
                <div>
                  <p style={styles.alertTitle}>{alert.title || "Alert"}</p>
                  <p style={styles.alertText}>{alert.message || "No details provided."}</p>
                </div>
                <div style={styles.alertMeta}>
                  <span style={styles.alertSeverity}>{alert.severity || "info"}</span>
                  <span style={styles.subtleText}>{alert.created_at ? new Date(alert.created_at).toLocaleString() : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <p style={styles.eyebrow}>Communication asset</p>
                <h2 style={styles.modalTitle}>{modalMode === "create" ? "Add Device" : modalMode === "edit" ? "Edit Device" : "Device Details"}</h2>
              </div>
              <button style={styles.closeButton} onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.formGrid}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Vessel</label>
                <select style={styles.input} value={form.vessel_id} onChange={(event) => handleChange("vessel_id", event.target.value)} disabled={modalMode === "view"}>
                  <option value="">Unassigned</option>
                  {vessels.map((vessel) => (
                    <option key={vessel.id} value={String(vessel.id)}>
                      {vessel.vessel_name || `Vessel ${vessel.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Device Name</label>
                <input style={styles.input} value={form.device_name} onChange={(event) => handleChange("device_name", event.target.value)} disabled={modalMode === "view"} />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Device Type</label>
                <select style={styles.input} value={form.device_type} onChange={(event) => handleChange("device_type", event.target.value)} disabled={modalMode === "view"}>
                  {deviceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>IP Address</label>
                <input style={styles.input} value={form.ip_address} onChange={(event) => handleChange("ip_address", event.target.value)} disabled={modalMode === "view"} />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Status</label>
                <select style={styles.input} value={form.status} onChange={(event) => handleChange("status", event.target.value)} disabled={modalMode === "view"}>
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Firmware</label>
                <input style={styles.input} value={form.firmware} onChange={(event) => handleChange("firmware", event.target.value)} disabled={modalMode === "view"} />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Last Seen</label>
                <input style={styles.input} type="datetime-local" value={form.last_seen} onChange={(event) => handleChange("last_seen", event.target.value)} disabled={modalMode === "view"} />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Internet Speed (Mbps)</label>
                <input style={styles.input} type="number" value={form.internet_speed_mbps} onChange={(event) => handleChange("internet_speed_mbps", event.target.value)} disabled={modalMode === "view"} />
              </div>

              <div style={{ ...styles.fieldGroup, gridColumn: "1 / -1" }}>
                <label style={styles.label}>Notes</label>
                <textarea style={{ ...styles.input, minHeight: 96, resize: "vertical" }} value={form.notes} onChange={(event) => handleChange("notes", event.target.value)} disabled={modalMode === "view"} />
              </div>

              {modalMode !== "view" && (
                <div style={{ ...styles.fieldGroup, gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button type="button" style={styles.secondaryButton} onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.primaryButton} disabled={submitting}>
                    {submitting ? "Saving…" : modalMode === "edit" ? "Save Changes" : "Create Device"}
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

function KpiCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div style={{ ...styles.kpiCard, borderColor: getToneColor(tone) }}>
      <p style={styles.kpiLabel}>{label}</p>
      <h3 style={styles.kpiValue}>{value}</h3>
    </div>
  );
}

function getStatusStyle(status: string): CSSProperties {
  switch (status) {
    case "Online":
      return { background: "#dcfce7", color: "#166534" };
    case "Warning":
      return { background: "#fef3c7", color: "#b45309" };
    case "Offline":
      return { background: "#fee2e2", color: "#b91c1c" };
    default:
      return { background: "#e2e8f0", color: "#334155" };
  }
}

function getToneColor(tone: string) {
  switch (tone) {
    case "green":
      return "#22c55e";
    case "red":
      return "#ef4444";
    case "amber":
      return "#f59e0b";
    case "blue":
      return "#2563eb";
    case "indigo":
      return "#4f46e5";
    default:
      return "#cbd5e1";
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
  headerActions: {
    display: "flex",
    gap: 12,
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
    maxWidth: 760,
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
    fontSize: 20,
    color: "#0f172a",
    wordBreak: "break-word",
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  card: {
    background: "white",
    borderRadius: 24,
    padding: 20,
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
    border: "1px solid #e2e8f0",
    marginBottom: 24,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardEyebrow: {
    margin: 0,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#94a3b8",
  },
  cardTitle: {
    margin: "4px 0 0",
    fontSize: 18,
    fontWeight: 800,
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
    minWidth: 920,
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
  deviceCell: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  subtleText: {
    fontSize: 12,
    color: "#64748b",
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
  statusBadge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    display: "inline-block",
  },
  emptyState: {
    textAlign: "center",
    padding: 24,
    color: "#64748b",
  },
  emptyChart: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
    color: "#64748b",
  },
  alertList: {
    display: "grid",
    gap: 12,
  },
  alertItem: {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  alertTitle: {
    margin: 0,
    fontWeight: 700,
    color: "#0f172a",
  },
  alertText: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: 14,
  },
  alertMeta: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
  },
  alertSeverity: {
    background: "#eff6ff",
    color: "#2563eb",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize",
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
