"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ticketCategories, ticketPriorities, ticketStatuses } from "../../lib/helpdesk";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

const EXPORT_TYPES = {
  tickets: "Tickets",
  assets: "Assets",
  maintenance: "Maintenance",
};

const toDateKey = (date?: string) => (date ? new Date(date).toISOString().slice(0, 10) : "");

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [stats, setStats] = useState<any>({
    totalAssets: 0,
    assignedAssets: 0,
    availableAssets: 0,
    employeeAssets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    criticalIssues: 0,
    maintenanceDue: 0,
    warrantyExpiring: 0,
  });
  const [assetBreakdown, setAssetBreakdown] = useState<any[]>([]);
  const [employeeAssetReport, setEmployeeAssetReport] = useState<any[]>([]);
  const [maintenanceReport, setMaintenanceReport] = useState<any[]>([]);
  const [warrantyReport, setWarrantyReport] = useState<any[]>([]);
  const [warrantyTrend, setWarrantyTrend] = useState<any[]>([]);
  const [ticketStatusReport, setTicketStatusReport] = useState<any[]>([]);
  const [ticketPriorityReport, setTicketPriorityReport] = useState<any[]>([]);
  const [assetSummary, setAssetSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    loadReports();
  }, [fromDate, toDate]);

  const dateFilter = (dateField: string, row: any) => {
    if (!fromDate && !toDate) return true;
    const rowDate = row[dateField] ? new Date(row[dateField]).getTime() : null;
    if (!rowDate) return false;
    const from = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : -Infinity;
    const to = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
    return rowDate >= from && rowDate <= to;
  };

  const loadReports = async () => {
    setLoading(true);

    const [
      { data: assetData },
      { data: assignmentData },
      { data: employeeData },
      { data: maintenanceData },
      { data: ticketData },
    ] = await Promise.all([
      supabase.from("assets").select("id, asset_name, status, warranty_expiry"),
      supabase.from("asset_assignments").select("id, status, employee_id, asset_id, assigned_date, returned_date, assets(asset_name), employees(full_name)"),
      supabase.from("employees").select("id, full_name"),
      supabase.from("asset_maintenance").select("id, asset_id, maintenance_date, status, assets(asset_name), vendor"),
      supabase.from("tickets").select("id, title, category, priority, status, created_at"),
    ]);

    const assets = assetData || [];
    const assignments = assignmentData || [];
    const employees = employeeData || [];
    const maintenance = maintenanceData || [];
    const tickets = ticketData || [];

    const totalAssets = assets.length;
    const assignedAssets = assets.filter((asset) => asset.status === "Assigned").length;
    const availableAssets = assets.filter((asset) => asset.status === "Available").length;

    const statusCounts = ticketStatuses.map((status) => ({
      name: status,
      value: tickets.filter((ticket) => ticket.status === status && dateFilter("created_at", ticket)).length,
    }));

    const priorityCounts = ticketPriorities.map((priority) => ({
      name: priority,
      value: tickets.filter((ticket) => ticket.priority === priority && dateFilter("created_at", ticket)).length,
    }));

    const criticalIssues = tickets.filter((ticket) => ticket.priority === "Critical" && dateFilter("created_at", ticket)).length;
    const resolvedTickets = tickets.filter((ticket) => ticket.status === "Resolved" && dateFilter("created_at", ticket)).length;
    const openTickets = tickets.filter((ticket) => ticket.status === "Open" && dateFilter("created_at", ticket)).length;

    const assetUtilization = [
      { name: "Assigned", value: assignedAssets },
      { name: "Available", value: availableAssets },
      { name: "Other", value: Math.max(totalAssets - assignedAssets - availableAssets, 0) },
    ];

    const employeeAssetCounts: Record<string, number> = {};
    assignments.forEach((assignment) => {
      if (assignment.status !== "Assigned") return;
      const employeeName = assignment.employees?.[0]?.full_name || "Unassigned";
      employeeAssetCounts[employeeName] = (employeeAssetCounts[employeeName] || 0) + 1;
    });

    const employeeReport = employees.map((employee) => ({
      name: employee.full_name,
      assets: employeeAssetCounts[employee.full_name] || 0,
    })).sort((a, b) => b.assets - a.assets);

    const maintenanceReportItems = maintenance
      .filter((record) => dateFilter("maintenance_date", record))
      .map((record) => ({
        id: record.id,
        asset: record.assets?.[0]?.asset_name || "Asset",
        date: record.maintenance_date,
        status: record.status,
        vendor: record.vendor || "-",
      }));

    const warrantyItems = assets
      .filter((asset) => dateFilter("warranty_expiry", asset) && asset.warranty_expiry)
      .map((asset) => ({
        id: asset.id,
        asset: asset.asset_name,
        warrantyExpiry: asset.warranty_expiry,
      }));

    const warrantySoon = assets.filter((asset) => {
      if (!asset.warranty_expiry) return false;
      const expiry = new Date(asset.warranty_expiry);
      const now = new Date();
      const delta = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return delta >= 0 && delta <= 30;
    }).length;

    const warrantyTrend: Record<string, number> = {};
    warrantyItems.forEach((item) => {
      const month = new Date(item.warrantyExpiry).toLocaleString("default", { month: "short", year: "numeric" });
      warrantyTrend[month] = (warrantyTrend[month] || 0) + 1;
    });

    setStats({
      totalAssets,
      assignedAssets,
      availableAssets,
      employeeAssets: employeeReport.reduce((total, row) => total + row.assets, 0),
      openTickets,
      resolvedTickets,
      criticalIssues,
      maintenanceDue: maintenanceReportItems.length,
      warrantyExpiring: warrantySoon,
    });

    setAssetBreakdown(assetUtilization);
    setEmployeeAssetReport(employeeReport);
    setMaintenanceReport(maintenanceReportItems);
    setWarrantyReport(warrantyItems);
    setWarrantyTrend(Object.entries(warrantyTrend).map(([name, value]) => ({ name, value })));
    setTicketStatusReport(statusCounts);
    setTicketPriorityReport(priorityCounts);
    setAssetSummary([
      { label: "Assigned", value: assignedAssets },
      { label: "Available", value: availableAssets },
      { label: "Other", value: Math.max(totalAssets - assignedAssets - availableAssets, 0) },
    ]);
    setLoading(false);
  };

  const downloadCsvFromData = (data: any[], fileName: string) => {
    if (!data.length) {
      alert("No data to export.");
      return;
    }

    const rows = [Object.keys(data[0]).join(",")];
    rows.push(
      ...data.map((row) =>
        Object.values(row)
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
    );

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async (title: string, data: any[]) => {
    const jsPDFModule = await import("jspdf");
    const { jsPDF } = jsPDFModule;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 22);
    doc.setFontSize(10);

    const headers = Object.keys(data[0] || {});
    doc.text(headers.join(" | "), 14, 32);

    data.slice(0, 20).forEach((row, index) => {
      const rowText = Object.values(row).map((value) => String(value ?? "")).join(" | ");
      const y = 40 + index * 8;
      if (y > 280) return;
      doc.text(rowText, 14, y);
    });

    doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
  };

  const exportExcel = async (sheetName: string, data: any[]) => {
    const xlsx = await import("xlsx");
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    xlsx.writeFile(workbook, `${sheetName.replace(/\s+/g, "_")}.xlsx`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1>Reports & Analytics</h1>
          <p>Track asset performance, ticket health, and maintenance insight for your team.</p>
        </div>
        <div style={styles.filterPanel}>
          <label style={styles.label}>
            From
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={styles.dateInput} />
          </label>
          <label style={styles.label}>
            To
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={styles.dateInput} />
          </label>
          <button onClick={() => { setFromDate(""); setToDate(""); }} style={styles.clearButton}>
            Clear
          </button>
        </div>
      </div>

      <div style={styles.statsRow}>
        {[
          { label: "Total Assets", value: stats.totalAssets },
          { label: "Assigned Assets", value: stats.assignedAssets },
          { label: "Open Tickets", value: stats.openTickets },
          { label: "Resolved Tickets", value: stats.resolvedTickets },
          { label: "Critical Issues", value: stats.criticalIssues },
          { label: "Maintenance Due", value: stats.maintenanceDue },
          { label: "Warranty Expiring", value: stats.warrantyExpiring },
        ].map((card) => (
          <div key={card.label} style={styles.statCard}>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>

      <div style={styles.gridPane}>
        <div style={styles.panelCard}>
          <div style={styles.panelHeader}>
            <h2>Asset Utilization</h2>
            <div style={styles.actionGroup}>
              <button onClick={() => downloadCsvFromData(assetSummary, "asset_utilization.csv")} style={styles.actionButton}>Export CSV</button>
              <button onClick={() => exportExcel("Asset_Utilization", assetSummary)} style={styles.actionButton}>Export Excel</button>
            </div>
          </div>
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={assetSummary} margin={{ top: 16, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.panelCard}>
          <div style={styles.panelHeader}>
            <h2>Ticket Status</h2>
            <div style={styles.actionGroup}>
              <button onClick={() => downloadCsvFromData(ticketStatusReport, "ticket_status_report.csv")} style={styles.actionButton}>Export CSV</button>
              <button onClick={() => exportPdf("Ticket Status", ticketStatusReport)} style={styles.actionButton}>Export PDF</button>
            </div>
          </div>
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={ticketStatusReport} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} fill="#2563eb" label>
                  {ticketStatusReport.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={["#2563eb", "#f59e0b", "#10b981", "#8b5cf6"][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={styles.gridPane}>
        <div style={styles.panelCard}>
          <div style={styles.panelHeader}>
            <h2>Employee Asset Report</h2>
            <button onClick={() => exportExcel("Employee_Asset_Report", employeeAssetReport)} style={styles.actionButton}>Export Excel</button>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Assigned Assets</th>
                </tr>
              </thead>
              <tbody>
                {employeeAssetReport.map((row) => (
                  <tr key={row.name}>
                    <td style={styles.td}>{row.name}</td>
                    <td style={styles.td}>{row.assets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={styles.panelCard}>
          <div style={styles.panelHeader}>
            <h2>Ticket Priorities</h2>
            <button onClick={() => downloadCsvFromData(ticketPriorityReport, "ticket_priority_report.csv")} style={styles.actionButton}>Export CSV</button>
          </div>
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ticketPriorityReport} margin={{ top: 16, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#ec4899" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={styles.gridPane}>
        <div style={styles.panelCardFull}>
          <div style={styles.panelHeader}>
            <h2>Maintenance Report</h2>
            <div style={styles.actionGroup}>
              <button onClick={() => downloadCsvFromData(maintenanceReport, "maintenance_report.csv")} style={styles.actionButton}>Export CSV</button>
              <button onClick={() => exportExcel("Maintenance_Report", maintenanceReport)} style={styles.actionButton}>Export Excel</button>
            </div>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Asset</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Vendor</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceReport.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>{item.asset}</td>
                    <td style={styles.td}>{new Date(item.date).toLocaleDateString()}</td>
                    <td style={styles.td}>{item.status}</td>
                    <td style={styles.td}>{item.vendor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={styles.gridPane}>
        <div style={styles.panelCard}>
          <div style={styles.panelHeader}>
            <h2>Warranty Expiry Report</h2>
            <button onClick={() => downloadCsvFromData(warrantyReport, "warranty_report.csv")} style={styles.actionButton}>Export CSV</button>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Asset</th>
                  <th style={styles.th}>Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {warrantyReport.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>{item.asset}</td>
                    <td style={styles.td}>{new Date(item.warrantyExpiry).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={styles.panelCard}>
          <div style={styles.panelHeader}>
            <h2>Warranty Trend</h2>
            <div style={styles.actionGroup}>
              <button onClick={() => exportPdf("Warranty_Trend", warrantyReport)} style={styles.actionButton}>Export PDF</button>
            </div>
          </div>
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={warrantyTrend} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {warrantyTrend.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={["#0ea5e9", "#f97316", "#22c55e", "#a855f7"][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {loading && <div style={styles.loadingOverlay}>Loading report analytics...</div>}
    </div>
  );
}

const styles: any = {
  page: {
    padding: 30,
    background: "#f8fafc",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 24,
    alignItems: "center",
  },
  filterPanel: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  label: {
    display: "grid",
    gap: 6,
    color: "#475569",
    fontSize: 14,
  },
  dateInput: {
    padding: 10,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    minWidth: 160,
    fontSize: 14,
  },
  clearButton: {
    padding: "12px 18px",
    background: "transparent",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    cursor: "pointer",
    color: "#334155",
    fontWeight: 700,
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    padding: 24,
    background: "white",
    borderRadius: 18,
    boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
  },
  gridPane: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
    gap: 20,
    marginBottom: 24,
  },
  panelCard: {
    background: "white",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
    minHeight: 360,
  },
  panelCardFull: {
    gridColumn: "1 / -1",
    background: "white",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 18,
  },
  actionGroup: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  actionButton: {
    padding: "10px 16px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
  },
  chartWrapper: {
    width: "100%",
    minHeight: 260,
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 620,
    fontSize: 14,
  },
  th: {
    padding: 16,
    background: "#f8fafc",
    color: "#334155",
    textAlign: "left",
    fontWeight: 700,
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: 16,
    borderBottom: "1px solid #e2e8f0",
    color: "#475569",
  },
  loadingOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.12)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#0f172a",
    fontSize: 18,
    zIndex: 50,
  },
};
