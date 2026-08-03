"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface SearchBarProps {
  placeholder?: string;
}

type SearchResult = {
  id: string;
  label: string;
  description: string;
  href: string;
  type: "asset" | "employee" | "ticket" | "maintenance" | "vendor" | "purchase-order" | "report";
};

export default function SearchBar({ placeholder = "Search..." }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (event.target instanceof Node && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void runSearch(query.trim());
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query]);

  const runSearch = async (term: string) => {
    setLoading(true);
    const like = `%${term}%`;

    const [assets, employees, tickets, maintenance, vendors, purchaseOrders] = await Promise.all([
      supabase.from("assets").select("id, asset_name, asset_tag, serial_number, status").is("vessel_id", null).or(`asset_name.ilike.${like},asset_tag.ilike.${like},serial_number.ilike.${like}`).limit(8),
      supabase.from("employees").select("id, full_name, department, email").or(`full_name.ilike.${like},email.ilike.${like},department.ilike.${like}`).limit(8),
      supabase.from("tickets").select("id, title, status, priority").is("vessel_id", null).or(`title.ilike.${like},status.ilike.${like},priority.ilike.${like}`).limit(8),
      supabase.from("asset_maintenance").select("id, status, vendor, maintenance_date, assets(asset_name, asset_tag)").or(`vendor.ilike.${like},status.ilike.${like}`).limit(8),
      supabase.from("asset_vendors").select("id, name, contact_person").or(`name.ilike.${like},contact_person.ilike.${like}`).limit(8),
      supabase.from("asset_purchase_orders").select("id, po_number, vendor_name, status").or(`po_number.ilike.${like},vendor_name.ilike.${like},status.ilike.${like}`).limit(8),
    ]);

    const nextResults: SearchResult[] = [];

    ((assets.data || []) as Array<any>).forEach((item) => {
      nextResults.push({
        id: `asset-${item.id}`,
        label: item.asset_name || item.asset_tag || "Asset",
        description: [item.asset_tag, item.serial_number, item.status].filter(Boolean).join(" • "),
        href: `/office/assets/${item.id}`,
        type: "asset",
      });
    });

    ((employees.data || []) as Array<any>).forEach((item) => {
      nextResults.push({
        id: `employee-${item.id}`,
        label: item.full_name || "Employee",
        description: [item.department, item.email].filter(Boolean).join(" • "),
        href: `/office/employees/${item.id}`,
        type: "employee",
      });
    });

    ((tickets.data || []) as Array<any>).forEach((item) => {
      nextResults.push({
        id: `ticket-${item.id}`,
        label: item.title || `Ticket #${item.id}`,
        description: [item.status, item.priority].filter(Boolean).join(" • "),
        href: "/office/analytics/open-tickets",
        type: "ticket",
      });
    });

    ((maintenance.data || []) as Array<any>).forEach((item) => {
      const assetName = Array.isArray(item.assets) ? item.assets?.[0]?.asset_name : item.assets?.asset_name;
      nextResults.push({
        id: `maintenance-${item.id}`,
        label: assetName || `Maintenance #${item.id}`,
        description: [item.vendor, item.status, item.maintenance_date].filter(Boolean).join(" • "),
        href: "/office/analytics/maintenance-due",
        type: "maintenance",
      });
    });

    ((vendors.data || []) as Array<any>).forEach((item) => {
      nextResults.push({
        id: `vendor-${item.id}`,
        label: item.name || "Vendor",
        description: item.contact_person || "Vendor profile",
        href: "/office/assets/vendors",
        type: "vendor",
      });
    });

    ((purchaseOrders.data || []) as Array<any>).forEach((item) => {
      nextResults.push({
        id: `po-${item.id}`,
        label: item.po_number || `PO #${item.id}`,
        description: [item.vendor_name, item.status].filter(Boolean).join(" • "),
        href: "/office/assets/purchase-orders",
        type: "purchase-order",
      });
    });

    const reportKeywords = ["report", "analytics", "export", "audit"];
    if (reportKeywords.some((keyword) => term.toLowerCase().includes(keyword))) {
      nextResults.push(
        {
          id: "report-assets",
          label: "Asset Reports",
          description: "Asset register, warranty, maintenance, disposal",
          href: "/office/assets/reports",
          type: "report",
        },
        {
          id: "report-analytics",
          label: "Office Analytics",
          description: "Executive BI views and drill-down pages",
          href: "/office/analytics",
          type: "report",
        }
      );
    }

    setResults(nextResults.slice(0, 18));
    setLoading(false);
    setOpen(true);
  };

  const grouped = useMemo(() => {
    const map = new Map<SearchResult["type"], SearchResult[]>();
    results.forEach((item) => {
      const list = map.get(item.type) || [];
      list.push(item);
      map.set(item.type, list);
    });
    return map;
  }, [results]);

  return (
    <div style={styles.wrapper} ref={wrapperRef}>
      <div style={styles.inputWrap}>
        <Search size={16} strokeWidth={2.1} style={styles.searchIcon} />
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(results.length > 0)}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          style={styles.input}
          aria-label="Search"
        />
        {query && (
          <button type="button" style={styles.clearButton} onClick={() => { setQuery(""); setResults([]); setOpen(false); }} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <strong>Universal Search</strong>
            <span style={styles.caption}>{loading ? "Searching..." : `${results.length} result(s)`}</span>
          </div>

          {results.length === 0 && !loading ? (
            <div style={styles.empty}>No matches found for assets, employees, tickets, serials, purchase orders, reports, maintenance, or vendors.</div>
          ) : (
            Array.from(grouped.entries()).map(([group, items]) => (
              <div key={group} style={styles.group}>
                <p style={styles.groupTitle}>{group.replace("-", " ")}</p>
                {items.map((item) => (
                  <Link key={item.id} href={item.href} style={styles.resultLink} onClick={() => setOpen(false)}>
                    <strong style={styles.resultLabel}>{item.label}</strong>
                    <span style={styles.resultDesc}>{item.description || "Open details"}</span>
                  </Link>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    width: "min(540px, 100%)",
    position: "relative",
  },
  inputWrap: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 10px",
    borderRadius: 12,
    border: "1px solid #bfdbfe",
    background: "white",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  searchIcon: {
    color: "#64748b",
    flexShrink: 0,
  },
  input: {
    width: "100%",
    padding: "12px 2px",
    border: "none",
    outline: "none",
    fontSize: 14,
    background: "white",
  },
  clearButton: {
    border: "none",
    background: "transparent",
    color: "#64748b",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
  },
  dropdown: {
    position: "absolute",
    top: 52,
    left: 0,
    width: "100%",
    maxHeight: 420,
    overflowY: "auto",
    borderRadius: 14,
    border: "1px solid #dbeafe",
    background: "white",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.14)",
    padding: 12,
    zIndex: 1200,
  },
  dropdownHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#0f172a",
    fontSize: 14,
    marginBottom: 8,
  },
  caption: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
  },
  empty: {
    color: "#64748b",
    fontSize: 13,
    padding: 12,
  },
  group: {
    display: "grid",
    gap: 6,
    marginTop: 10,
  },
  groupTitle: {
    margin: 0,
    fontSize: 11,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  },
  resultLink: {
    textDecoration: "none",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: "10px 12px",
    display: "grid",
    gap: 4,
  },
  resultLabel: {
    color: "#0f172a",
    fontSize: 13,
  },
  resultDesc: {
    color: "#64748b",
    fontSize: 12,
  },
};
