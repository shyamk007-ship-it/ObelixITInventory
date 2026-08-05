"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { InventoryDataTable, InventoryHeader } from "../../../components/inventory";
import {
  exportRowsToCsv,
  exportRowsToExcel,
  exportRowsToPdf,
  fetchInventoryItems,
  fetchStockMovements,
  fetchStockRequests,
  fetchSuppliers,
  safeErrorMessage,
} from "../../../lib/inventory";

export default function InventoryReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState("Inventory Valuation Report");
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchInventoryItems>>>([]);
  const [movements, setMovements] = useState<Awaited<ReturnType<typeof fetchStockMovements>>>([]);
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof fetchStockRequests>>>([]);
  const [suppliers, setSuppliers] = useState<Awaited<ReturnType<typeof fetchSuppliers>>>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [itemRows, movementRows, requestRows, supplierRows] = await Promise.all([
          fetchInventoryItems(),
          fetchStockMovements(500),
          fetchStockRequests(400),
          fetchSuppliers(),
        ]);
        if (!active) return;
        setItems(itemRows);
        setMovements(movementRows);
        setRequests(requestRows);
        setSuppliers(supplierRows);
      } catch (loadError) {
        if (!active) return;
        setError(safeErrorMessage(loadError, "Unable to load inventory reports."));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const reportRows = useMemo(() => {
    if (reportType === "Inventory Valuation Report") {
      return items.map((row) => ({
        SKU: row.sku,
        Item: row.item_name,
        Category: row.category || "-",
        Available: row.available_quantity,
        "Unit Cost": row.purchase_cost || 0,
        "Inventory Value": Number(row.available_quantity || 0) * Number(row.purchase_cost || 0),
      }));
    }

    if (reportType === "Stock Movement Report") {
      return movements.map((row) => ({
        Date: row.created_at ? new Date(row.created_at).toLocaleString() : "-",
        Type: row.movement_type,
        Item: row.inventory_items?.item_name || row.inventory_item_id,
        Quantity: row.quantity,
        Reference: row.reference_number || "-",
        Status: row.status || "Posted",
      }));
    }

    if (reportType === "Supplier Report") {
      return suppliers.map((row) => ({
        Supplier: row.name,
        Rating: row.rating || 0,
        DeliveryPerformance: row.on_time_delivery_rate || 0,
        Contact: row.contact_person || "-",
        Phone: row.phone || "-",
        Email: row.email || "-",
      }));
    }

    if (reportType === "Low Stock Report") {
      return items
        .filter((row) => Number(row.available_quantity || 0) <= Number(row.reorder_level || 0))
        .map((row) => ({
          SKU: row.sku,
          Item: row.item_name,
          Available: row.available_quantity,
          Reorder: row.reorder_level || 0,
          Critical: Number(row.available_quantity || 0) <= Number(row.safety_stock || 0) ? "Yes" : "No",
        }));
    }

    if (reportType === "Dead Stock Report") {
      const issuedSet = new Set(movements.filter((row) => row.movement_type === "Issue").map((row) => row.inventory_item_id));
      return items.filter((row) => !issuedSet.has(row.id) && Number(row.available_quantity || 0) > 0).map((row) => ({
        SKU: row.sku,
        Item: row.item_name,
        Available: row.available_quantity,
        Value: Number(row.available_quantity || 0) * Number(row.purchase_cost || 0),
      }));
    }

    if (reportType === "ABC Analysis Report") {
      return items
        .map((row) => ({
          SKU: row.sku,
          Item: row.item_name,
          Value: Number(row.available_quantity || 0) * Number(row.purchase_cost || 0),
        }))
        .sort((a, b) => b.Value - a.Value)
        .map((row, index) => ({
          ...row,
          Class: index < Math.ceil(items.length * 0.2) ? "A" : index < Math.ceil(items.length * 0.5) ? "B" : "C",
        }));
    }

    if (reportType === "Forecast Report") {
      return requests.map((row) => ({
        Request: row.request_number,
        Department: row.requester_department || "-",
        Priority: row.priority || "Normal",
        Status: row.status || "Pending",
        ForecastHint: "Use demand trend from request volume and movement history",
      }));
    }

    return [] as Array<Record<string, string | number>>;
  }, [items, movements, requests, suppliers, reportType]);

  const columns = reportRows.length ? Object.keys(reportRows[0]) : ["No data"];

  const exportAll = () => {
    const safeName = reportType.toLowerCase().replace(/\s+/g, "-");
    exportRowsToExcel("Inventory Report", reportRows, `${safeName}.xlsx`);
    exportRowsToCsv(reportRows, `${safeName}.csv`);
    exportRowsToPdf(reportType, reportRows, `${safeName}.pdf`);
  };

  return (
    <section style={styles.page}>
      <InventoryHeader title="Inventory Reports" subtitle="Generate valuation, movement, warehouse, supplier, consumption, low stock, dead stock, ABC analysis, and forecast reports with export controls." />

      <div style={styles.toolbar}>
        <select style={styles.input} value={reportType} onChange={(event) => setReportType(event.target.value)}>
          {[
            "Inventory Valuation Report",
            "Stock Movement Report",
            "Warehouse Report",
            "Supplier Report",
            "Consumption Report",
            "Low Stock Report",
            "Dead Stock Report",
            "ABC Analysis Report",
            "Forecast Report",
          ].map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <button type="button" style={styles.button} onClick={exportAll}><FileDown size={14} /> Export PDF / Excel / CSV</button>
      </div>

      <InventoryDataTable columns={columns} rows={reportRows} />

      {isLoading ? <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Generating report data...</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  toolbar: { display: "flex", flexWrap: "wrap", gap: 8 },
  input: { border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 9px", fontSize: 13, minWidth: 260 },
  button: {
    border: "1px solid #1d4ed8",
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "white",
    borderRadius: 10,
    padding: "8px 11px",
    fontWeight: 800,
    fontSize: 12,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  },
  loading: { borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", padding: "8px 10px", display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 700 },
  error: { borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: "8px 10px", fontWeight: 700 },
};

