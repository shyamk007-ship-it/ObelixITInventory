"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { ticketCategories, ticketPriorities } from "../../../lib/helpdesk";

export default function ReportsPage() {
  const [ticketCount, setTicketCount] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [maintenanceCount, setMaintenanceCount] = useState(0);
  const [warrantySoon, setWarrantySoon] = useState(0);
  const [ticketCategoriesSummary, setTicketCategoriesSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    const [{ data: ticketsData }, { data: maintenanceData }, { data: assetsData }] = await Promise.all([
      supabase.from("tickets").select("id, category, status"),
      supabase.from("asset_maintenance").select("id"),
      supabase.from("assets").select("id, warranty_expiry"),
    ]);

    setTicketCount(ticketsData?.length || 0);
    setOpenTickets((ticketsData || []).filter((ticket) => ticket.status === "Open").length);
    setMaintenanceCount(maintenanceData?.length || 0);

    const soon = (assetsData || []).filter((asset) => {
      if (!asset.warranty_expiry) return false;
      const target = new Date(asset.warranty_expiry);
      const now = new Date();
      const delta = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return delta >= 0 && delta <= 30;
    }).length;
    setWarrantySoon(soon);

    const categoryCounts: Record<string, number> = {};
    (ticketsData || []).forEach((ticket) => {
      const category = ticket.category || "Other";
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    ticketCategories.forEach((category) => {
      if (!(category in categoryCounts)) {
        categoryCounts[category] = 0;
      }
    });
    setTicketCategoriesSummary(categoryCounts);
  };

  const downloadCsv = async (table: string, fileName: string) => {
    const { data, error } = await supabase.from(table).select("*");
    if (error || !data) {
      alert(error?.message || "Export failed.");
      return;
    }

    const rows = [Object.keys(data[0] || {}).join(",")];
    rows.push(
      ...data.map((row: Record<string, any>) =>
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

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1>Reports</h1>
          <p>Generate export files and review support trends for leadership.</p>
        </div>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <p>Total Tickets</p>
          <strong>{ticketCount}</strong>
        </div>
        <div style={styles.statCard}>
          <p>Open Tickets</p>
          <strong>{openTickets}</strong>
        </div>
        <div style={styles.statCard}>
          <p>Maintenance Records</p>
          <strong>{maintenanceCount}</strong>
        </div>
        <div style={styles.statCard}>
          <p>Warranty Expiring Soon</p>
          <strong>{warrantySoon}</strong>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.sectionHeader}>
          <h2>Ticket Categories</h2>
          <div style={styles.exports}>
            <button
              onClick={() => downloadCsv("tickets", "tickets-report.csv")}
              style={styles.exportButton}
            >
              Export Tickets
            </button>
            <button
              onClick={() => downloadCsv("asset_maintenance", "maintenance-report.csv")}
              style={styles.exportButton}
            >
              Export Maintenance
            </button>
          </div>
        </div>
        <div style={styles.categoryGrid}>
          {Object.entries(ticketCategoriesSummary).map(([category, count]) => (
            <div key={category} style={styles.categoryCard}>
              <p>{category}</p>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </div>
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
    marginBottom: 24,
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
    boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
  },
  card: {
    padding: 24,
    background: "white",
    borderRadius: 20,
    boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    gap: 16,
  },
  exports: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  exportButton: {
    padding: "12px 18px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
  },
  categoryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
  },
  categoryCard: {
    padding: 20,
    borderRadius: 18,
    background: "#f8fafc",
    textAlign: "center",
  },
};
