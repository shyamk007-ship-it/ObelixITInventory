"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import OfficeAssetModuleNav from "../../../components/office/OfficeAssetModuleNav";
import { supabase } from "../../../lib/supabase";

type CategoryRow = {
  id: number;
  name: string;
  description?: string | null;
  is_active?: boolean | null;
};

export default function OfficeAssetCategoriesPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [assetsByCategory, setAssetsByCategory] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const load = async () => {
    const [categoryResponse, assetResponse] = await Promise.all([
      supabase.from("asset_categories").select("id, name, description, is_active").order("name", { ascending: true }),
      supabase.from("assets").select("category").is("vessel_id", null),
    ]);

    if (categoryResponse.error) {
      const derived = Array.from(
        new Set(((assetResponse.data || []) as Array<{ category?: string | null }>).map((row) => row.category).filter(Boolean))
      ).map((item, index) => ({ id: index + 1, name: String(item), description: null, is_active: true }));
      setCategories(derived);
    } else {
      setCategories((categoryResponse.data as CategoryRow[]) || []);
    }

    const countMap = new Map<string, number>();
    ((assetResponse.data || []) as Array<{ category?: string | null }>).forEach((row) => {
      const key = row.category || "Uncategorized";
      countMap.set(key, (countMap.get(key) || 0) + 1);
    });
    setAssetsByCategory(Object.fromEntries(countMap.entries()));
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!name.trim()) {
      showToast("Category name is required.");
      return;
    }

    if (editingId) {
      const response = await supabase.from("asset_categories").update({ name: name.trim(), description: description || null }).eq("id", editingId);
      if (response.error) {
        showToast("Run office_asset_management_schema.sql to enable full category CRUD.");
        return;
      }
      showToast("Category updated.");
    } else {
      const response = await supabase.from("asset_categories").insert([{ name: name.trim(), description: description || null, is_active: true }]);
      if (response.error) {
        showToast("Run office_asset_management_schema.sql to enable category CRUD.");
        return;
      }
      showToast("Category created.");
    }

    setName("");
    setDescription("");
    setEditingId(null);
    await load();
  };

  const remove = async (item: CategoryRow) => {
    if (!window.confirm(`Delete category ${item.name}?`)) return;
    const response = await supabase.from("asset_categories").delete().eq("id", item.id);
    if (response.error) {
      showToast("Unable to delete category.");
      return;
    }
    showToast("Category deleted.");
    await load();
  };

  const activeCount = useMemo(() => categories.filter((item) => item.is_active !== false).length, [categories]);

  return (
    <div style={styles.page}>
      <OfficeAssetModuleNav />
      <section style={styles.headerCard}>
        <div>
          <p style={styles.eyebrow}>Categories</p>
          <h2 style={styles.title}>Asset Category Management</h2>
          <p style={styles.subtitle}>Create, update, and retire categories used by the Office asset register.</p>
        </div>
        <div style={styles.kpiRow}>
          <Kpi label="Total Categories" value={categories.length} />
          <Kpi label="Active Categories" value={activeCount} />
        </div>
      </section>

      <section style={styles.grid}>
        <article style={styles.card}>
          <h3 style={styles.cardTitle}>{editingId ? "Edit Category" : "Create Category"}</h3>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Category name" style={styles.input} />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" style={{ ...styles.input, minHeight: 90 }} />
          <div style={styles.actions}>
            <button style={styles.secondaryButton} onClick={() => { setName(""); setDescription(""); setEditingId(null); }}>Clear</button>
            <button style={styles.primaryButton} onClick={() => void save()}>{editingId ? "Save Changes" : "Create"}</button>
          </div>
        </article>

        <article style={styles.card}>
          <h3 style={styles.cardTitle}>Category List</h3>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Assets</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr><td colSpan={4} style={styles.empty}>No categories found.</td></tr>
                ) : (
                  categories.map((item) => (
                    <tr key={item.id}>
                      <td style={styles.td}>{item.name}</td>
                      <td style={styles.td}>{assetsByCategory[item.name] || 0}</td>
                      <td style={styles.td}>{item.description || "-"}</td>
                      <td style={styles.td}>
                        <div style={styles.actionCol}>
                          <button style={styles.actionButton} onClick={() => { setEditingId(item.id); setName(item.name); setDescription(item.description || ""); }}>Edit</button>
                          <button style={styles.actionDangerButton} onClick={() => void remove(item)}>Delete</button>
                        </div>
                      </td>
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
  input: { width: "100%", borderRadius: 10, border: "1px solid #cbd5e1", padding: "10px 12px", fontSize: 13 },
  actions: { display: "flex", justifyContent: "flex-end", gap: 8 },
  primaryButton: { border: "none", borderRadius: 10, background: "#2563eb", color: "white", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  secondaryButton: { border: "1px solid #cbd5e1", borderRadius: 10, background: "#f8fafc", color: "#0f172a", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 560 },
  th: { textAlign: "left", padding: 10, background: "#f8fafc", fontSize: 12, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.06em" },
  td: { padding: 10, borderTop: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, verticalAlign: "top" },
  empty: { textAlign: "center", padding: 20, color: "#64748b" },
  actionCol: { display: "grid", gap: 6 },
  actionButton: { border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", color: "#0f172a", padding: "6px 8px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  actionDangerButton: { border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", padding: "6px 8px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  toast: { position: "fixed", right: 16, bottom: 16, background: "#0f172a", color: "white", borderRadius: 10, padding: "10px 14px", fontWeight: 700, fontSize: 13 },
};
