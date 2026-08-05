"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2, Printer, QrCode } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { InventoryHeader } from "../../../components/inventory";
import { fetchInventoryItems, inventoryTables, safeErrorMessage } from "../../../lib/inventory";
import { supabase } from "../../../lib/supabase";

export default function InventoryBarcodePage() {
  const searchParams = useSearchParams();
  const queryItem = Number(searchParams.get("item") || 0);
  const defaultType = searchParams.get("type") === "qr" ? "qr" : "barcode";

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchInventoryItems>>>([]);
  const [selectedItemId, setSelectedItemId] = useState<number>(queryItem);
  const [printType, setPrintType] = useState<"barcode" | "qr">(defaultType);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const rows = await fetchInventoryItems();
        if (!active) return;
        setItems(rows);
        if (!queryItem && rows.length) {
          setSelectedItemId(rows[0].id);
        }
      } catch (loadError) {
        if (!active) return;
        setError(safeErrorMessage(loadError, "Unable to load inventory items."));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [queryItem]);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) || null, [items, selectedItemId]);

  const updateCode = async (field: "barcode" | "qr_code") => {
    if (!selectedItem) return;
    const nextValue = `${field === "barcode" ? "BC" : "QR"}-${selectedItem.sku}-${Date.now()}`;
    const { error: updateError } = await supabase.from(inventoryTables.items).update({ [field]: nextValue }).eq("id", selectedItem.id);
    if (updateError) {
      setError(safeErrorMessage(updateError, `Unable to generate ${field}.`));
      return;
    }

    const refreshed = await fetchInventoryItems();
    setItems(refreshed);
  };

  return (
    <section style={styles.page}>
      <InventoryHeader title="Barcode & QR Management" subtitle="Generate labels, print barcode or QR labels, and use scan-ready identifiers for receive, issue, transfer, and audit workflows." />

      <div style={styles.toolbar}>
        <select style={styles.input} value={selectedItemId || ""} onChange={(event) => setSelectedItemId(Number(event.target.value || 0))}>
          <option value="">Select Item</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>{item.item_name} ({item.sku})</option>
          ))}
        </select>
        <select style={styles.input} value={printType} onChange={(event) => setPrintType(event.target.value as "barcode" | "qr")}>
          <option value="barcode">Barcode Label</option>
          <option value="qr">QR Label</option>
        </select>
        <button type="button" style={styles.button} onClick={() => void updateCode("barcode")}>Generate Barcode</button>
        <button type="button" style={styles.button} onClick={() => void updateCode("qr_code")}>Generate QR Code</button>
        <button type="button" style={styles.button} onClick={() => window.print()}><Printer size={14} /> Print Label</button>
      </div>

      {selectedItem ? (
        <article style={styles.previewCard}>
          <h3 style={styles.itemTitle}>{selectedItem.item_name}</h3>
          <p style={styles.itemMeta}>SKU: {selectedItem.sku} • Warehouse: {selectedItem.warehouse_id || "-"}</p>
          <p style={styles.itemMeta}>Scan to Receive • Scan to Issue • Scan to Transfer • Scan to Audit</p>

          {printType === "barcode" ? (
            <div style={styles.barcodeBlock}>
              <p style={styles.barcodeText}>{selectedItem.barcode || `BC-${selectedItem.sku}`}</p>
              <p style={styles.itemMeta}>Barcode Value</p>
            </div>
          ) : (
            <div style={styles.qrWrap}>
              <QRCodeSVG value={selectedItem.qr_code || `QR-${selectedItem.sku}`} size={180} />
              <p style={styles.itemMeta}>{selectedItem.qr_code || `QR-${selectedItem.sku}`}</p>
            </div>
          )}

          <div style={styles.helperGrid}>
            <p style={styles.helper}>Scan to Receive</p>
            <p style={styles.helper}>Scan to Issue</p>
            <p style={styles.helper}>Scan to Transfer</p>
            <p style={styles.helper}>Scan to Audit</p>
          </div>
        </article>
      ) : (
        <p style={styles.empty}>Select an item to generate label previews.</p>
      )}

      {isLoading ? <div style={styles.loading}><Loader2 size={14} className="animate-spin" /> Loading label data...</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  toolbar: { display: "flex", flexWrap: "wrap", gap: 8 },
  input: { border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 9px", fontSize: 13, minWidth: 180 },
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
  previewCard: { borderRadius: 14, border: "1px solid #dbeafe", background: "#fff", padding: 14, display: "grid", gap: 10, maxWidth: 560 },
  itemTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 900 },
  itemMeta: { margin: 0, color: "#64748b", fontSize: 12 },
  barcodeBlock: {
    borderRadius: 10,
    border: "1px dashed #93c5fd",
    padding: "16px 12px",
    textAlign: "center",
    background: "#f8fbff",
  },
  barcodeText: {
    margin: 0,
    color: "#0f172a",
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: "0.2em",
    fontFamily: "monospace",
  },
  qrWrap: { display: "grid", gap: 8, justifyItems: "center", borderRadius: 10, border: "1px dashed #93c5fd", padding: 12, background: "#f8fbff" },
  helperGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 },
  helper: { margin: 0, borderRadius: 8, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", fontWeight: 800, fontSize: 11, padding: "6px 8px", textAlign: "center" },
  empty: { margin: 0, color: "#64748b", fontWeight: 700 },
  loading: { borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", padding: "8px 10px", display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 700 },
  error: { borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: "8px 10px", fontWeight: 700 },
};

