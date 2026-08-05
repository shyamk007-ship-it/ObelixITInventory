"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  Boxes,
  Building2,
  CircleDollarSign,
  ClipboardList,
  Factory,
  Gauge,
  Layers,
  Loader2,
  Package,
  ShoppingBag,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import {
  InventoryHeader,
  InventoryQuickActions,
  InventoryStatCard,
  InventoryTimeline,
} from "../../../components/inventory";
import {
  fetchInventoryDashboardData,
  getInventoryHealthScore,
  safeErrorMessage,
  toCountSeries,
} from "../../../lib/inventory";

const InventoryDashboardCharts = dynamic(() => import("../../../components/inventory/InventoryDashboardCharts"), {
  ssr: false,
  loading: () => <div style={styles.skeleton} />,
});

type DashboardData = Awaited<ReturnType<typeof fetchInventoryDashboardData>>;

export default function InventoryDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchInventoryDashboardData();
        if (!active) return;
        setData(response);
      } catch (loadError) {
        if (!active) return;
        setError(loadError);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const items = data?.items || [];
    const requests = data?.requests || [];
    const transfers = data?.transfers || [];

    const totalQty = items.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const reservedQty = items.reduce((sum, row) => sum + Number(row.reserved_quantity || 0), 0);
    const availableQty = items.reduce((sum, row) => sum + Number(row.available_quantity || 0), 0);
    const inventoryValue = items.reduce((sum, row) => sum + Number(row.available_quantity || 0) * Number(row.purchase_cost || 0), 0);
    const lowStock = items.filter((row) => Number(row.available_quantity || 0) <= Number(row.reorder_level || 0)).length;
    const outOfStock = items.filter((row) => Number(row.available_quantity || 0) <= 0).length;
    const pendingRequests = requests.filter((row) => String(row.status || "").toLowerCase() === "pending").length;
    const pendingTransfers = transfers.filter((row) => String(row.status || "").toLowerCase() === "pending").length;

    return {
      totalItems: items.length,
      totalQty,
      inventoryValue,
      availableQty,
      reservedQty,
      lowStock,
      outOfStock,
      pendingRequests,
      pendingTransfers,
      warehouses: (data?.warehouses || []).length,
      suppliers: (data?.suppliers || []).length,
      categories: (data?.categories || []).length,
      health: getInventoryHealthScore({
        total: items.length,
        lowStock,
        outOfStock,
        pendingRequests,
        pendingTransfers,
      }),
    };
  }, [data]);

  const chartData = useMemo(() => {
    const items = data?.items || [];
    const movements = data?.movements || [];
    const requests = data?.requests || [];
    const suppliers = data?.suppliers || [];

    const inventoryValueTrendMap = new Map<string, number>();
    items.forEach((item) => {
      const key = item.updated_at ? new Date(item.updated_at).toLocaleDateString(undefined, { month: "short", year: "2-digit" }) : "Unknown";
      const value = Number(item.available_quantity || 0) * Number(item.purchase_cost || 0);
      inventoryValueTrendMap.set(key, (inventoryValueTrendMap.get(key) || 0) + value);
    });

    const monthlyStockMovementMap = new Map<string, number>();
    movements.forEach((movement) => {
      const key = movement.created_at ? new Date(movement.created_at).toLocaleDateString(undefined, { month: "short", year: "2-digit" }) : "Unknown";
      monthlyStockMovementMap.set(key, (monthlyStockMovementMap.get(key) || 0) + Number(movement.quantity || 0));
    });

    const stockByCategory = toCountSeries(items.map((item) => ({ label: item.category || "Uncategorized" })));
    const warehouseDistribution = toCountSeries(items.map((item) => ({ label: String(item.warehouse_id || "Unassigned") })));

    const issueQty = new Map<number, number>();
    movements
      .filter((row) => row.movement_type === "Issue")
      .forEach((row) => issueQty.set(row.inventory_item_id, (issueQty.get(row.inventory_item_id) || 0) + Number(row.quantity || 0)));

    const movingPairs = items.map((item) => ({ label: item.item_name, value: issueQty.get(item.id) || 0 }));
    const fastMoving = [...movingPairs].sort((a, b) => b.value - a.value).slice(0, 8);
    const slowMoving = [...movingPairs].sort((a, b) => a.value - b.value).slice(0, 8);
    const deadStock = items
      .filter((item) => !issueQty.get(item.id) && Number(item.available_quantity || 0) > 0)
      .slice(0, 8)
      .map((item) => ({ label: item.item_name, value: Number(item.available_quantity || 0) }));

    const consumptionMap = new Map<string, number>();
    movements
      .filter((row) => row.movement_type === "Issue")
      .forEach((row) => {
        const key = row.created_at ? new Date(row.created_at).toLocaleDateString(undefined, { month: "short", year: "2-digit" }) : "Unknown";
        consumptionMap.set(key, (consumptionMap.get(key) || 0) + Number(row.quantity || 0));
      });

    const topRequestedItems = toCountSeries(
      requests.map((row) => ({ label: row.request_type || row.request_number || "Request" }))
    ).slice(0, 10);

    const topSuppliers = suppliers
      .map((row) => ({ label: row.name, value: Number(row.rating || 0) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      inventoryValueTrend: Array.from(inventoryValueTrendMap.entries()).map(([label, value]) => ({ label, value })).slice(-10),
      monthlyStockMovement: Array.from(monthlyStockMovementMap.entries()).map(([label, value]) => ({ label, value })).slice(-10),
      stockByCategory,
      warehouseDistribution,
      fastMovingItems: fastMoving,
      slowMovingItems: slowMoving,
      deadStock,
      inventoryConsumption: Array.from(consumptionMap.entries()).map(([label, value]) => ({ label, value })).slice(-10),
      topRequestedItems,
      topSuppliers,
    };
  }, [data]);

  const pendingApprovals = useMemo(() => {
    return [
      ...(data?.requests || []).filter((row) => String(row.status || "").toLowerCase() === "pending").slice(0, 4).map((row) => ({
        label: `Request ${row.request_number}`,
        detail: `${row.requester_department || "Department"} • ${row.priority || "Normal"}`,
        when: row.required_date || row.created_at || "-",
      })),
      ...(data?.transfers || []).filter((row) => String(row.status || "").toLowerCase() === "pending").slice(0, 4).map((row) => ({
        label: `Transfer ${row.transfer_number}`,
        detail: `${row.transfer_type || "Warehouse"} • Qty ${row.quantity}`,
        when: row.created_at || "-",
      })),
    ].slice(0, 8);
  }, [data]);

  const incomingDeliveries = useMemo(() => {
    return (data?.receipts || [])
      .filter((row) => ["pending", "partial"].includes(String(row.status || "").toLowerCase()))
      .slice(0, 8)
      .map((row) => ({
        label: row.grn_number,
        detail: `${row.po_number || "No PO"} • ${row.status || "Pending"}`,
        when: row.receipt_date || row.created_at || "-",
      }));
  }, [data]);

  const lowStockAlerts = useMemo(() => {
    return (data?.items || [])
      .filter((row) => Number(row.available_quantity || 0) <= Number(row.reorder_level || 0))
      .slice(0, 8)
      .map((row) => ({
        label: row.item_name,
        detail: `Available ${row.available_quantity || 0} • Reorder ${row.reorder_level || 0}`,
        when: row.updated_at ? new Date(row.updated_at).toLocaleString() : "-",
      }));
  }, [data]);

  const recentActivity = useMemo(() => {
    return (data?.movements || []).slice(0, 10).map((row) => ({
      label: `${row.movement_type} • ${row.inventory_items?.item_name || `#${row.inventory_item_id}`}`,
      detail: `Qty ${row.quantity} • ${row.status || "Posted"}`,
      when: row.created_at ? new Date(row.created_at).toLocaleString() : "-",
    }));
  }, [data]);

  if (error) {
    return (
      <section style={styles.page}>
        <InventoryHeader title="Inventory Dashboard" subtitle="Executive inventory control center for stock, warehouses, and supplier performance." />
        <div style={styles.errorCard}>{safeErrorMessage(error, "Unable to load inventory dashboard.")}</div>
      </section>
    );
  }

  return (
    <section style={styles.page}>
      <InventoryHeader
        title="Inventory Dashboard"
        subtitle="Executive visibility over stock, warehouse distribution, movement velocity, and approval bottlenecks."
        right={
          <InventoryQuickActions
            actions={[
              { label: "Add Stock", href: "/office/inventory/stock" },
              { label: "Create Stock Request", href: "/office/inventory/requests" },
              { label: "Receive Purchase Order", href: "/office/inventory/receiving" },
              { label: "Transfer Stock", href: "/office/inventory/transfers" },
              { label: "Generate Report", href: "/office/inventory/reports" },
              { label: "Print Barcode", href: "/office/inventory/barcode" },
            ]}
          />
        }
      />

      <div style={styles.kpiGrid}>
        <InventoryStatCard title="Total Inventory Items" value={metrics.totalItems} icon={<Package size={16} />} />
        <InventoryStatCard title="Total Stock Quantity" value={metrics.totalQty} icon={<Boxes size={16} />} />
        <InventoryStatCard title="Total Inventory Value" value={`$${metrics.inventoryValue.toLocaleString()}`} icon={<CircleDollarSign size={16} />} />
        <InventoryStatCard title="Available Stock" value={metrics.availableQty} icon={<TrendingUp size={16} />} />
        <InventoryStatCard title="Reserved Stock" value={metrics.reservedQty} icon={<Layers size={16} />} />
        <InventoryStatCard title="Low Stock Items" value={metrics.lowStock} icon={<AlertTriangle size={16} />} />
        <InventoryStatCard title="Out of Stock Items" value={metrics.outOfStock} icon={<AlertTriangle size={16} />} />
        <InventoryStatCard title="Pending Stock Requests" value={metrics.pendingRequests} icon={<ClipboardList size={16} />} />
        <InventoryStatCard title="Pending Transfers" value={metrics.pendingTransfers} icon={<ArrowDownUp size={16} />} />
        <InventoryStatCard title="Warehouses" value={metrics.warehouses} icon={<Warehouse size={16} />} />
        <InventoryStatCard title="Suppliers" value={metrics.suppliers} icon={<Factory size={16} />} />
        <InventoryStatCard title="Categories" value={metrics.categories} icon={<Building2 size={16} />} />
      </div>

      <div style={styles.healthCard}>
        <Gauge size={16} />
        <strong>Inventory Health Score:</strong> {metrics.health}/100
      </div>

      {isLoading ? (
        <div style={styles.loadingCard}>
          <Loader2 size={16} className="animate-spin" /> Loading inventory analytics...
        </div>
      ) : (
        <InventoryDashboardCharts
          inventoryValueTrend={chartData.inventoryValueTrend}
          monthlyStockMovement={chartData.monthlyStockMovement}
          stockByCategory={chartData.stockByCategory}
          warehouseDistribution={chartData.warehouseDistribution}
          fastMovingItems={chartData.fastMovingItems}
          slowMovingItems={chartData.slowMovingItems}
          deadStock={chartData.deadStock}
          inventoryConsumption={chartData.inventoryConsumption}
          topRequestedItems={chartData.topRequestedItems}
          topSuppliers={chartData.topSuppliers}
        />
      )}

      <div style={styles.widgets}>
        <InventoryTimeline title="Recent Inventory Activity" rows={recentActivity} />
        <InventoryTimeline title="Pending Approvals" rows={pendingApprovals} />
        <InventoryTimeline title="Incoming Deliveries" rows={incomingDeliveries} />
        <InventoryTimeline title="Low Stock Alerts" rows={lowStockAlerts} />
      </div>

      <div style={styles.capacityCards}>
        {(data?.warehouses || []).slice(0, 6).map((warehouse) => {
          const capacity = Number(warehouse.capacity_units || 0);
          const current = (data?.items || [])
            .filter((row) => row.warehouse_id === warehouse.id)
            .reduce((sum, row) => sum + Number(row.quantity || 0), 0);
          const percent = capacity > 0 ? Math.min(100, Math.round((current / capacity) * 100)) : 0;

          return (
            <article key={warehouse.id} style={styles.capacityCard}>
              <h3 style={styles.capacityTitle}>{warehouse.name}</h3>
              <p style={styles.capacityText}>{current} / {capacity || "N/A"} units</p>
              <div style={styles.barTrack}>
                <span style={{ ...styles.barValue, width: `${percent}%` }} />
              </div>
              <p style={styles.capacityText}>Capacity: {percent}%</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: "grid",
    gap: 12,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
  },
  widgets: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 10,
  },
  capacityCards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
  },
  capacityCard: {
    borderRadius: 14,
    border: "1px solid #dbeafe",
    background: "#ffffff",
    padding: 12,
    display: "grid",
    gap: 8,
    boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
  },
  capacityTitle: {
    margin: 0,
    color: "#0f172a",
    fontWeight: 900,
  },
  capacityText: {
    margin: 0,
    fontSize: 12,
    color: "#475569",
  },
  barTrack: {
    height: 8,
    borderRadius: 999,
    background: "#e2e8f0",
    overflow: "hidden",
  },
  barValue: {
    display: "block",
    height: "100%",
    background: "linear-gradient(90deg, #0ea5e9, #2563eb)",
  },
  loadingCard: {
    borderRadius: 12,
    border: "1px solid #dbeafe",
    background: "#f8fbff",
    color: "#1e3a8a",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 700,
    padding: "8px 10px",
    width: "fit-content",
  },
  healthCard: {
    borderRadius: 12,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1e3a8a",
    padding: "8px 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 700,
  },
  errorCard: {
    borderRadius: 12,
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#9f1239",
    padding: "10px 12px",
    fontWeight: 700,
  },
  skeleton: {
    borderRadius: 14,
    minHeight: 320,
    border: "1px solid #e2e8f0",
    background: "linear-gradient(90deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
  },
};

