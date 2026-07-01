"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "../../lib/supabase";
import { createAuditLog, buildAuditDescription } from "../../lib/audit";
import { getUserProfile } from "../../lib/rbac";

interface Vessel {
  id: number;
  vessel_name: string;
}

interface Employee {
  id: number;
  full_name: string;
}

interface Asset {
  id: number;
  asset_name: string;
  asset_tag: string;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  status?: string | null;
  vessel_id?: number | null;
  warranty_expiry?: string | null;
  currently_assigned_to?: number | null;
  created_at?: string;
  vessels?: { vessel_name?: string | null } | null;
}

interface AssetTransfer {
  id: number;
  asset_id: number;
  from_vessel_id?: number | null;
  to_vessel_id?: number | null;
  transferred_at?: string;
  transferred_by?: string | null;
  notes?: string | null;
  assets?: { asset_name?: string | null; asset_tag?: string | null } | null;
  from_vessel?: { vessel_name?: string | null } | null;
  to_vessel?: { vessel_name?: string | null } | null;
}

interface AssetFormState {
  asset_name: string;
  asset_tag: string;
  category: string;
  brand: string;
  model: string;
  serial_number: string;
  status: string;
  vessel_id: string;
  warranty_expiry: string;
}

const emptyForm = (): AssetFormState => ({
  asset_name: "",
  asset_tag: "",
  category: "",
  brand: "",
  model: "",
  serial_number: "",
  status: "Available",
  vessel_id: "",
  warranty_expiry: "",
});

const categoryOrder = [
  "Laptops",
  "Desktops",
  "Monitors",
  "Printers",
  "Networking",
  "Cables",
  "Accessories",
  "Communication Equipment",
  "Navigation Equipment",
];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [transfers, setTransfers] = useState<AssetTransfer[]>([]);
  const [search, setSearch] = useState("");
  const [vesselFilter, setVesselFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [selectedVesselId, setSelectedVesselId] = useState("All");
  const [form, setForm] = useState<AssetFormState>(emptyForm());
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
  const [transferAssetId, setTransferAssetId] = useState<number | null>(null);
  const [transferTargetVesselId, setTransferTargetVesselId] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetsResponse, vesselsResponse, employeesResponse, transfersResponse] = await Promise.all([
        supabase.from("assets").select("*, vessels(vessel_name)").order("asset_name", { ascending: true }),
        supabase.from("vessels").select("id, vessel_name").order("vessel_name", { ascending: true }),
        supabase.from("employees").select("id, full_name").order("full_name", { ascending: true }),
        supabase.from("asset_transfers").select("*, assets(asset_name, asset_tag), from_vessel:vessels!asset_transfers_from_vessel_id_fkey(vessel_name), to_vessel:vessels!asset_transfers_to_vessel_id_fkey(vessel_name)").order("transferred_at", { ascending: false }),
      ]);

      if (!assetsResponse.error) setAssets((assetsResponse.data as Asset[]) || []);
      if (!vesselsResponse.error) setVessels((vesselsResponse.data as Vessel[]) || []);
      if (!employeesResponse.error) setEmployees((employeesResponse.data as Employee[]) || []);
      if (!transfersResponse.error) setTransfers((transfersResponse.data as AssetTransfer[]) || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingAssetId(null);
    setForm(emptyForm());
    setShowAssetModal(true);
  };

  const openEditModal = (asset: Asset) => {
    setEditingAssetId(asset.id);
    setForm({
      asset_name: asset.asset_name || "",
      asset_tag: asset.asset_tag || "",
      category: asset.category || "",
      brand: asset.brand || "",
      model: asset.model || "",
      serial_number: asset.serial_number || "",
      status: asset.status || "Available",
      vessel_id: asset.vessel_id ? String(asset.vessel_id) : "",
      warranty_expiry: asset.warranty_expiry || "",
    });
    setShowAssetModal(true);
  };

  const closeAssetModal = () => {
    setShowAssetModal(false);
    setEditingAssetId(null);
    setForm(emptyForm());
  };

  const handleSaveAsset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.asset_name || !form.asset_tag) {
      alert("Asset name and tag are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        asset_name: form.asset_name,
        asset_tag: form.asset_tag,
        category: form.category || null,
        brand: form.brand || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        status: form.status || "Available",
        vessel_id: form.vessel_id ? Number(form.vessel_id) : null,
        warranty_expiry: form.warranty_expiry || null,
      };

      if (editingAssetId) {
        const { error } = await supabase.from("assets").update(payload).eq("id", editingAssetId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("assets").insert([payload]).select();
        if (error) throw error;
      }

      const profile = await getUserProfile();
      await createAuditLog({
        action: editingAssetId ? "Updated Asset" : "Created Asset",
        description: buildAuditDescription({
          event: editingAssetId ? "Updated Asset" : "Created Asset",
          userName: profile?.full_name || "Unknown User",
          recordType: "asset",
          recordId: editingAssetId || undefined,
          itemName: form.asset_name,
        }),
      });

      await loadData();
      closeAssetModal();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Unable to save asset.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAsset = async (asset: Asset) => {
    const confirmed = window.confirm(`Delete ${asset.asset_name}?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("assets").delete().eq("id", asset.id);
      if (error) throw error;
      await loadData();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Unable to delete asset.");
    }
  };

  const openTransferModal = (asset: Asset) => {
    setTransferAssetId(asset.id);
    setTransferTargetVesselId(asset.vessel_id ? String(asset.vessel_id) : "");
    setTransferNotes("");
    setShowTransferModal(true);
  };

  const handleTransfer = async () => {
    if (!transferAssetId || !transferTargetVesselId) {
      alert("Please select a destination vessel.");
      return;
    }

    const asset = assets.find((item) => item.id === transferAssetId);
    if (!asset) return;

    try {
      const profile = await getUserProfile();
      const { error: transferError } = await supabase.from("asset_transfers").insert([
        {
          asset_id: transferAssetId,
          from_vessel_id: asset.vessel_id || null,
          to_vessel_id: Number(transferTargetVesselId),
          transferred_by: profile?.full_name || null,
          notes: transferNotes || null,
        },
      ]);
      if (transferError) throw transferError;

      const { error: updateError } = await supabase.from("assets").update({ vessel_id: Number(transferTargetVesselId) }).eq("id", transferAssetId);
      if (updateError) throw updateError;

      setShowTransferModal(false);
      setTransferAssetId(null);
      setTransferTargetVesselId("");
      setTransferNotes("");
      await loadData();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Transfer failed.");
    }
  };

  const exportAssetsToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredAssets.map((asset) => ({
        Asset: asset.asset_name,
        Tag: asset.asset_tag,
        Vessel: asset.vessels?.vessel_name || "Unassigned",
        Category: asset.category || "",
        Serial: asset.serial_number || "",
        Status: asset.status || "",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vessel Assets");
    XLSX.writeFile(workbook, "vessel-assets-report.xlsx");
  };

  const exportAssetsToPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Vessel Inventory Report", 14, 16);
    doc.setFontSize(10);
    filteredAssets.forEach((asset, index) => {
      const y = 28 + index * 8;
      doc.text(`${index + 1}. ${asset.asset_name} | ${asset.asset_tag} | ${asset.category || ""} | ${asset.status || ""}`, 14, y);
    });
    doc.save("vessel-assets-report.pdf");
  };

  const assetEmployeeName = (asset: Asset) => {
    if (!asset.currently_assigned_to) return "Unassigned";
    return employees.find((employee) => employee.id === asset.currently_assigned_to)?.full_name || "Assigned";
  };

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assets.filter((asset) => {
      const vesselMatch = vesselFilter === "All" || asset.vessels?.vessel_name === vesselFilter;
      const categoryMatch = categoryFilter === "All" || asset.category === categoryFilter;
      const statusMatch = statusFilter === "All" || asset.status === statusFilter;
      const employeeMatch = employeeFilter === "All" || assetEmployeeName(asset) === employeeFilter;
      const searchMatch =
        !query ||
        [asset.asset_name, asset.asset_tag, asset.serial_number, asset.vessels?.vessel_name, asset.category]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return vesselMatch && categoryMatch && statusMatch && employeeMatch && searchMatch;
    });
  }, [assets, categoryFilter, employeeFilter, search, statusFilter, vesselFilter]);

  const selectedVessel = vessels.find((vessel) => String(vessel.id) === selectedVesselId);
  const vesselAssets = useMemo(() => {
    if (!selectedVesselId || selectedVesselId === "All") {
      return filteredAssets;
    }
    return filteredAssets.filter((asset) => String(asset.vessel_id) === selectedVesselId);
  }, [filteredAssets, selectedVesselId]);

  const vesselSummary = useMemo(() => {
    const total = vesselAssets.length;
    const assigned = vesselAssets.filter((asset) => asset.status === "Assigned").length;
    const available = vesselAssets.filter((asset) => asset.status === "Available").length;
    const maintenanceDue = vesselAssets.filter((asset) => {
      if (!asset.warranty_expiry) return false;
      const expiry = new Date(asset.warranty_expiry);
      const now = new Date();
      const diff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 30;
    }).length;
    const warrantyExpiring = vesselAssets.filter((asset) => {
      if (!asset.warranty_expiry) return false;
      const expiry = new Date(asset.warranty_expiry);
      const now = new Date();
      const diff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 30;
    }).length;

    return { total, assigned, available, maintenanceDue, warrantyExpiring };
  }, [vesselAssets]);

  const categoryBreakdown = useMemo(() => {
    return categoryOrder.map((category) => ({
      name: category,
      value: vesselAssets.filter((asset) => asset.category === category).length,
    })).filter((item) => item.value > 0);
  }, [vesselAssets]);

  const statusBreakdown = useMemo(() => {
    const statuses = ["Available", "Assigned", "In Maintenance", "Retired"];
    return statuses.map((status) => ({
      name: status,
      value: vesselAssets.filter((asset) => asset.status === status).length,
    })).filter((item) => item.value > 0);
  }, [vesselAssets]);

  const assignmentBreakdown = useMemo(() => {
    return [
      { name: "Assigned", value: vesselSummary.assigned },
      { name: "Available", value: vesselSummary.available },
    ];
  }, [vesselSummary]);

  const inventoryRows = useMemo(() => {
    return categoryOrder.map((category) => ({
      category,
      count: vesselAssets.filter((asset) => asset.category === category).length,
    }));
  }, [vesselAssets]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Fleet Operations</p>
          <h1 style={styles.title}>Vessel-Wise Asset Management</h1>
          <p style={styles.subtitle}>Assign every asset to a vessel and manage inventory by fleet.</p>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.secondaryButton} onClick={() => setShowReportModal(true)}>
            Generate Vessel Inventory Report
          </button>
          <button style={styles.secondaryButton} onClick={exportAssetsToExcel}>
            Export Excel
          </button>
          <button style={styles.secondaryButton} onClick={exportAssetsToPdf}>
            Export PDF
          </button>
          <button style={styles.primaryButton} onClick={openCreateModal}>
            + Add Asset
          </button>
        </div>
      </div>

      <div style={styles.vesselGrid}>
        <button style={{ ...styles.vesselCard, ...(selectedVesselId === "All" ? styles.vesselCardActive : {}) }} onClick={() => setSelectedVesselId("All")}>
          <strong>All Vessels</strong>
          <span>{assets.length} assets</span>
        </button>
        {vessels.map((vessel) => {
          const count = assets.filter((asset) => String(asset.vessel_id) === String(vessel.id)).length;
          return (
            <button key={vessel.id} style={{ ...styles.vesselCard, ...(selectedVesselId === String(vessel.id) ? styles.vesselCardActive : {}) }} onClick={() => setSelectedVesselId(String(vessel.id))}>
              <strong>{vessel.vessel_name}</strong>
              <span>{count} assets</span>
            </button>
          );
        })}
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Total Assets</p>
          <strong style={styles.summaryValue}>{vesselSummary.total}</strong>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Assigned Assets</p>
          <strong style={styles.summaryValue}>{vesselSummary.assigned}</strong>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Available Assets</p>
          <strong style={styles.summaryValue}>{vesselSummary.available}</strong>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Maintenance Due</p>
          <strong style={styles.summaryValue}>{vesselSummary.maintenanceDue}</strong>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Warranty Expiring</p>
          <strong style={styles.summaryValue}>{vesselSummary.warrantyExpiring}</strong>
        </div>
      </div>

      <div style={styles.dashboardGrid}>
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>{selectedVessel ? `${selectedVessel.vessel_name} Dashboard` : "Asset Summary"}</h3>
          <div style={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" outerRadius={70} fill="#2563eb">
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p style={styles.chartLegend}>Category Pie Chart</p>
        </div>
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Status Chart</h3>
          <div style={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusBreakdown} dataKey="value" nameKey="name" outerRadius={70} fill="#0f766e">
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={["#0f766e", "#14b8a6", "#2dd4bf", "#5eead4"][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Assignment Chart</h3>
          <div style={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={assignmentBreakdown} dataKey="value" nameKey="name" outerRadius={70} fill="#7c3aed">
                  {assignmentBreakdown.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={["#7c3aed", "#8b5cf6"][index % 2]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={styles.panel}>
        <div style={styles.toolbar}>
          <input style={styles.input} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search asset, tag, serial, vessel, or category" />
          <select style={styles.select} value={vesselFilter} onChange={(event) => setVesselFilter(event.target.value)}>
            <option value="All">All Vessels</option>
            {vessels.map((vessel) => (
              <option key={vessel.id} value={vessel.vessel_name}>
                {vessel.vessel_name}
              </option>
            ))}
          </select>
          <select style={styles.select} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="All">All Categories</option>
            {categoryOrder.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select style={styles.select} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Assigned">Assigned</option>
            <option value="In Maintenance">In Maintenance</option>
            <option value="Retired">Retired</option>
          </select>
          <select style={styles.select} value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}>
            <option value="All">All Employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.full_name}>
                {employee.full_name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.inventorySection}>
          <h3 style={styles.panelTitle}>Vessel Inventory</h3>
          <div style={styles.inventoryGrid}>
            {inventoryRows.map((row) => (
              <div key={row.category} style={styles.inventoryCard}>
                <strong>{row.category}</strong>
                <span>{row.count} item(s)</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={styles.spinnerWrap}>
            <div style={styles.spinner} />
            <span>Loading asset inventory…</span>
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Asset</th>
                  <th style={styles.th}>Tag</th>
                  <th style={styles.th}>Vessel</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Serial</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} style={styles.row}>
                    <td style={styles.td}>{asset.asset_name}</td>
                    <td style={styles.td}>{asset.asset_tag}</td>
                    <td style={styles.td}>{asset.vessels?.vessel_name || "Unassigned"}</td>
                    <td style={styles.td}>{asset.category || "—"}</td>
                    <td style={styles.td}>{asset.serial_number || "—"}</td>
                    <td style={styles.td}><span style={{ ...styles.statusBadge, ...getStatusStyle(asset.status || "Available") }}>{asset.status || "Available"}</span></td>
                    <td style={styles.td}>{assetEmployeeName(asset)}</td>
                    <td style={styles.td}>
                      <div style={styles.actionsRow}>
                        <button style={styles.ghostButton} onClick={() => openEditModal(asset)}>Edit</button>
                        <button style={styles.ghostButton} onClick={() => openTransferModal(asset)}>Transfer</button>
                        <button style={styles.deleteButton} onClick={() => deleteAsset(asset)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAssetModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editingAssetId ? "Edit Asset" : "Add Asset"}</h2>
              <button style={styles.closeButton} onClick={closeAssetModal}>×</button>
            </div>
            <form onSubmit={handleSaveAsset} style={styles.formGrid}>
              <label style={styles.field}>Asset Name<input style={styles.input} value={form.asset_name} onChange={(event) => setForm((current) => ({ ...current, asset_name: event.target.value }))} /></label>
              <label style={styles.field}>Asset Tag<input style={styles.input} value={form.asset_tag} onChange={(event) => setForm((current) => ({ ...current, asset_tag: event.target.value }))} /></label>
              <label style={styles.field}>Category<input style={styles.input} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></label>
              <label style={styles.field}>Brand<input style={styles.input} value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} /></label>
              <label style={styles.field}>Model<input style={styles.input} value={form.model} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} /></label>
              <label style={styles.field}>Serial Number<input style={styles.input} value={form.serial_number} onChange={(event) => setForm((current) => ({ ...current, serial_number: event.target.value }))} /></label>
              <label style={styles.field}>Status<select style={styles.select} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="Available">Available</option><option value="Assigned">Assigned</option><option value="In Maintenance">In Maintenance</option><option value="Retired">Retired</option></select></label>
              <label style={styles.field}>Vessel<select style={styles.select} value={form.vessel_id} onChange={(event) => setForm((current) => ({ ...current, vessel_id: event.target.value }))}><option value="">Select Vessel</option>{vessels.map((vessel) => <option key={vessel.id} value={vessel.id}>{vessel.vessel_name}</option>)}</select></label>
              <label style={styles.field}>Warranty Expiry<input type="date" style={styles.input} value={form.warranty_expiry} onChange={(event) => setForm((current) => ({ ...current, warranty_expiry: event.target.value }))} /></label>
              <div style={styles.modalActions}><button type="button" style={styles.secondaryButton} onClick={closeAssetModal}>Cancel</button><button type="submit" style={styles.primaryButton} disabled={saving}>{saving ? "Saving…" : editingAssetId ? "Save Changes" : "Create Asset"}</button></div>
            </form>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Transfer Asset</h2>
              <button style={styles.closeButton} onClick={() => setShowTransferModal(false)}>×</button>
            </div>
            <div style={styles.formGrid}>
              <label style={styles.field}>Destination Vessel<select style={styles.select} value={transferTargetVesselId} onChange={(event) => setTransferTargetVesselId(event.target.value)}><option value="">Select Vessel</option>{vessels.map((vessel) => <option key={vessel.id} value={vessel.id}>{vessel.vessel_name}</option>)}</select></label>
              <label style={styles.field}>Notes<textarea style={{ ...styles.input, minHeight: 96 }} value={transferNotes} onChange={(event) => setTransferNotes(event.target.value)} /></label>
              <div style={styles.modalActions}><button type="button" style={styles.secondaryButton} onClick={() => setShowTransferModal(false)}>Cancel</button><button style={styles.primaryButton} onClick={handleTransfer}>Save Transfer</button></div>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Vessel Inventory Report</h2>
              <button style={styles.closeButton} onClick={() => setShowReportModal(false)}>×</button>
            </div>
            <div style={styles.reportBox}>
              <p style={styles.reportText}>The report includes asset name, tag, vessel, category, serial number, and status for the current selection.</p>
              <div style={styles.modalActions}><button style={styles.secondaryButton} onClick={exportAssetsToExcel}>Export Excel</button><button style={styles.primaryButton} onClick={exportAssetsToPdf}>Export PDF</button></div>
            </div>
          </div>
        </div>
      )}

      <div style={styles.panel}>
        <h3 style={styles.panelTitle}>Transfer History</h3>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Asset</th>
                <th style={styles.th}>From Vessel</th>
                <th style={styles.th}>To Vessel</th>
                <th style={styles.th}>Transferred At</th>
                <th style={styles.th}>By</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer) => (
                <tr key={transfer.id} style={styles.row}>
                  <td style={styles.td}>{transfer.assets?.asset_name || "—"}</td>
                  <td style={styles.td}>{transfer.from_vessel?.vessel_name || "—"}</td>
                  <td style={styles.td}>{transfer.to_vessel?.vessel_name || "—"}</td>
                  <td style={styles.td}>{transfer.transferred_at ? new Date(transfer.transferred_at).toLocaleString() : "—"}</td>
                  <td style={styles.td}>{transfer.transferred_by || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case "Assigned":
      return { background: "#dbeafe", color: "#1d4ed8" };
    case "In Maintenance":
      return { background: "#fef3c7", color: "#b45309" };
    case "Retired":
      return { background: "#fee2e2", color: "#b91c1c" };
    default:
      return { background: "#dcfce7", color: "#166534" };
  }
}

const styles: any = {
  container: {
    padding: 30,
    background: "#f8fbff",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  eyebrow: {
    margin: 0,
    color: "#2563eb",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: 700,
  },
  title: {
    margin: "4px 0 4px",
    fontSize: 28,
    fontWeight: 800,
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: 14,
  },
  headerActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  primaryButton: {
    border: "none",
    background: "linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)",
    color: "white",
    padding: "10px 14px",
    borderRadius: 999,
    fontWeight: 700,
    cursor: "pointer",
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
  vesselGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginBottom: 18,
  },
  vesselCard: {
    border: "1px solid #dbeafe",
    background: "#f8fbff",
    borderRadius: 16,
    padding: 14,
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  vesselCardActive: {
    background: "#dbeafe",
    borderColor: "#2563eb",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  summaryCard: {
    background: "white",
    borderRadius: 18,
    padding: 16,
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
  },
  summaryLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  summaryValue: {
    marginTop: 6,
    display: "block",
    fontSize: 24,
    color: "#0f172a",
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
    marginBottom: 18,
  },
  panel: {
    background: "white",
    padding: 18,
    borderRadius: 22,
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
  },
  panelTitle: {
    margin: "0 0 12px",
    fontSize: 16,
    color: "#0f172a",
  },
  chartWrap: {
    height: 220,
  },
  chartLegend: {
    margin: "8px 0 0",
    fontSize: 13,
    color: "#64748b",
  },
  toolbar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  input: {
    flex: 1,
    minWidth: 220,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
  },
  select: {
    minWidth: 160,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
  },
  inventorySection: {
    marginBottom: 14,
  },
  inventoryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
  },
  inventoryCard: {
    border: "1px solid #dbeafe",
    background: "#f8fbff",
    borderRadius: 14,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  spinnerWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 20,
    color: "#2563eb",
  },
  spinner: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: "3px solid #bfdbfe",
    borderTopColor: "#2563eb",
    animation: "spin 1s linear infinite",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 980,
  },
  th: {
    textAlign: "left",
    padding: "10px 8px",
    borderBottom: "1px solid #e2e8f0",
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  td: {
    padding: "10px 8px",
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
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 1000,
  },
  modalCard: {
    background: "white",
    borderRadius: 22,
    width: "min(920px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: 24,
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.25)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    margin: 0,
    fontSize: 20,
    color: "#0f172a",
  },
  closeButton: {
    border: "none",
    background: "#f1f5f9",
    width: 34,
    height: 34,
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 20,
  },
  formGrid: {
    display: "grid",
    gap: 14,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontWeight: 700,
    color: "#334155",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  reportBox: {
    display: "grid",
    gap: 14,
  },
  reportText: {
    margin: 0,
    color: "#475569",
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
