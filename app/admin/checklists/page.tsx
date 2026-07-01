"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { createAuditLog, buildAuditDescription, createNotification } from "../../lib/audit";
import { getUserProfile } from "../../lib/rbac";

interface Vessel {
  id: number;
  vessel_name: string;
}

interface ChecklistEntry {
  id: number;
  vessel_id: number;
  checklist_type: string;
  checklist_date: string;
  status: string;
  result: string;
  remarks?: string | null;
  created_at?: string;
  vessels?: { vessel_name?: string | null } | null;
}

interface ChecklistItemState {
  key: string;
  label: string;
  status: "pass" | "fail" | "na";
  remarks: string;
}

const checklistConfig: Record<string, { title: string; items: string[] }> = {
  Daily: {
    title: "Daily Checklist",
    items: [
      "VSAT Working",
      "Starlink Working",
      "Email Working",
      "Internet Available",
      "Bridge PC",
      "Engine Room PC",
      "Printer",
      "CCTV",
      "WiFi",
      "Antivirus",
    ],
  },
  Weekly: {
    title: "Weekly Checklist",
    items: [
      "Firewall Health",
      "Router Health",
      "Switch Health",
      "Backup Completed",
      "Windows Updates",
      "UPS Health",
      "User Accounts",
      "Disk Health",
    ],
  },
  Monthly: {
    title: "Monthly Checklist",
    items: [
      "Asset Audit",
      "Warranty Review",
      "Software License Review",
      "Cyber Security Review",
      "Patch Management",
      "Disaster Recovery Test",
      "IT Documentation Review",
    ],
  },
};

export default function ChecklistsPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [selectedVessel, setSelectedVessel] = useState("");
  const [checklistType, setChecklistType] = useState("Daily");
  const [checklistDate, setChecklistDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<ChecklistItemState[]>([]);
  const [remarks, setRemarks] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setItems(
      checklistConfig[checklistType].items.map((item) => ({
        key: item.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        label: item,
        status: "pass",
        remarks: "",
      }))
    );
  }, [checklistType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vesselsResponse, entriesResponse] = await Promise.all([
        supabase.from("vessels").select("id, vessel_name").order("vessel_name", { ascending: true }),
        supabase.from("vessel_it_checklists").select("*, vessels(vessel_name)").order("checklist_date", { ascending: false }),
      ]);

      if (!vesselsResponse.error) {
        setVessels(vesselsResponse.data as Vessel[]);
        if ((vesselsResponse.data as Vessel[]).length) {
          setSelectedVessel(String((vesselsResponse.data as Vessel[])[0].id));
        }
      }

      if (!entriesResponse.error) {
        setEntries((entriesResponse.data as ChecklistEntry[]) || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (key: string, field: keyof ChecklistItemState, value: string) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
  };

  const handleSave = async () => {
    if (!selectedVessel) {
      alert("Please select a vessel.");
      return;
    }

    setSaving(true);
    try {
      const failedItems = items.filter((item) => item.status === "fail");
      const payload = {
        vessel_id: Number(selectedVessel),
        checklist_type: checklistType,
        checklist_date: checklistDate,
        status: failedItems.length ? "Failed" : "Completed",
        result: failedItems.length ? "Failed" : "Passed",
        remarks: remarks || null,
      };

      const { data, error } = await supabase.from("vessel_it_checklists").insert([payload]).select();
      if (error) throw error;

      const checklistId = data?.[0]?.id;
      const itemPayload = items.map((item) => ({
        checklist_id: checklistId,
        item_name: item.label,
        status: item.status,
        remarks: item.remarks || null,
      }));

      const { error: itemError } = await supabase.from("vessel_it_checklist_items").insert(itemPayload);
      if (itemError) throw itemError;

      if (failedItems.length) {
        await createNotification({
          title: `Checklist failed for ${vessels.find((vessel) => String(vessel.id) === selectedVessel)?.vessel_name || "vessel"}`,
          message: `${failedItems.length} item(s) failed during ${checklistType.toLowerCase()} inspection.`,
          action: "Checklist Failed",
          createdBy: "System",
          recordType: "vessel_checklist",
          recordId: checklistId,
        });
      }

      const profile = await getUserProfile();
      await createAuditLog({
        action: "Saved Checklist",
        description: buildAuditDescription({
          event: "Saved Checklist",
          userName: profile?.full_name || "Unknown User",
          recordType: "vessel_checklist",
          recordId: checklistId,
          itemName: `${checklistType} checklist`,
          context: failedItems.length ? `Failed Items: ${failedItems.map((item) => item.label).join(", ")}` : "All checks passed",
        }),
      });

      setRemarks("");
      await loadData();
      alert("Checklist saved successfully.");
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Unable to save checklist.");
    } finally {
      setSaving(false);
    }
  };

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      const vesselName = entry.vessels?.vessel_name || "";
      const matchesSearch =
        !query ||
        vesselName.toLowerCase().includes(query) ||
        entry.checklist_type.toLowerCase().includes(query) ||
        entry.checklist_date.toLowerCase().includes(query);
      return matchesSearch;
    });
  }, [entries, search]);

  const cards = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();

    return {
      today: entries.filter((entry) => entry.checklist_date === today).length,
      failed: entries.filter((entry) => entry.result === "Failed").length,
      pending: Math.max(0, vessels.length - entries.filter((entry) => entry.checklist_date === today).length),
      completedThisMonth: entries.filter((entry) => {
        const date = new Date(entry.checklist_date);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      }).length,
    };
  }, [entries, vessels.length]);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>Fleet Assurance</p>
          <h1 style={styles.title}>Vessel IT Checklist</h1>
          <p style={styles.subtitle}>Complete vessel IT inspections, log results, and review history.</p>
        </div>
      </div>

      <div style={styles.cardGrid}>
        <div style={styles.kpiCard}><p style={styles.kpiLabel}>Today&apos;s Inspections</p><strong style={styles.kpiValue}>{cards.today}</strong></div>
        <div style={styles.kpiCard}><p style={styles.kpiLabel}>Failed Checks</p><strong style={styles.kpiValue}>{cards.failed}</strong></div>
        <div style={styles.kpiCard}><p style={styles.kpiLabel}>Pending Inspections</p><strong style={styles.kpiValue}>{cards.pending}</strong></div>
        <div style={styles.kpiCard}><p style={styles.kpiLabel}>Completed This Month</p><strong style={styles.kpiValue}>{cards.completedThisMonth}</strong></div>
      </div>

      <div style={styles.mainGrid}>
        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>New Inspection</h2>
          <div style={styles.formGrid}>
            <label style={styles.field}>Vessel<select style={styles.input} value={selectedVessel} onChange={(event) => setSelectedVessel(event.target.value)}>{vessels.map((vessel) => <option key={vessel.id} value={vessel.id}>{vessel.vessel_name}</option>)}</select></label>
            <label style={styles.field}>Checklist Type<select style={styles.input} value={checklistType} onChange={(event) => setChecklistType(event.target.value)}><option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option></select></label>
            <label style={styles.field}>Inspection Date<input type="date" style={styles.input} value={checklistDate} onChange={(event) => setChecklistDate(event.target.value)} /></label>
          </div>
          <h3 style={styles.sectionTitle}>{checklistConfig[checklistType].title}</h3>
          <div style={styles.itemsGrid}>
            {items.map((item) => (
              <div key={item.key} style={styles.itemCard}>
                <div style={styles.itemHeader}>
                  <strong>{item.label}</strong>
                  <div style={styles.optionRow}>
                    <button type="button" style={{ ...styles.optionButton, ...(item.status === "pass" ? styles.optionActive : {}) }} onClick={() => updateItem(item.key, "status", "pass")}>✓ Pass</button>
                    <button type="button" style={{ ...styles.optionButton, ...(item.status === "fail" ? styles.optionActive : {}) }} onClick={() => updateItem(item.key, "status", "fail")}>✗ Fail</button>
                    <button type="button" style={{ ...styles.optionButton, ...(item.status === "na" ? styles.optionActive : {}) }} onClick={() => updateItem(item.key, "status", "na")}>➖ N/A</button>
                  </div>
                </div>
                <textarea style={styles.textarea} value={item.remarks} onChange={(event) => updateItem(item.key, "remarks", event.target.value)} placeholder="Add remarks" />
              </div>
            ))}
          </div>
          <label style={styles.field}>Overall Remarks<textarea style={{ ...styles.textarea, minHeight: 96 }} value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Add overall remarks" /></label>
          <button style={styles.primaryButton} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Checklist"}</button>
        </div>

        <div style={styles.panel}>
          <div style={styles.historyHeader}>
            <h2 style={styles.panelTitle}>Inspection History</h2>
            <input style={styles.input} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vessel, date, or checklist" />
          </div>
          {loading ? (
            <div style={styles.spinnerWrap}><div style={styles.spinner} /><span>Loading history…</span></div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Vessel</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} style={styles.row}>
                      <td style={styles.td}>{entry.vessels?.vessel_name || "—"}</td>
                      <td style={styles.td}>{entry.checklist_type}</td>
                      <td style={styles.td}>{entry.checklist_date}</td>
                      <td style={styles.td}><span style={{ ...styles.statusBadge, ...getStatusStyle(entry.status) }}>{entry.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusStyle(status: string) {
  if (status === "Failed") return { background: "#fee2e2", color: "#b91c1c" };
  if (status === "Completed") return { background: "#dcfce7", color: "#166534" };
  return { background: "#dbeafe", color: "#1d4ed8" };
}

const styles: any = {
  page: { padding: 30, background: "#f8fbff", minHeight: "100vh" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap" },
  eyebrow: { margin: 0, color: "#2563eb", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", fontSize: 12 },
  title: { margin: "4px 0", fontSize: 28, fontWeight: 800, color: "#0f172a" },
  subtitle: { margin: 0, color: "#64748b", fontSize: 14 },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 },
  kpiCard: { background: "white", borderRadius: 18, padding: 16, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)" },
  kpiLabel: { margin: 0, color: "#64748b", fontSize: 12, textTransform: "uppercase", fontWeight: 700 },
  kpiValue: { display: "block", marginTop: 6, fontSize: 24, color: "#0f172a" },
  mainGrid: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 },
  panel: { background: "white", borderRadius: 24, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)" },
  panelTitle: { margin: "0 0 14px", fontSize: 18, color: "#0f172a" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6, fontWeight: 700, color: "#334155" },
  input: { padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1", background: "#f8fafc" },
  sectionTitle: { margin: "16px 0 10px", fontSize: 16, color: "#0f172a" },
  itemsGrid: { display: "grid", gap: 12, marginBottom: 14 },
  itemCard: { border: "1px solid #e2e8f0", borderRadius: 16, padding: 12, background: "#f8fbff" },
  itemHeader: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 },
  optionRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  optionButton: { border: "1px solid #cbd5e1", background: "white", color: "#334155", padding: "6px 10px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 700 },
  optionActive: { background: "#dbeafe", color: "#1d4ed8", borderColor: "#93c5fd" },
  textarea: { width: "100%", minHeight: 70, padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1", background: "white", resize: "vertical" },
  primaryButton: { marginTop: 12, border: "none", background: "linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)", color: "white", padding: "12px 14px", borderRadius: 999, fontWeight: 700, cursor: "pointer" },
  historyHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" },
  spinnerWrap: { display: "flex", alignItems: "center", gap: 10, color: "#2563eb", padding: 12 },
  spinner: { width: 20, height: 20, borderRadius: "50%", border: "3px solid #bfdbfe", borderTopColor: "#2563eb", animation: "spin 1s linear infinite" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 420 },
  th: { textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase" },
  td: { padding: "10px 8px", borderBottom: "1px solid #f1f5f9", fontSize: 14, color: "#334155" },
  row: { background: "white" },
  statusBadge: { padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, display: "inline-block" },
};
