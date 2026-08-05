"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowDownUp, Download, Loader2, Plus, Search } from "lucide-react";
import { InventoryHeader, InventoryQuickActions } from "../../../components/inventory";
import {
  exportRowsToCsv,
  exportRowsToExcel,
  fetchInventoryItems,
  fetchSuppliers,
  fetchWarehouses,
  inventoryTables,
  safeErrorMessage,
} from "../../../lib/inventory";
import { supabase } from "../../../lib/supabase";
import { useInventoryPermissions, useToast } from "../../../hooks/useInventoryModule";

export default function InventoryStockPage() {
  const permissions = useInventoryPermissions();
  const { toast, showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchInventoryItems>>>([]);
  const [warehouses, setWarehouses] = useState<Awaited<ReturnType<typeof fetchWarehouses>>>([]);
  const [suppliers, setSuppliers] = useState<Awaited<ReturnType<typeof fetchSuppliers>>>([]);
  const [query, setQuery] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"item_name" | "available_quantity" | "updated_at">("updated_at");
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [form, setForm] = useState({
    sku: "",
    item_name: "",
    category: "",
    warehouse_id: "",
    quantity: "0",
    reserved_quantity: "0",
    unit: "Nos",
    purchase_cost: "0",
    supplier_id: "",
    reorder_level: "0",
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [itemRows, warehouseRows, supplierRows] = await Promise.all([
        fetchInventoryItems(),
        fetchWarehouses(),
        fetchSuppliers(),
      ]);
      setRows(itemRows);
      setWarehouses(warehouseRows);
      setSuppliers(supplierRows);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load stock records."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const supplierMap = useMemo(() => {
    const map = new Map<number, string>();
    suppliers.forEach((row) => map.set(row.id, row.name));
    return map;
  }, [suppliers]);

  const warehouseMap = useMemo(() => {
    const map = new Map<number, string>();
    warehouses.forEach((row) => map.set(row.id, row.name));
    return map;
  }, [warehouses]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let result = rows.filter((row) => {
      const searchable = [
        row.sku,
        row.barcode || "",
        row.qr_code || "",
        row.item_name,
        row.category || "",
        row.brand || "",
        row.model || "",
      ]
        .join(" ")
        .toLowerCase();
      const searchOk = !needle || searchable.includes(needle);
      const warehouseOk = warehouseFilter === "all" || String(row.warehouse_id || "") === warehouseFilter;
      const statusOk = statusFilter === "all" || String(row.status || "Unknown") === statusFilter;
      return searchOk && warehouseOk && statusOk;
    });

    result = [...result].sort((left, right) => {
      if (sortBy === "item_name") return String(left.item_name || "").localeCompare(String(right.item_name || ""));
      if (sortBy === "available_quantity") return Number(right.available_quantity || 0) - Number(left.available_quantity || 0);
      return new Date(String(right.updated_at || 0)).getTime() - new Date(String(left.updated_at || 0)).getTime();
    });

    return result;
  }, [rows, query, warehouseFilter, statusFilter, sortBy]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const toggleSelectAllPage = () => {
    const ids = pagedRows.map((row) => row.id);
    const allSelected = ids.every((id) => selected.includes(id));
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelected((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const addStockItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!permissions.canManageStock) return;

    const payload = {
      sku: form.sku.trim(),
      item_name: form.item_name.trim(),
      category: form.category.trim() || null,
      warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
      quantity: Number(form.quantity || 0),
      reserved_quantity: Number(form.reserved_quantity || 0),
      available_quantity: Number(form.quantity || 0) - Number(form.reserved_quantity || 0),
      unit: form.unit || "Nos",
      purchase_cost: Number(form.purchase_cost || 0),
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      reorder_level: Number(form.reorder_level || 0),
      status: "Active",
    };

    if (!payload.sku || !payload.item_name) {
      showToast("SKU and Item Name are required.");
      return;
    }

    const { error: insertError } = await supabase.from(inventoryTables.items).insert([payload]);
    if (insertError) {
      showToast(safeErrorMessage(insertError, "Unable to add inventory item."));
      return;
    }

    setForm({
      sku: "",
      item_name: "",
      category: "",
      warehouse_id: "",
      quantity: "0",
      reserved_quantity: "0",
      unit: "Nos",
      purchase_cost: "0",
      supplier_id: "",
      reorder_level: "0",
    });
    showToast("Inventory item created.");
    void loadData();
  };

  const bulkSetStatus = async (status: string) => {
    if (!permissions.canManageStock || !selected.length) return;
    const { error: updateError } = await supabase.from(inventoryTables.items).update({ status }).in("id", selected);
    if (updateError) {
      showToast(safeErrorMessage(updateError, "Bulk update failed."));
      return;
    }
    showToast(`Updated ${selected.length} record(s).`);
    setSelected([]);
    void loadData();
  };

  const exportCurrent = () => {
    const exportRows = filteredRows.map((row) => ({
      SKU: row.sku,
      Barcode: row.barcode || "",
      "QR Code": row.qr_code || "",
      "Item Name": row.item_name,
      Category: row.category || "",
      Brand: row.brand || "",
      Model: row.model || "",
      Warehouse: warehouseMap.get(row.warehouse_id || 0) || "",
      Quantity: row.quantity,
      "Reserved Quantity": row.reserved_quantity,
      "Available Quantity": row.available_quantity,
      Unit: row.unit || "",
      "Purchase Cost": row.purchase_cost || 0,
      "Inventory Value": Number(row.available_quantity || 0) * Number(row.purchase_cost || 0),
      Supplier: supplierMap.get(row.supplier_id || 0) || "",
      Status: row.status || "",
      "Last Updated": row.updated_at || "",
    }));

    exportRowsToExcel("Stock", exportRows, "inventory-stock.xlsx");
    exportRowsToCsv(exportRows, "inventory-stock.csv");
  };

  return (
    <section style={styles.page}>
      <InventoryHeader
        title="Stock Management"
        subtitle="Central inventory register with SKU tracking, quantity control, and warehouse-level visibility."
        right={
          <InventoryQuickActions
            actions={[
              { label: "Stock Movements", href: "/office/inventory/movements" },
              { label: "Transfers", href: "/office/inventory/transfers" },
              { label: "Reports", href: "/office/inventory/reports" },
            ]}
          />
        }
      />

      <form style={styles.formCard} onSubmit={addStockItem}>
        <h3 style={styles.sectionTitle}><Plus size={14} /> Add Inventory Item</h3>
        <div style={styles.formGrid}>
          <input style={styles.input} placeholder="SKU" value={form.sku} onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))} />
          <input style={styles.input} placeholder="Item Name" value={form.item_name} onChange={(event) => setForm((prev) => ({ ...prev, item_name: event.target.value }))} />
          <input style={styles.input} placeholder="Category" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} />
          <select style={styles.input} value={form.warehouse_id} onChange={(event) => setForm((prev) => ({ ...prev, warehouse_id: event.target.value }))}>
            <option value="">Warehouse</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
            ))}
          </select>
          <input style={styles.input} type="number" placeholder="Quantity" value={form.quantity} onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))} />
          <input style={styles.input} type="number" placeholder="Reserved" value={form.reserved_quantity} onChange={(event) => setForm((prev) => ({ ...prev, reserved_quantity: event.target.value }))} />
          <input style={styles.input} placeholder="Unit" value={form.unit} onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))} />
          <input style={styles.input} type="number" placeholder="Purchase Cost" value={form.purchase_cost} onChange={(event) => setForm((prev) => ({ ...prev, purchase_cost: event.target.value }))} />
          <select style={styles.input} value={form.supplier_id} onChange={(event) => setForm((prev) => ({ ...prev, supplier_id: event.target.value }))}>
            <option value="">Supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
          <input style={styles.input} type="number" placeholder="Reorder Level" value={form.reorder_level} onChange={(event) => setForm((prev) => ({ ...prev, reorder_level: event.target.value }))} />
        </div>
        <button type="submit" style={styles.primaryButton} disabled={!permissions.canManageStock}>Save Item</button>
      </form>

      <div style={styles.toolbar}>
        <label style={styles.searchWrap}>
          <Search size={14} />
          <input style={styles.searchInput} placeholder="Search SKU, barcode, item, brand, model..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <select style={styles.inputSm} value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}>
          <option value="all">All Warehouses</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
          ))}
        </select>
        <select style={styles.inputSm} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All Status</option>
          {["Active", "Inactive", "Hold", "Damaged", "Obsolete"].map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <button type="button" style={styles.secondaryButton} onClick={() => setSortBy((prev) => (prev === "item_name" ? "available_quantity" : prev === "available_quantity" ? "updated_at" : "item_name"))}>
          <ArrowDownUp size={14} /> Sort: {sortBy.replace("_", " ")}
        </button>
        <button type="button" style={styles.secondaryButton} onClick={exportCurrent}>
          <Download size={14} /> Export
        </button>
      </div>

      <div style={styles.bulkToolbar}>
        <button type="button" style={styles.secondaryButton} onClick={toggleSelectAllPage}>Select Page</button>
        <span style={styles.bulkText}>{selected.length} selected</span>
        <button type="button" style={styles.secondaryButton} onClick={() => void bulkSetStatus("Active")}>Set Active</button>
        <button type="button" style={styles.secondaryButton} onClick={() => void bulkSetStatus("Hold")}>Set Hold</button>
        <button type="button" style={styles.secondaryButton} onClick={() => void bulkSetStatus("Damaged")}>Set Damaged</button>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead style={styles.tableHead}>
            <tr>
              {["", "SKU", "Barcode", "QR Code", "Item Name", "Category", "Brand", "Model", "Warehouse", "Bin", "Qty", "Reserved", "Available", "Unit", "Purchase Cost", "Inventory Value", "Supplier", "Status", "Last Updated", "Actions"].map((header) => (
                <th key={header} style={styles.th}>{header || "Select"}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, index) => {
              const inventoryValue = Number(row.available_quantity || 0) * Number(row.purchase_cost || 0);
              const lowStock = Number(row.available_quantity || 0) <= Number(row.reorder_level || 0);
              return (
                <tr key={row.id} style={index % 2 ? styles.altRow : undefined}>
                  <td style={styles.td}>
                    <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelect(row.id)} />
                  </td>
                  <td style={styles.td}>{row.sku}</td>
                  <td style={styles.td}>{row.barcode || "-"}</td>
                  <td style={styles.td}>{row.qr_code || "-"}</td>
                  <td style={styles.td}>{row.item_name}</td>
                  <td style={styles.td}>{row.category || "-"}</td>
                  <td style={styles.td}>{row.brand || "-"}</td>
                  <td style={styles.td}>{row.model || "-"}</td>
                  <td style={styles.td}>{warehouseMap.get(row.warehouse_id || 0) || "-"}</td>
                  <td style={styles.td}>{row.bin_id || "-"}</td>
                  <td style={styles.td}>{row.quantity}</td>
                  <td style={styles.td}>{row.reserved_quantity}</td>
                  <td style={styles.td}>{row.available_quantity}</td>
                  <td style={styles.td}>{row.unit || "Nos"}</td>
                  <td style={styles.td}>${Number(row.purchase_cost || 0).toLocaleString()}</td>
                  <td style={styles.td}>${inventoryValue.toLocaleString()}</td>
                  <td style={styles.td}>{supplierMap.get(row.supplier_id || 0) || "-"}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...(lowStock ? styles.badgeWarn : {}) }}>{row.status || (lowStock ? "Low Stock" : "Active")}</span>
                  </td>
                  <td style={styles.td}>{row.updated_at ? new Date(row.updated_at).toLocaleString() : "-"}</td>
                  <td style={styles.td}>
                    <div style={styles.actionLinks}>
                      <Link href={`/office/inventory/stock/${row.id}`} style={styles.actionLink}>View</Link>
                      <Link href={`/office/inventory/movements?item=${row.id}`} style={styles.actionLink}>Receive</Link>
                      <Link href={`/office/inventory/movements?item=${row.id}&type=Issue`} style={styles.actionLink}>Issue</Link>
                      <Link href={`/office/inventory/transfers?item=${row.id}`} style={styles.actionLink}>Transfer</Link>
                      <Link href={`/office/inventory/movements?item=${row.id}&type=Adjustment`} style={styles.actionLink}>Adjust</Link>
                      <Link href={`/office/inventory/barcode?item=${row.id}`} style={styles.actionLink}>Print Barcode</Link>
                      <Link href={`/office/inventory/barcode?item=${row.id}&type=qr`} style={styles.actionLink}>Print QR</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!pagedRows.length && !isLoading ? <p style={styles.empty}>No stock records found with current filters.</p> : null}
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}
      {isLoading ? (
        <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Loading stock records...</div>
      ) : null}
      {toast ? <div style={styles.toast}>{toast}</div> : null}

      <div style={styles.pagination}>
        <button type="button" style={styles.secondaryButton} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Previous</button>
        <span style={styles.bulkText}>Page {page} / {totalPages}</span>
        <button type="button" style={styles.secondaryButton} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>Next</button>
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  formCard: {
    borderRadius: 14,
    border: "1px solid #dbeafe",
    background: "#ffffff",
    padding: 12,
    display: "grid",
    gap: 10,
  },
  sectionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 8,
  },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "8px 9px",
    fontSize: 13,
    background: "white",
  },
  inputSm: {
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "8px 9px",
    fontSize: 12,
    background: "white",
    minWidth: 140,
  },
  primaryButton: {
    border: "1px solid #1d4ed8",
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "white",
    borderRadius: 10,
    padding: "8px 11px",
    fontWeight: 800,
    fontSize: 12,
    width: "fit-content",
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 10,
    padding: "8px 10px",
    fontWeight: 800,
    fontSize: 12,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  },
  toolbar: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  bulkToolbar: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  bulkText: {
    color: "#475569",
    fontWeight: 700,
    fontSize: 12,
  },
  searchWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "0 8px",
    background: "white",
    minWidth: 240,
  },
  searchInput: {
    border: "none",
    outline: "none",
    padding: "8px 0",
    fontSize: 13,
    width: "100%",
    background: "transparent",
  },
  tableWrap: {
    borderRadius: 14,
    border: "1px solid #dbeafe",
    background: "white",
    overflow: "auto",
    boxShadow: "0 18px 30px rgba(15, 23, 42, 0.06)",
  },
  table: {
    borderCollapse: "collapse",
    width: "100%",
    minWidth: 1700,
  },
  tableHead: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    background: "#eff6ff",
  },
  th: {
    textAlign: "left",
    padding: "10px 10px",
    borderBottom: "1px solid #bfdbfe",
    color: "#1e3a8a",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "9px 10px",
    borderBottom: "1px solid #e2e8f0",
    color: "#0f172a",
    fontSize: 12,
    whiteSpace: "nowrap",
    verticalAlign: "top",
  },
  altRow: {
    background: "#f8fbff",
  },
  badge: {
    borderRadius: 999,
    padding: "4px 8px",
    background: "#e0f2fe",
    color: "#075985",
    fontWeight: 800,
    fontSize: 11,
    border: "1px solid #bae6fd",
  },
  badgeWarn: {
    background: "#ffedd5",
    color: "#9a3412",
    border: "1px solid #fed7aa",
  },
  actionLinks: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  actionLink: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 11,
  },
  loading: {
    borderRadius: 10,
    padding: "8px 10px",
    border: "1px solid #bfdbfe",
    color: "#1e3a8a",
    background: "#eff6ff",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 700,
    width: "fit-content",
  },
  error: {
    borderRadius: 10,
    padding: "8px 10px",
    border: "1px solid #fecaca",
    color: "#9f1239",
    background: "#fff1f2",
    fontWeight: 700,
    width: "fit-content",
  },
  empty: {
    margin: 0,
    padding: "12px",
    color: "#64748b",
    fontSize: 13,
    fontWeight: 700,
  },
  toast: {
    position: "fixed",
    right: 24,
    bottom: 24,
    zIndex: 20,
    borderRadius: 10,
    background: "#1d4ed8",
    color: "white",
    padding: "10px 12px",
    boxShadow: "0 14px 25px rgba(15, 23, 42, 0.24)",
    fontWeight: 700,
    fontSize: 12,
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
};

