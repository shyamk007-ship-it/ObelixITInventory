"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { canAccessAdmin, getUserProfile, Role } from "../../lib/rbac";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";

interface ActivityLogRow {
  id: number;
  action: string;
  description: string;
  created_at: string;
}

interface UserNameRow {
  full_name: string;
}

const actions = [
  "Assigned Asset",
  "Returned Asset",
  "Created Employee",
  "Deleted Employee",
  "Created Asset",
  "Deleted Asset",
  "Created User",
  "Login",
  "Logout",
];

const itStaffAllowedActions = [
  "Assigned Asset",
  "Returned Asset",
  "Created Asset",
  "Created Employee",
  "Deleted Asset",
];

const PAGE_SIZE = 12;

export default function AuditPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ role: Role } | null>(null);
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [userFilter, setUserFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("users")
      .select("full_name")
      .order("full_name", { ascending: true });

    if (!error) {
      const mappedUsers = (data as UserNameRow[] | null)?.map((item) => item.full_name) || [];
      setUsers(mappedUsers);
    }
  }, []);

  const buildQuery = useCallback((role: Role, countOnly = false) => {
    const query = supabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (role === "it_staff") {
      query.in("action", itStaffAllowedActions);
    }

    if (actionFilter !== "All") {
      query.eq("action", actionFilter);
    }

    if (userFilter !== "All") {
      query.ilike("description", `%${userFilter}%`);
    }

    if (search) {
      query.ilike("description", `%${search}%`);
    }

    if (fromDate) {
      query.gte("created_at", `${fromDate}T00:00:00Z`);
    }
    if (toDate) {
      query.lte("created_at", `${toDate}T23:59:59Z`);
    }

    if (!countOnly) {
      const start = (page - 1) * PAGE_SIZE;
      query.range(start, start + PAGE_SIZE - 1);
    }

    return query;
  }, [actionFilter, userFilter, search, fromDate, toDate, page]);

  const loadLogs = useCallback(async (pageNumber: number, role: Role) => {
    setNotice(null);
    const response = await buildQuery(role).range((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE - 1);
    if (response.error) {
      setNotice(response.error.message);
      return;
    }

    setLogs((response.data as ActivityLogRow[] | null) || []);
    setTotalCount(response.count || 0);
  }, [buildQuery]);

  useEffect(() => {
    const initialize = async () => {
      const currentProfile = await getUserProfile();
      if (!currentProfile) {
        router.replace("/login");
        return;
      }

      if (!canAccessAdmin(currentProfile.role)) {
        router.replace("/dashboard");
        return;
      }

      setProfile(currentProfile);
      await loadUsers();
      await loadLogs(1, currentProfile.role);
    };

    void initialize();
  }, [loadLogs, loadUsers, router]);

  const handleSearch = async () => {
    setPage(1);
    if (profile) {
      await loadLogs(1, profile.role);
    }
  };

  const handlePage = async (nextPage: number) => {
    if (profile) {
      setPage(nextPage);
      await loadLogs(nextPage, profile.role);
    }
  };

  const pageCount = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <>
      <Sidebar />
      <div style={styles.container}>
        <TopBar />

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Audit Trail</h1>
            <p style={styles.subtitle}>
              Review system activity with filters, dates, and pagination.
            </p>
          </div>
        </div>

        <div style={styles.filterCard}>
          <div style={styles.filterRow}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activity"
              style={styles.input}
            />
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={styles.input}>
              <option value="All">All Actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={styles.input}>
              <option value="All">All Users</option>
              {users.map((userName) => (
                <option key={userName} value={userName}>
                  {userName}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterRow}>
            <label style={styles.dateField}>
              From
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={styles.input} />
            </label>
            <label style={styles.dateField}>
              To
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={styles.input} />
            </label>
            <button onClick={handleSearch} style={styles.searchButton}>
              Apply Filters
            </button>
          </div>
        </div>

        {notice && <div style={styles.notice}>{notice}</div>}

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Timestamp</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td style={styles.emptyTd} colSpan={3}>
                    No audit records match your filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={styles.td}>{new Date(log.created_at).toLocaleString()}</td>
                    <td style={styles.td}>{log.action}</td>
                    <td style={styles.td}>{log.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.pagination}>
          <button disabled={page <= 1} onClick={() => handlePage(page - 1)} style={styles.pageButton}>
            Previous
          </button>
          <span style={styles.pageInfo}>
            Page {page} of {pageCount}
          </span>
          <button disabled={page >= pageCount} onClick={() => handlePage(page + 1)} style={styles.pageButton}>
            Next
          </button>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    marginLeft: 260,
    padding: 30,
    minHeight: "100vh",
    background: "#f1f5f9",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 700,
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 14,
  },
  filterCard: {
    background: "white",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    marginBottom: 24,
  },
  filterRow: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    marginBottom: 16,
  },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    fontSize: 14,
  },
  dateField: {
    display: "grid",
    gap: 8,
    fontSize: 14,
    color: "#0f172a",
  },
  searchButton: {
    padding: 14,
    borderRadius: 12,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
  notice: {
    marginBottom: 16,
    padding: 16,
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: 12,
  },
  tableWrap: {
    overflowX: "auto",
    background: "white",
    borderRadius: 18,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 900,
  },
  th: {
    textAlign: "left",
    padding: 16,
    background: "#f8fafc",
    color: "#334155",
    fontSize: 14,
    fontWeight: 700,
  },
  td: {
    padding: 16,
    borderBottom: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: 14,
  },
  emptyTd: {
    padding: 24,
    textAlign: "center",
    color: "#64748b",
  },
  pagination: {
    marginTop: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageButton: {
    padding: "12px 20px",
    borderRadius: 12,
    border: "none",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
  pageInfo: {
    color: "#475569",
    fontWeight: 700,
  },
};
