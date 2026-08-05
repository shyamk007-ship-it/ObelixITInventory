"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { useInventoryPermissions } from "../../hooks/useInventoryModule";

const links = [
  { href: "/office/inventory/dashboard", label: "Dashboard", permission: "canView" },
  { href: "/office/inventory/stock", label: "Stock Management", permission: "canManageStock" },
  { href: "/office/inventory/warehouses", label: "Warehouses", permission: "canManageWarehouses" },
  { href: "/office/inventory/categories", label: "Categories", permission: "canManageStock" },
  { href: "/office/inventory/movements", label: "Stock Movements", permission: "canManageStock" },
  { href: "/office/inventory/requests", label: "Stock Requests", permission: "canManageRequests" },
  { href: "/office/inventory/transfers", label: "Stock Transfers", permission: "canManageTransfers" },
  { href: "/office/inventory/consumables", label: "Consumables", permission: "canManageStock" },
  { href: "/office/inventory/receiving", label: "Purchase Receiving (GRN)", permission: "canManageStock" },
  { href: "/office/inventory/suppliers", label: "Suppliers", permission: "canManageSuppliers" },
  { href: "/office/inventory/audit", label: "Inventory Audit", permission: "canManageAudits" },
  { href: "/office/inventory/cycle-count", label: "Cycle Count", permission: "canManageAudits" },
  { href: "/office/inventory/barcode", label: "Barcode & QR", permission: "canManageStock" },
  { href: "/office/inventory/low-stock", label: "Low Stock Center", permission: "canManageStock" },
  { href: "/office/inventory/reports", label: "Inventory Reports", permission: "canExport" },
  { href: "/office/inventory/settings", label: "Inventory Settings", permission: "canManageSettings" },
] as const;

export default function InventoryModuleNav() {
  const pathname = usePathname();
  const permissions = useInventoryPermissions();

  return (
    <nav style={styles.nav}>
      {links.map((link) => {
        if (!permissions[link.permission]) return null;
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link key={link.href} href={link.href} style={{ ...styles.link, ...(active ? styles.linkActive : {}) }}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

const styles: Record<string, CSSProperties> = {
  nav: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  link: {
    textDecoration: "none",
    border: "1px solid #bfdbfe",
    background: "#ffffff",
    color: "#1d4ed8",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 800,
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.05)",
    transition: "transform 120ms ease, box-shadow 120ms ease",
  },
  linkActive: {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "white",
    borderColor: "#1d4ed8",
    boxShadow: "0 14px 24px rgba(37, 99, 235, 0.25)",
    transform: "translateY(-1px)",
  },
};
