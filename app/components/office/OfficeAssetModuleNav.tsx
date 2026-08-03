"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

const links = [
  { href: "/office/assets", label: "Overview" },
  { href: "/office/assets/register", label: "Asset Register" },
  { href: "/office/assets/categories", label: "Categories" },
  { href: "/office/assets/vendors", label: "Vendors" },
  { href: "/office/assets/purchase-orders", label: "Purchase Orders" },
  { href: "/office/assets/assignments", label: "Assignments" },
  { href: "/office/assets/returns", label: "Returns" },
  { href: "/office/assets/warranty", label: "Warranty" },
  { href: "/office/assets/maintenance", label: "Maintenance" },
  { href: "/office/assets/disposal", label: "Disposal" },
  { href: "/office/assets/reports", label: "Reports" },
];

export default function OfficeAssetModuleNav() {
  const pathname = usePathname();

  return (
    <nav style={styles.nav}>
      {links.map((link) => {
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
    marginBottom: 18,
  },
  link: {
    textDecoration: "none",
    border: "1px solid rgba(191, 219, 254, 0.9)",
    background: "rgba(255, 255, 255, 0.92)",
    color: "#1d4ed8",
    borderRadius: 999,
    padding: "9px 14px",
    fontSize: 12,
    fontWeight: 800,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04)",
  },
  linkActive: {
    background: "#2563eb",
    borderColor: "#2563eb",
    color: "white",
  },
};
