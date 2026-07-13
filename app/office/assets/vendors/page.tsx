"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import OfficeAssetModuleNav from "../../../components/office/OfficeAssetModuleNav";
import { supabase } from "../../../lib/supabase";

type VendorRow = {
  id: number;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type PurchaseHistoryRow = {
  id: number;
  vendor_name?: string | null;
  total_amount?: number | null;
  purchase_date?: string | null;
  status?: string | null;
};

export default function OfficeAssetVendorsPage() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [historyRows, setHistoryRows] = useState<PurchaseHistoryRow[]>([]);
  const [form, setForm] = useState({ name: "", contact_person: "", email: "", phone: "", address: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const load = async () => {
    const [vendorResponse, poResponse] = await Promise.all([
      supabase.from("asset_vendors").select("id, name, contact_person, email, phone, address").order("name", { ascending: true }),
      supabase
        .from("asset_purchase_orders")
        .select("id, vendor_name, total_amount, purchase_date, status")
        .order("purchase_date", { ascending: false }),
    ]);

    if (vendorResponse.error) {
      setVendors([]);
    } else {
      setVendors((vendorResponse.data as VendorRow[]) || []);
    }

    if (!poResponse.error) {
      setHistoryRows((poResponse.data as PurchaseHistoryRow[]) || []);
    } else {
      setHistoryRows([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!form.name.trim()) {
      showToast("Vendor name is required.");
      return;
    }

    if (editingId) {
      const response = await supabase.from("asset_vendors").update(form).eq("id", editingId);
      if (response.error) {
        showToast("Run office_asset_management_schema.sql to enable vendor CRUD.");
        return;
      }
      showToast("Vendor updated.");
    } else {
      const response = await supabase.from("asset_vendors").insert([form]);
      if (response.error) {
        showToast("Run office_asset_management_schema.sql to enable vendor CRUD.");
        return;
      }
      showToast("Vendor created.");
    }

    setEditingId(null);
    setForm({ name: "", contact_person: "", email: "", phone: "", address: "" });
    await load();
  };

  const remove = async (vendor: VendorRow) => {
    if (!window.confirm(`Delete vendor ${vendor.name}?`)) return;
    const response = await supabase.from("asset_vendors").delete().eq("id", vendor.id);
    if (response.error) {
      showToast("Unable to delete vendor.");
      return;
    }
    showToast("Vendor deleted.");
    await load();
  };

  const spendByVendor = useMemo(() => {
    const bucket = new Map<string, number>();
    historyRows.forEach((row) => {
      const key = row.vendor_name || "Unknown";
      bucket.set(key, (bucket.get(key) || 0) + Number(row.total_amount || 0));
    });
    return Array.from(bucket.entries());
  }, [historyRows]);

  return (
    <div style={styles.page}>
      <OfficeAssetModuleNav />
      <section style={styles.headerCard}>
        <div>
          <p style={styles.eyebrow}>Vendors</p>
          <h2 style={styles.title}>Vendor Management</h2>
          <p style={styles.subtitle}>Maintain vendors and review purchase history and spend concentration.</p>
        </div>
        <div style={styles.kpiRow}>
          <Kpi label="Total Vendors" value={vendors.length} />
          <Kpi label="Purchase Orders" value={historyRows.length} />
        </div>
      </section>

      <section style={styles.grid}>
        <article style={styles.card}>
          <h3 style={styles.cardTitle}>{editingId ? "Edit Vendor" : "Create Vendor"}</h3>
          <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Vendor name" style={styles.input} />
          <input value={form.contact_person} onChange={(event) => setForm((prev) => ({ ...prev, contact_person: event.target.value }))} placeholder="Contact person" style={styles.input} />
          <input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" style={styles.input} />
          <input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone" style={styles.input} />
          <textarea value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} placeholder="Address" style={{ ...styles.input, minHeight: 86 }} />
          <div style={styles.actions}>
            <button style={styles.secondaryButton} onClick={() => { setEditingId(null); setForm({ name: "", contact_person: "", email: "", phone: "", address: "" }); }}>Clear</button>
            <button style={styles.primaryButton} onClick={() => void save()}>{editingId ? "Save Changes" : "Create"}</button>
          </div>
        </article>

        <article style={styles.card}>
          <h3 style={styles.cardTitle}>Vendor Directory</h3>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Contact</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Address</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 ? (
                  <tr><td colSpan={6} style={styles.empty}>No vendors found.</td></tr>
                ) : (
                  vendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td style={styles.td}>{vendor.name}</td>
                      <td style={styles.td}>{vendor.contact_person || "-"}</td>
                      <td style={styles.td}>{vendor.email || "-"}</td>
                      <td style={styles.td}>{vendor.phone || "-"}</td>
                      <td style={styles.td}>{vendor.address || "-"}</td>
                      <td style={styles.td}>
                        <div style={styles.actionCol}>
                          <button style={styles.actionButton} onClick={() => { setEditingId(vendor.id); setForm({ name: vendor.name, contact_person: vendor.contact_person || "", email: vendor.email || "", phone: vendor.phone || "", address: vendor.address || "" }); }}>Edit</button>
                          <button style={styles.actionDangerButton} onClick={() => void remove(vendor)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h4 style={styles.subTitle}>Purchase History Summary</h4>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Vendor</th>
                  <th style={styles.th}>Total Spend</th>
                </tr>
              </thead>
              <tbody>
                {spendByVendor.length === 0 ? (
                  <tr><td colSpan={2} style={styles.empty}>No purchase history available.</td></tr>
                ) : (
                  spendByVendor.map(([vendor, value]) => (
                    <tr key={vendor}>
                      <td style={styles.td}>{vendor}</td>
                      <td style={styles.td}>${value.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.kpiCard}>
      <p style={styles.kpiLabel}>{label}</p>
      <p style={styles.kpiValue}>{value}</p>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 14 },
  headerCard: { background: "white", borderRadius: 14, border: "1px solid #dbeafe", padding: 14, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  eyebrow: { margin: 0, color: "#0369a1", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" },
  title: { margin: "6px 0", color: "#0f172a", fontWeight: 900, fontSize: 24 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 700 },
  kpiRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  kpiCard: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, minWidth: 140 },
  kpiLabel: { margin: 0, fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 },
  kpiValue: { margin: "6px 0 0", fontSize: 22, color: "#0f172a", fontWeight: 900 },
  grid: { display: "grid", gridTemplateColumns: "minmax(260px, 360px) 1fr", gap: 12 },
  card: { background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 12, display: "grid", gap: 8 },
  cardTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 800 },
  subTitle: { margin: "8px 0 0", color: "#0f172a", fontSize: 15, fontWeight: 800 },
  input: { width: "100%", borderRadius: 10, border: "1px solid #cbd5e1", padding: "10px 12px", fontSize: 13 },
  actions: { display: "flex", justifyContent: "flex-end", gap: 8 },
  primaryButton: { border: "none", borderRadius: 10, background: "#2563eb", color: "white", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  secondaryButton: { border: "1px solid #cbd5e1", borderRadius: 10, background: "#f8fafc", color: "#0f172a", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 640 },
  th: { textAlign: "left", padding: 10, background: "#f8fafc", fontSize: 12, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.06em" },
  td: { padding: 10, borderTop: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, verticalAlign: "top" },
  empty: { textAlign: "center", padding: 20, color: "#64748b" },
  actionCol: { display: "grid", gap: 6 },
  actionButton: { border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", color: "#0f172a", padding: "6px 8px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  actionDangerButton: { border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", padding: "6px 8px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  toast: { position: "fixed", right: 16, bottom: 16, background: "#0f172a", color: "white", borderRadius: 10, padding: "10px 14px", fontWeight: 700, fontSize: 13 },
};
