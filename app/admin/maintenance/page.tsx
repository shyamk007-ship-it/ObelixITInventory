"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { createAuditLog, buildAuditDescription } from "../../lib/audit";
import { getUserProfile } from "../../lib/rbac";
import { maintenanceStatuses } from "../../lib/helpdesk";

interface Asset {
  id: number;
  asset_name: string;
  warranty_expiry?: string | null;
}

interface MaintenanceRecord {
  id: number;
  asset_id: number;
  maintenance_date: string;
  warranty_expiry?: string | null;
  vendor: string;
  service_details: string;
  maintenance_cost: number;
  status: string;
  notes?: string;
  created_at: string;
  assets?: Asset;
}

export default function MaintenanceAdminPage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState("");
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [warrantyExpiry, setWarrantyExpiry] = useState("");
  const [vendor, setVendor] = useState("");
  const [serviceDetails, setServiceDetails] = useState("");
  const [maintenanceCost, setMaintenanceCost] = useState(0);
  const [notes, setNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecords();
    loadAssets();
  }, []);

  const loadRecords = async () => {
    const { data, error } = await supabase
      .from("asset_maintenance")
      .select("*, assets(asset_name)")
      .order("maintenance_date", { ascending: false });

    if (!error) {
      setRecords(data || []);
    }
  };

  const loadAssets = async () => {
    const { data, error } = await supabase
      .from("assets")
      .select("id, asset_name, warranty_expiry")
      .order("asset_name", { ascending: true });

    if (!error) {
      setAssets(data || []);
    }
  };

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        record.assets?.asset_name.toLowerCase().includes(normalizedSearch) ||
        record.vendor.toLowerCase().includes(normalizedSearch) ||
        record.service_details.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        filterStatus === "All" ? true : record.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [records, search, filterStatus]);

  const upcomingMaintenanceCount = records.filter((record) => {
    const target = new Date(record.maintenance_date);
    const now = new Date();
    const delta = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return delta >= 0 && delta <= 30;
  }).length;

  const warrantySoonCount = assets.filter((asset) => {
    if (!asset.warranty_expiry) return false;
    const expiry = new Date(asset.warranty_expiry);
    const now = new Date();
    const delta = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return delta >= 0 && delta <= 30;
  }).length;

  const handleCreateRecord = async () => {
    if (!selectedAsset || !maintenanceDate || !vendor) {
      alert("Please supply a target asset, maintenance date, and vendor.");
      return;
    }

    setLoading(true);
    const profile = await getUserProfile();

    const { error } = await supabase.from("asset_maintenance").insert([
      {
        asset_id: Number(selectedAsset),
        maintenance_date: maintenanceDate,
        warranty_expiry: warrantyExpiry || null,
        vendor,
        service_details: serviceDetails,
        maintenance_cost: maintenanceCost,
        status: "Pending",
        notes,
      },
    ]);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (warrantyExpiry) {
      await supabase
        .from("assets")
        .update({ warranty_expiry: warrantyExpiry })
        .eq("id", Number(selectedAsset));
    }

    await createAuditLog({
      action: "Maintenance Due",
      description: buildAuditDescription({
        event: "Maintenance Scheduled",
        userName: profile?.full_name || "Unknown User",
        recordType: "asset_maintenance",
        recordId: selectedAsset,
        itemName: assets.find((asset) => asset.id === Number(selectedAsset))?.asset_name,
        context: `Vendor: ${vendor}`,
      }),
    });

    setSelectedAsset("");
    setVendor("");
    setServiceDetails("");
    setMaintenanceCost(0);
    setNotes("");
    setWarrantyExpiry("");
    setMaintenanceDate(new Date().toISOString().slice(0, 10));

    await loadRecords();
    await loadAssets();
    setLoading(false);
  };

  const handleComplete = async (id: number) => {
    const { error } = await supabase
      .from("asset_maintenance")
      .update({ status: "Completed" })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    const profile = await getUserProfile();
    await createAuditLog({
      action: "Maintenance Due",
      description: buildAuditDescription({
        event: "Maintenance Completed",
        userName: profile?.full_name || "Unknown User",
        recordType: "asset_maintenance",
        recordId: id,
        itemName: records.find((record) => record.id === id)?.assets?.asset_name,
      }),
    });

    await loadRecords();
  };

  const exportMaintenanceRecords = () => {
    const rows = [
      [
        "ID",
        "Asset",
        "Maintenance Date",
        "Warranty Expiry",
        "Vendor",
        "Status",
        "Service Details",
        "Cost",
        "Notes",
      ],
      ...records.map((record) => [
        record.id,
        record.assets?.asset_name || "",
        record.maintenance_date,
        record.warranty_expiry || "",
        record.vendor,
        record.status,
        record.service_details,
        record.maintenance_cost,
        record.notes || "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "asset-maintenance-report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1>Asset Maintenance</h1>
          <p>Track repairs, warranty coverage, and upcoming service dates.</p>
        </div>
        <button onClick={exportMaintenanceRecords} style={styles.actionButton}>
          Export Maintenance
        </button>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <strong>{records.length}</strong>
          <p>Maintenance Records</p>
        </div>
        <div style={styles.statCard}>
          <strong>{upcomingMaintenanceCount}</strong>
          <p>Upcoming in 30 days</p>
        </div>
        <div style={styles.statCard}>
          <strong>{warrantySoonCount}</strong>
          <p>Warranty expiring soon</p>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2>Schedule Maintenance</h2>
          <div style={styles.formGrid}>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              style={styles.select}
            >
              <option value="">Select asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.asset_name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={maintenanceDate}
              onChange={(e) => setMaintenanceDate(e.target.value)}
              style={styles.input}
            />
            <input
              type="date"
              value={warrantyExpiry}
              onChange={(e) => setWarrantyExpiry(e.target.value)}
              style={styles.input}
              placeholder="Warranty expiry"
            />
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Vendor / service provider"
              style={styles.input}
            />
            <input
              type="number"
              value={maintenanceCost}
              onChange={(e) => setMaintenanceCost(Number(e.target.value))}
              placeholder="Cost"
              style={styles.input}
            />
            <textarea
              value={serviceDetails}
              onChange={(e) => setServiceDetails(e.target.value)}
              placeholder="Service details"
              rows={4}
              style={styles.textarea}
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              rows={3}
              style={styles.textarea}
            />
          </div>
          <button
            onClick={handleCreateRecord}
            style={styles.primaryButton}
            disabled={loading}
          >
            Create Maintenance Record
          </button>
        </div>

        <div style={styles.card}>
          <div style={styles.filterRow}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search records..."
              style={styles.searchInput}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.select}
            >
              <option value="All">All Statuses</option>
              {maintenanceStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Asset</th>
                  <th style={styles.th}>Maintenance Date</th>
                  <th style={styles.th}>Warranty Expiry</th>
                  <th style={styles.th}>Vendor</th>
                  <th style={styles.th}>Cost</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td style={styles.emptyTd} colSpan={7}>
                      No maintenance records found.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td style={styles.td}>{record.assets?.asset_name}</td>
                      <td style={styles.td}>{formatDate(record.maintenance_date)}</td>
                      <td style={styles.td}>{record.warranty_expiry ? formatDate(record.warranty_expiry) : "—"}</td>
                      <td style={styles.td}>{record.vendor}</td>
                      <td style={styles.td}>${record.maintenance_cost.toFixed(2)}</td>
                      <td style={styles.td}>{record.status}</td>
                      <td style={styles.td}>
                        {record.status !== "Completed" && (
                          <button
                            style={styles.completeButton}
                            onClick={() => handleComplete(record.id)}
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

const styles: any = {
  page: {
    padding: 30,
    background: "#f8fafc",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  actionButton: {
    padding: "14px 20px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    padding: 24,
    background: "white",
    borderRadius: 18,
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1.8fr",
    gap: 20,
  },
  card: {
    background: "white",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
  },
  formGrid: {
    display: "grid",
    gap: 14,
    marginTop: 16,
  },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    fontSize: 14,
  },
  select: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    background: "white",
    fontSize: 14,
  },
  textarea: {
    width: "100%",
    minHeight: 120,
    padding: 14,
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    resize: "vertical",
  },
  primaryButton: {
    marginTop: 8,
    padding: "14px 20px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 700,
  },
  filterRow: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    minWidth: 240,
    padding: 14,
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    fontSize: 14,
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 840,
  },
  th: {
    textAlign: "left",
    padding: 16,
    borderBottom: "1px solid #e2e8f0",
    color: "#334155",
    fontSize: 14,
  },
  td: {
    padding: 16,
    borderBottom: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: 14,
  },
  emptyTd: {
    padding: 20,
    textAlign: "center",
    color: "#64748b",
  },
  completeButton: {
    padding: "10px 14px",
    borderRadius: 10,
    background: "#16a34a",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
  },
};
