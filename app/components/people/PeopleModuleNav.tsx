"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import type { PeoplePermission } from "../../hooks/usePeopleModule";
import { usePeoplePermissions } from "../../hooks/usePeopleModule";

const navItems = [
  { href: "/office/people/dashboard", label: "Dashboard", permission: "canView" as keyof PeoplePermission },
  { href: "/office/people/employees", label: "Employees", permission: "canView" as keyof PeoplePermission },
  { href: "/office/people/departments", label: "Departments", permission: "canManageDepartments" as keyof PeoplePermission },
  { href: "/office/people/visitors", label: "Visitors", permission: "canManageVisitors" as keyof PeoplePermission },
  { href: "/office/people/attendance", label: "Attendance", permission: "canManageAttendance" as keyof PeoplePermission },
  { href: "/office/people/leave", label: "Leave", permission: "canManageLeave" as keyof PeoplePermission },
  { href: "/office/people/performance", label: "Performance", permission: "canManagePerformance" as keyof PeoplePermission },
  { href: "/office/people/training", label: "Training", permission: "canManageTraining" as keyof PeoplePermission },
  { href: "/office/people/documents", label: "Documents", permission: "canManageDocuments" as keyof PeoplePermission },
  { href: "/office/people/organization-chart", label: "Organization Chart", permission: "canView" as keyof PeoplePermission },
  { href: "/office/people/reports", label: "Reports", permission: "canExport" as keyof PeoplePermission },
] as const;

export default function PeopleModuleNav() {
  const pathname = usePathname();
  const permissions = usePeoplePermissions();

  const visibleItems = navItems.filter((item) => permissions[item.permission]);

  return (
    <nav style={styles.wrap} aria-label="People module navigation">
      {visibleItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} style={{ ...styles.link, ...(active ? styles.active : {}) }}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    borderRadius: 14,
    border: "1px solid #dbeafe",
    background: "#ffffff",
    padding: 10,
  },
  link: {
    textDecoration: "none",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#334155",
    fontSize: 12,
    fontWeight: 700,
    padding: "7px 10px",
  },
  active: {
    background: "#2563eb",
    borderColor: "#2563eb",
    color: "white",
  },
};
