"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import OfficeAssetModuleNav from "../../../components/office/OfficeAssetModuleNav";
import { supabase } from "../../../lib/supabase";

type ReportType =
  | "asset-register"
  | "department-assets"
  | "employee-assets"
  | "warranty"
  | "vendor"
  | "maintenance"
  | "disposal";

export default function OfficeAssetReportsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [disposals, setDisposals] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportType>("asset-register");

  useEffect(() => {
    const load = async () => {
      const assetResponse = await supabase.from("assets").select("*").is("vessel_id", null).order("asset_name", { ascending: true });
      const assetIds = ((assetResponse.data || []) as Array<{ id: number }>).map((row) => row.id);

      const [assignmentResponse, maintenanceResponse, disposalResponse, poResponse] = assetIds.length
        ? await Promise.all([
            supabase.from("assignment_records").select("*, assets(asset_name, asset_tag), employees(full_name)").in("asset_id", assetIds),
            supabase.from("asset_maintenance").select("*, assets(asset_name, asset_tag)").in("asset_id", assetIds),
            supabase.from("asset_disposals").select("*, assets(asset_name, asset_tag)").in("asset_id", assetIds),
            supabase.from("asset_purchase_orders").select("*").order("purchase_date", { ascending: false }),
          ])
        : [
            { data: [] },
            { data: [] },
            { data: [] },
            { data: [] },
          ];

      setAssets(assetResponse.data || []);
      setAssignments(assignmentResponse.data || []);
      setMaintenance(maintenanceResponse.data || []);
      setDisposals(disposalResponse.data || []);
      setPurchaseOrders(poResponse.data || []);
    };

    void load();
  }, []);

  const reportData = useMemo(() => {
    switch (selectedReport) {
      case "asset-register":
        return assets.map((asset) => ({
          asset_id: asset.asset_tag,
          asset_name: asset.asset_name,
          category: asset.category || "",
          status: asset.status || "",
          purchase_cost: asset.purchase_cost || "",
          warranty_expiry: asset.warranty_expiry || "",
        }));
      case "department-assets": {
        const bucket = new Map<string, number>();
        assignments.forEach((row) => {
          const department = row.employees?.department || "Unassigned";
          bucket.set(department, (bucket.get(department) || 0) + 1);
        });
        return Array.from(bucket.entries()).map(([department, assetsCount]) => ({ department, assets: assetsCount }));
      }
      case "employee-assets": {
        const bucket = new Map<string, number>();
        assignments.forEach((row) => {
          const employee = row.employees?.full_name || "Unknown";
          bucket.set(employee, (bucket.get(employee) || 0) + 1);
        });
        return Array.from(bucket.entries()).map(([employee, assetsCount]) => ({ employee, assets: assetsCount }));
      }
      case "warranty":
        return assets
          .filter((asset) => asset.warranty_expiry)
          .map((asset) => ({
            asset_id: asset.asset_tag,
            asset_name: asset.asset_name,
            warranty_expiry: asset.warranty_expiry,
            status: asset.status || "",
          }));
      case "vendor":
        return purchaseOrders.map((row) => ({
          vendor: row.vendor_name || "",
          po_number: row.po_number || "",
          total_amount: row.total_amount || 0,
          purchase_date: row.purchase_date || "",
          status: row.status || "",
        }));
      case "maintenance":
        return maintenance.map((row) => ({
          asset: row.assets?.asset_name || "",
          maintenance_date: row.maintenance_date || "",
          vendor: row.vendor || "",
          cost: row.maintenance_cost || 0,
          status: row.status || "",
        }));
      case "disposal":
        return disposals.map((row) => ({
          asset: row.assets?.asset_name || "",
          disposal_date: row.disposal_date || "",
          method: row.method || "",
          recovery_value: row.sale_value || 0,
          remarks: row.remarks || "",
        }));
      default:
        return [];
    }
  }, [assets, assignments, disposals, maintenance, purchaseOrders, selectedReport]);

  const exportExcel = () => {
    if (!reportData.length) return;
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, selectedReport);
    XLSX.writeFile(workbook, `${selectedReport}.xlsx`);
  };

  const exportPdf = () => {
    if (!reportData.length) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Office Asset Report: ${selectedReport}`, 14, 16);
    doc.setFontSize(9);

    const keys = Object.keys(reportData[0]);
    doc.text(keys.join(" | "), 14, 26);

    reportData.slice(0, 35).forEach((row, index) => {
      const y = 34 + index * 7;
      doc.text(keys.map((key) => String(row[key] ?? "")).join(" | "), 14, y);
    });

    doc.save(`${selectedReport}.pdf`);
  };

  return (
    <div style={styles.page}>
      <OfficeAssetModuleNav />

      <section style={styles.headerCard}>
        <div>
          <p style={styles.eyebrow}>Reports</p>
          <h2 style={styles.title}>Professional Asset Reports</h2>
          <p style={styles.subtitle}>Generate register, department, employee, warranty, vendor, maintenance, and disposal reports.</p>
        </div>
        <div style={styles.headerActions}>
          <select value={selectedReport} onChange={(event) => setSelectedReport(event.target.value as ReportType)} style={styles.input}>
            <option value="asset-register">Asset Register</option>
            <option value="department-assets">Department Assets</option>
            <option value="employee-assets">Employee Assets</option>
            <option value="warranty">Warranty Report</option>
            <option value="vendor">Vendor Report</option>
            <option value="maintenance">Maintenance Report</option>
            <option value="disposal">Disposal Report</option>
          </select>
          <button style={styles.secondaryButton} onClick={exportExcel}>Export Excel</button>
          <button style={styles.primaryButton} onClick={exportPdf}>Export PDF</button>
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {Object.keys(reportData[0] || { no_data: "" }).map((key) => (
                  <th key={key} style={styles.th}>{key.replaceAll("_", " ")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.length === 0 ? (
                <tr><td style={styles.empty}>No data available for selected report.</td></tr>
              ) : (
                reportData.map((row, index) => (
                  <tr key={`row-${index}`}>
                    {Object.keys(row).map((key) => (
                      <td key={`${index}-${key}`} style={styles.td}>{String(row[key] ?? "")}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 14 },
  headerCard: { background: "white", borderRadius: 14, border: "1px solid #dbeafe", padding: 14, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  eyebrow: { margin: 0, color: "#0369a1", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" },
  title: { margin: "6px 0", color: "#0f172a", fontWeight: 900, fontSize: 24 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 700 },
  headerActions: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  input: { minWidth: 240, borderRadius: 10, border: "1px solid #cbd5e1", padding: "10px 12px", fontSize: 13, background: "white" },
  primaryButton: { border: "none", borderRadius: 10, background: "#2563eb", color: "white", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  secondaryButton: { border: "1px solid #cbd5e1", borderRadius: 10, background: "#f8fafc", color: "#0f172a", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  card: { background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 12 },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
  th: { textAlign: "left", padding: 10, background: "#f8fafc", fontSize: 12, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.06em" },
  td: { padding: 10, borderTop: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, verticalAlign: "top" },
  empty: { textAlign: "center", padding: 20, color: "#64748b" },
};
