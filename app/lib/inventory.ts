import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { supabase } from "./supabase";

export type MovementType = "Receive" | "Issue" | "Transfer" | "Return" | "Adjustment" | "Damage" | "Lost" | "Disposal";

export interface InventoryItemRow {
  id: number;
  asset_id?: number | null;
  sku: string;
  barcode?: string | null;
  qr_code?: string | null;
  item_name: string;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  warehouse_id?: number | null;
  bin_id?: number | null;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  unit?: string | null;
  purchase_cost?: number | null;
  supplier_id?: number | null;
  min_stock?: number | null;
  max_stock?: number | null;
  safety_stock?: number | null;
  reorder_level?: number | null;
  status?: string | null;
  specifications?: string | null;
  images?: string[] | null;
  documents?: string[] | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  warehouses?: { id: number; name: string } | null;
  suppliers?: { id: number; name: string } | null;
}

export interface WarehouseRow {
  id: number;
  code: string;
  name: string;
  location?: string | null;
  manager_employee_id?: number | null;
  capacity_units?: number | null;
  status?: string | null;
  created_at?: string | null;
}

export interface CategoryRow {
  id: number;
  name: string;
  parent_id?: number | null;
  description?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface SupplierRow {
  id: number;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  rating?: number | null;
  on_time_delivery_rate?: number | null;
}

export interface StockMovementRow {
  id: number;
  inventory_item_id: number;
  movement_type: MovementType;
  quantity: number;
  warehouse_id?: number | null;
  to_warehouse_id?: number | null;
  reference_number?: string | null;
  status?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  inventory_items?: { item_name?: string | null; sku?: string | null } | null;
  warehouses?: { name?: string | null } | null;
}

export interface StockRequestRow {
  id: number;
  request_number: string;
  request_type?: string | null;
  requester_employee_id?: number | null;
  requester_department?: string | null;
  status?: string | null;
  priority?: string | null;
  required_date?: string | null;
  notes?: string | null;
  created_at?: string | null;
  approved_by_employee_id?: number | null;
}

export interface StockTransferRow {
  id: number;
  transfer_number: string;
  inventory_item_id: number;
  from_warehouse_id: number;
  to_warehouse_id: number;
  quantity: number;
  status?: string | null;
  transfer_type?: string | null;
  requested_by_employee_id?: number | null;
  approved_by_employee_id?: number | null;
  notes?: string | null;
  created_at?: string | null;
  inventory_items?: { item_name?: string | null; sku?: string | null } | null;
}

export interface PurchaseReceiptRow {
  id: number;
  grn_number: string;
  po_number?: string | null;
  supplier_id?: number | null;
  receipt_date?: string | null;
  invoice_number?: string | null;
  invoice_url?: string | null;
  delivery_note_url?: string | null;
  status?: string | null;
  remarks?: string | null;
  created_at?: string | null;
}

export interface ConsumableRow {
  id: number;
  inventory_item_id?: number | null;
  item_name: string;
  monthly_usage?: number | null;
  department_usage?: Record<string, number> | null;
  forecast_next_month?: number | null;
  status?: string | null;
  created_at?: string | null;
}

export interface InventoryAuditRow {
  id: number;
  audit_number: string;
  warehouse_id?: number | null;
  audit_date?: string | null;
  status?: string | null;
  variance_count?: number | null;
  missing_count?: number | null;
  damaged_count?: number | null;
  signature_name?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface CycleCountRow {
  id: number;
  count_number: string;
  abc_class?: string | null;
  count_type?: string | null;
  scheduled_date?: string | null;
  status?: string | null;
  variance_value?: number | null;
  approved_by_employee_id?: number | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface InventorySettingRow {
  id: number;
  key: string;
  value: string;
  value_type?: string | null;
  updated_at?: string | null;
}

export interface InventoryDashboardData {
  items: InventoryItemRow[];
  warehouses: WarehouseRow[];
  categories: CategoryRow[];
  suppliers: SupplierRow[];
  movements: StockMovementRow[];
  requests: StockRequestRow[];
  transfers: StockTransferRow[];
  receipts: PurchaseReceiptRow[];
  consumables: ConsumableRow[];
  audits: InventoryAuditRow[];
}

export const inventoryTables = {
  items: "inventory_items",
  categories: "inventory_categories",
  warehouses: "warehouses",
  bins: "warehouse_bins",
  movements: "stock_movements",
  requests: "stock_requests",
  transfers: "stock_transfers",
  receipts: "purchase_receipts",
  consumables: "consumables",
  audits: "inventory_audits",
  cycleCounts: "cycle_counts",
  reports: "inventory_reports",
  settings: "inventory_settings",
} as const;

export const safeErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message || "").trim();
    return message || fallback;
  }
  return fallback;
};

const monthLabel = (value?: string | null) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
};

export async function fetchInventoryItems() {
  const { data, error } = await supabase
    .from(inventoryTables.items)
    .select("id, asset_id, sku, barcode, qr_code, item_name, category, brand, model, warehouse_id, bin_id, quantity, reserved_quantity, available_quantity, unit, purchase_cost, supplier_id, min_stock, max_stock, safety_stock, reorder_level, status, specifications, images, documents, notes, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data || []) as InventoryItemRow[];
}

export async function fetchWarehouses() {
  const { data, error } = await supabase
    .from(inventoryTables.warehouses)
    .select("id, code, name, location, manager_employee_id, capacity_units, status, created_at")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as WarehouseRow[];
}

export async function fetchInventoryCategories() {
  const [inventoryResponse, legacyResponse] = await Promise.all([
    supabase.from(inventoryTables.categories).select("id, name, parent_id, description, is_active, created_at").order("name", { ascending: true }),
    supabase.from("asset_categories").select("id, name, description, is_active, created_at").order("name", { ascending: true }),
  ]);

  if (inventoryResponse.error && legacyResponse.error) {
    throw inventoryResponse.error;
  }

  const inventoryRows = (inventoryResponse.data || []) as CategoryRow[];
  const existingNames = new Set(inventoryRows.map((row) => row.name.toLowerCase()));
  const legacyRows = ((legacyResponse.data || []) as Array<{ id: number; name: string; description?: string | null; is_active?: boolean | null; created_at?: string | null }>).filter(
    (row) => !existingNames.has(String(row.name || "").toLowerCase())
  );

  const normalizedLegacy: CategoryRow[] = legacyRows.map((row) => ({
    id: row.id + 100000,
    name: row.name,
    parent_id: null,
    description: row.description || null,
    is_active: row.is_active ?? true,
    created_at: row.created_at,
  }));

  return [...inventoryRows, ...normalizedLegacy];
}

export async function fetchSuppliers() {
  const { data, error } = await supabase
    .from("asset_vendors")
    .select("id, name, contact_person, email, phone, address, rating, on_time_delivery_rate")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as SupplierRow[];
}

export async function fetchStockMovements(limit = 400) {
  const { data, error } = await supabase
    .from(inventoryTables.movements)
    .select("id, inventory_item_id, movement_type, quantity, warehouse_id, to_warehouse_id, reference_number, status, notes, created_by, created_at, inventory_items(item_name, sku), warehouses(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as StockMovementRow[];
}

export async function fetchStockRequests(limit = 200) {
  const { data, error } = await supabase
    .from(inventoryTables.requests)
    .select("id, request_number, request_type, requester_employee_id, requester_department, status, priority, required_date, notes, created_at, approved_by_employee_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as StockRequestRow[];
}

export async function fetchStockTransfers(limit = 200) {
  const { data, error } = await supabase
    .from(inventoryTables.transfers)
    .select("id, transfer_number, inventory_item_id, from_warehouse_id, to_warehouse_id, quantity, status, transfer_type, requested_by_employee_id, approved_by_employee_id, notes, created_at, inventory_items(item_name, sku)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as StockTransferRow[];
}

export async function fetchPurchaseReceipts(limit = 200) {
  const { data, error } = await supabase
    .from(inventoryTables.receipts)
    .select("id, grn_number, po_number, supplier_id, receipt_date, invoice_number, invoice_url, delivery_note_url, status, remarks, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as PurchaseReceiptRow[];
}

export async function fetchConsumables(limit = 300) {
  const { data, error } = await supabase
    .from(inventoryTables.consumables)
    .select("id, inventory_item_id, item_name, monthly_usage, department_usage, forecast_next_month, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ConsumableRow[];
}

export async function fetchInventoryAudits(limit = 200) {
  const { data, error } = await supabase
    .from(inventoryTables.audits)
    .select("id, audit_number, warehouse_id, audit_date, status, variance_count, missing_count, damaged_count, signature_name, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as InventoryAuditRow[];
}

export async function fetchCycleCounts(limit = 200) {
  const { data, error } = await supabase
    .from(inventoryTables.cycleCounts)
    .select("id, count_number, abc_class, count_type, scheduled_date, status, variance_value, approved_by_employee_id, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as CycleCountRow[];
}

export async function fetchInventorySettings() {
  const { data, error } = await supabase
    .from(inventoryTables.settings)
    .select("id, key, value, value_type, updated_at")
    .order("key", { ascending: true });

  if (error) throw error;
  return (data || []) as InventorySettingRow[];
}

export async function fetchInventoryDashboardData(): Promise<InventoryDashboardData> {
  const [items, warehouses, categories, suppliers, movements, requests, transfers, receipts, consumables, audits] = await Promise.all([
    fetchInventoryItems(),
    fetchWarehouses(),
    fetchInventoryCategories(),
    fetchSuppliers(),
    fetchStockMovements(300),
    fetchStockRequests(120),
    fetchStockTransfers(120),
    fetchPurchaseReceipts(120),
    fetchConsumables(120),
    fetchInventoryAudits(120),
  ]);

  return {
    items,
    warehouses,
    categories,
    suppliers,
    movements,
    requests,
    transfers,
    receipts,
    consumables,
    audits,
  };
}

export function buildInventoryTrend(rows: Array<{ created_at?: string | null; quantity?: number | null }>) {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const key = monthLabel(row.created_at);
    map.set(key, (map.get(key) || 0) + Number(row.quantity || 0));
  });
  return Array.from(map.entries()).map(([label, value]) => ({ label, value })).slice(-10);
}

export function toCountSeries(rows: Array<{ label: string }>) {
  const map = new Map<string, number>();
  rows.forEach((row) => map.set(row.label, (map.get(row.label) || 0) + 1));
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}

export function exportRowsToExcel(sheetName: string, rows: Record<string, unknown>[], fileName: string) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

export function exportRowsToCsv(rows: Record<string, unknown>[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportRowsToPdf(title: string, rows: Array<Record<string, unknown>>, fileName: string) {
  const pdf = new jsPDF();
  pdf.setFontSize(14);
  pdf.text(title, 12, 18);

  let y = 28;
  rows.slice(0, 32).forEach((row, index) => {
    const line = `${index + 1}. ${Object.values(row).slice(0, 4).join(" | ")}`;
    pdf.setFontSize(10);
    pdf.text(String(line), 12, y);
    y += 6;
  });

  pdf.save(fileName);
}

export function getInventoryHealthScore(input: {
  total: number;
  lowStock: number;
  outOfStock: number;
  pendingRequests: number;
  pendingTransfers: number;
}) {
  if (input.total <= 0) return 100;
  const lowPenalty = (input.lowStock / input.total) * 32;
  const outPenalty = (input.outOfStock / input.total) * 42;
  const requestPenalty = Math.min(input.pendingRequests * 0.7, 14);
  const transferPenalty = Math.min(input.pendingTransfers * 0.7, 12);
  const score = Math.max(0, Math.round(100 - lowPenalty - outPenalty - requestPenalty - transferPenalty));
  return score;
}
