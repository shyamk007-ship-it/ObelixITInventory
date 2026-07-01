"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getUserProfile,
  canManageUsers,
  canManageAssets,
  canViewEmployees,
  canAssignAssets,
  isEmployee,
  roleLabel,
  Role,
} from "../lib/rbac";

export default function Sidebar() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadRole = async () => {
      const profile = await getUserProfile();

      if (!profile) {
        router.push("/login");
        return;
      }

      setRole(profile.role);
      setLoading(false);
    };

    loadRole();
  }, [router]);

  if (loading || !role) {
    return (
      <div style={styles.sidebar}>
        <p style={styles.loading}>Loading menu...</p>
      </div>
    );
  }

  const showAdminLinks = !isEmployee(role);

  return (
    <div style={styles.sidebar}>
      <div style={styles.brand}>
        <h2 style={styles.logo}>IT Management</h2>
        <span style={styles.roleBadge}>{roleLabel[role]}</span>
      </div>

      <nav style={styles.nav}>
        {showAdminLinks ? (
          <>
            <Link href="/dashboard" style={styles.link}>
              Dashboard
            </Link>

            <div style={styles.sectionLabel}>🚢 Fleet</div>
            <Link href="/fleet/dashboard" style={styles.link}>
              Fleet Dashboard
            </Link>
            <Link href="/fleet/dashboard" style={styles.link}>
              Vessels
            </Link>
            <Link href="/admin/assets" style={styles.link}>
              Fleet Assets
            </Link>
            <Link href="/admin/network" style={styles.link}>
              Network Monitoring
            </Link>
            <Link href="/admin/checklists" style={styles.link}>
              IT Checklist
            </Link>
            <Link href="/admin/maintenance" style={styles.link}>
              Maintenance
            </Link>
            <Link href="/admin/tickets" style={styles.link}>
              Incidents
            </Link>
            <Link href="/fleet/documents" style={styles.link}>
              Documents
            </Link>
            <Link href="/fleet/reports" style={styles.link}>
              Reports
            </Link>

            <Link href="/admin/vessels" style={styles.link}>
              🚢 Vessels
            </Link>

            <Link href="/admin/checklists" style={styles.link}>
              📝 IT Checklist
            </Link>

            {canManageAssets(role) && (
              <Link href="/admin/assets" style={styles.link}>
                Assets
              </Link>
            )}

            {canViewEmployees(role) && (
              <Link href="/admin/employees" style={styles.link}>
                Employees
              </Link>
            )}

            {canAssignAssets(role) && (
              <Link href="/admin/assignments" style={styles.link}>
                Assignments
              </Link>
            )}

            <Link href="/admin/tickets" style={styles.link}>
              Tickets
            </Link>

            <Link href="/admin/maintenance" style={styles.link}>
              Maintenance
            </Link>

            <Link href="/admin/network" style={styles.link}>
              🌐 Network Monitoring
            </Link>

            <Link href="/admin/reports" style={styles.link}>
              Reports
            </Link>

            <Link href="/admin/activity" style={styles.link}>
              Activity
            </Link>

            {canManageUsers(role) && (
              <Link href="/admin/users" style={styles.link}>
                Users
              </Link>
            )}
          </>
        ) : (
          <>
            <Link href="/employee" style={styles.link}>
              My Assignments
            </Link>
            <Link href="/employee" style={styles.link}>
              My Support
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}

const styles: any = {
  sidebar: {
    width: 240,
    height: "100vh",
    background: "#0f172a",
    color: "white",
    padding: 20,
    position: "fixed",
    left: 0,
    top: 0,
  },

  logo: {
    marginBottom: 16,
    color: "#38bdf8",
    fontSize: 24,
  },

  brand: {
    marginBottom: 28,
  },

  roleBadge: {
    display: "inline-flex",
    marginTop: 12,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: 700,
  },

  loading: {
    color: "#cbd5e1",
    fontSize: 14,
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  link: {
    color: "white",
    textDecoration: "none",
    padding: 12,
    borderRadius: 8,
    background: "#1e293b",
  },
  sectionLabel: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: 6,
  },
};