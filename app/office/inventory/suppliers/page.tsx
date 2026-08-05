"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { InventoryDataTable, InventoryHeader } from "../../../components/inventory";
import { fetchSuppliers, safeErrorMessage } from "../../../lib/inventory";
import { supabase } from "../../../lib/supabase";

type PurchaseOrderRow = {
  id: number;
  vendor_name?: string | null;
  total_amount?: number | null;
  status?: string | null;
  purchase_date?: string | null;
};

export default function InventorySuppliersPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Awaited<ReturnType<typeof fetchSuppliers>>>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRow[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [supplierRows, poResponse] = await Promise.all([
          fetchSuppliers(),
          supabase.from("asset_purchase_orders").select("id, vendor_name, total_amount, status, purchase_date").order("purchase_date", { ascending: false }).limit(600),
        ]);

        if (!active) return;
        setSuppliers(supplierRows);
        setPurchaseOrders((poResponse.data || []) as PurchaseOrderRow[]);
      } catch (loadError) {
        if (!active) return;
        setError(safeErrorMessage(loadError, "Unable to load suppliers."));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const supplierStats = useMemo(() => {
    const byName = new Map<string, { products: number; poCount: number; invoiceValue: number; delivered: number; pending: number }>();

    suppliers.forEach((supplier) => {
      byName.set(supplier.name, { products: 0, poCount: 0, invoiceValue: 0, delivered: 0, pending: 0 });
    });

    purchaseOrders.forEach((order) => {
      const key = String(order.vendor_name || "");
      if (!byName.has(key)) {
        byName.set(key, { products: 0, poCount: 0, invoiceValue: 0, delivered: 0, pending: 0 });
      }
      const entry = byName.get(key)!;
      entry.poCount += 1;
      entry.invoiceValue += Number(order.total_amount || 0);
      const status = String(order.status || "Draft").toLowerCase();
      if (["delivered", "closed", "completed"].includes(status)) entry.delivered += 1;
      if (["pending", "draft", "approved"].includes(status)) entry.pending += 1;
    });

    return byName;
  }, [suppliers, purchaseOrders]);

  const tableRows = suppliers.map((supplier) => {
    const stats = supplierStats.get(supplier.name) || { products: 0, poCount: 0, invoiceValue: 0, delivered: 0, pending: 0 };
    const deliveryPerformance = supplier.on_time_delivery_rate || (stats.poCount ? Math.round((stats.delivered / stats.poCount) * 100) : 0);

    return {
      Supplier: supplier.name,
      Rating: supplier.rating || 0,
      Products: stats.products,
      "Purchase Orders": stats.poCount,
      Invoices: `$${Math.round(stats.invoiceValue).toLocaleString()}`,
      "Payment Status": stats.pending ? `${stats.pending} Pending` : "On Track",
      "Delivery Performance": `${deliveryPerformance}%`,
      Contact: [supplier.contact_person, supplier.phone].filter(Boolean).join(" • ") || "-",
      Email: supplier.email || "-",
      Contracts: "Managed via procurement contracts",
    };
  });

  return (
    <section style={styles.page}>
      <InventoryHeader title="Supplier Management" subtitle="Supplier scorecards with purchase orders, invoices, payment visibility, delivery performance, and commercial profile details." />

      <InventoryDataTable
        columns={[
          "Supplier",
          "Rating",
          "Products",
          "Purchase Orders",
          "Invoices",
          "Payment Status",
          "Delivery Performance",
          "Contact",
          "Email",
          "Contracts",
        ]}
        rows={tableRows}
      />

      {isLoading ? <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Loading suppliers...</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  loading: { borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", padding: "8px 10px", display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 700 },
  error: { borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: "8px 10px", fontWeight: 700 },
};

