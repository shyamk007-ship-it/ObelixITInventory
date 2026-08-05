"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2, Plus } from "lucide-react";
import { InventoryHeader } from "../../../components/inventory";
import { fetchInventoryCategories, fetchInventoryItems, safeErrorMessage } from "../../../lib/inventory";
import { supabase } from "../../../lib/supabase";

export default function InventoryCategoriesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof fetchInventoryCategories>>>([]);
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchInventoryItems>>>([]);
  const [form, setForm] = useState({ name: "", parent_id: "", description: "" });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [categoryRows, itemRows] = await Promise.all([fetchInventoryCategories(), fetchInventoryItems()]);
      setCategories(categoryRows.filter((row) => row.id < 100000));
      setItems(itemRows);
    } catch (loadError) {
      setError(safeErrorMessage(loadError, "Unable to load categories."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const itemCounts = useMemo(() => {
    const map = new Map<string, { count: number; stockValue: number; lowStock: number; active: number }>();
    items.forEach((item) => {
      const key = String(item.category || "Uncategorized");
      if (!map.has(key)) {
        map.set(key, { count: 0, stockValue: 0, lowStock: 0, active: 0 });
      }
      const target = map.get(key)!;
      target.count += 1;
      target.stockValue += Number(item.available_quantity || 0) * Number(item.purchase_cost || 0);
      if (Number(item.available_quantity || 0) <= Number(item.reorder_level || 0)) target.lowStock += 1;
      if (String(item.status || "Active") === "Active") target.active += 1;
    });
    return map;
  }, [items]);

  const createCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    const { error: insertError } = await supabase.from("inventory_categories").insert([
      {
        name: form.name.trim(),
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        description: form.description.trim() || null,
        is_active: true,
      },
    ]);

    if (insertError) {
      setError(safeErrorMessage(insertError, "Unable to create category."));
      return;
    }

    setForm({ name: "", parent_id: "", description: "" });
    void loadData();
  };

  const categoryTree = useMemo(() => {
    const children = new Map<number | null, typeof categories>();
    categories.forEach((row) => {
      const key = row.parent_id || null;
      if (!children.has(key)) children.set(key, []);
      children.get(key)!.push(row);
    });
    return children;
  }, [categories]);

  const renderTree = (parentId: number | null, depth = 0): React.ReactNode => {
    const rows = categoryTree.get(parentId) || [];
    return rows.map((row) => {
      const stats = itemCounts.get(row.name) || { count: 0, stockValue: 0, lowStock: 0, active: 0 };
      return (
        <div key={row.id} style={{ ...styles.treeRow, marginLeft: depth * 14 }}>
          <div>
            <p style={styles.treeName}>{row.name}</p>
            <p style={styles.treeMeta}>{row.description || "No description"}</p>
          </div>
          <div style={styles.treeStats}>
            <span style={styles.statBadge}>Items {stats.count}</span>
            <span style={styles.statBadge}>Value ${Math.round(stats.stockValue).toLocaleString()}</span>
            <span style={styles.statBadge}>Low {stats.lowStock}</span>
            <span style={styles.statBadge}>Active {stats.active}</span>
          </div>
          {renderTree(row.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <section style={styles.page}>
      <InventoryHeader title="Category Management" subtitle="Unlimited nested inventory categories with real-time stock value, low-stock risk, and active item visibility." />

      <form style={styles.formCard} onSubmit={createCategory}>
        <h3 style={styles.title}><Plus size={14} /> Add Category</h3>
        <div style={styles.formGrid}>
          <input style={styles.input} placeholder="Category Name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <select style={styles.input} value={form.parent_id} onChange={(event) => setForm((prev) => ({ ...prev, parent_id: event.target.value }))}>
            <option value="">Top Level</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <input style={styles.input} placeholder="Description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
        </div>
        <button type="submit" style={styles.button}>Save Category</button>
      </form>

      <article style={styles.treeCard}>
        <h3 style={styles.title}>Category Tree</h3>
        <div style={styles.tree}>{renderTree(null)}</div>
      </article>

      {isLoading ? <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Loading category hierarchy...</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  formCard: { borderRadius: 14, border: "1px solid #dbeafe", background: "#fff", padding: 12, display: "grid", gap: 10 },
  title: { margin: 0, color: "#0f172a", fontSize: 15, fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 6 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 },
  input: { border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 9px", fontSize: 13 },
  button: {
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
  treeCard: { borderRadius: 14, border: "1px solid #dbeafe", background: "#fff", padding: 12 },
  tree: { display: "grid", gap: 8 },
  treeRow: { borderRadius: 10, border: "1px solid #e2e8f0", padding: 10, background: "#f8fbff", display: "grid", gap: 6 },
  treeName: { margin: 0, color: "#0f172a", fontWeight: 900, fontSize: 14 },
  treeMeta: { margin: 0, color: "#64748b", fontSize: 12 },
  treeStats: { display: "flex", flexWrap: "wrap", gap: 6 },
  statBadge: { borderRadius: 999, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", padding: "3px 8px", fontSize: 11, fontWeight: 800 },
  loading: { borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", padding: "8px 10px", display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 700 },
  error: { borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: "8px 10px", fontWeight: 700 },
};

