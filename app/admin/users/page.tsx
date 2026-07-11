"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreateUserPayload,
  RoleAssignmentInput,
  UserManagementRecord,
} from "../../lib/user-management";
import { canManageUsers, getUserProfile, isOwnerEmail } from "../../lib/rbac";
import { supabase } from "../../lib/supabase";

interface UsersApiResponse {
  success?: boolean;
  data?: UserManagementRecord[];
  user_id?: string;
  error?: string;
}

const ROLE_OPTIONS: Array<{ value: RoleAssignmentInput["role"]; label: string }> = [
  { value: "super_admin", label: "Super Admin" },
  { value: "office_admin", label: "Office Admin" },
  { value: "fleet_admin", label: "Fleet Admin" },
  { value: "captain", label: "Captain" },
  { value: "chief_engineer", label: "Chief Engineer" },
  { value: "it_officer", label: "IT Officer" },
  { value: "crew_member", label: "Crew Member" },
  { value: "admin", label: "Company Admin" },
  { value: "it_staff", label: "IT Staff" },
  { value: "eto", label: "ETO" },
  { value: "employee", label: "Employee" },
];

const WORKSPACE_OPTIONS: Array<{ value: RoleAssignmentInput["workspace"]; label: string }> = [
  { value: "company", label: "Both" },
  { value: "office", label: "Office" },
  { value: "fleet", label: "Fleet" },
  { value: "vessel", label: "Vessel" },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

type StatusFilter = "all" | "active" | "disabled" | "pending" | "locked";
type WorkspaceFilter = "all" | "office" | "fleet" | "both";

const defaultAssignment = (): RoleAssignmentInput => ({
  role: "employee",
  workspace: "office",
  vessel_id: null,
  department: null,
  is_active: true,
});

const newUserSeed = (): CreateUserPayload => ({
  full_name: "",
  email: "",
  role: "employee",
  temporary_password: "",
  is_active: true,
  force_password_change: true,
  assignments: [defaultAssignment()],
});

export default function UsersPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserManagementRecord[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [workspaceFilter, setWorkspaceFilter] = useState<WorkspaceFilter>("all");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);
  const [visibleCount, setVisibleCount] = useState(25);
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(true);
  const [newUser, setNewUser] = useState<CreateUserPayload>(newUserSeed());
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserManagementRecord | null>(null);
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const fetchWithSession = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers = new Headers(init?.headers || {});
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }

    return fetch(input, {
      ...init,
      headers,
    });
  }, []);

  const parseResponse = async <T,>(response: Response): Promise<T> => {
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  };

  const loadUsers = useCallback(async () => {
    const response = await fetchWithSession("/api/admin/users", { method: "GET" });
    const json = await parseResponse<UsersApiResponse>(response);
    if (!response.ok || !json.success) {
      throw new Error(json.error || "Unable to load users.");
    }

    setUsers(json.data || []);
  }, [fetchWithSession]);

  const verifyAccess = useCallback(async () => {
    setLoading(true);
    const profile = await getUserProfile();

    if (!profile) {
      router.replace("/login");
      return;
    }

    if (!canManageUsers(profile.role)) {
      router.replace("/unauthorized");
      return;
    }

    setAuthorized(true);
    try {
      await loadUsers();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, [loadUsers, router]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void verifyAccess();
    }, 0);

    return () => window.clearTimeout(id);
  }, [verifyAccess]);

  useEffect(() => {
    if (!useInfiniteScroll) {
      return;
    }

    const onScroll = () => {
      const threshold = document.documentElement.scrollHeight - window.innerHeight - 120;
      if (window.scrollY >= threshold) {
        setVisibleCount((prev) => prev + pageSize);
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [pageSize, useInfiniteScroll]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const assignment = user.assignments[0] || null;
      const department = (assignment?.department || "").toLowerCase();
      const workspace = assignment?.workspace || "company";
      const vessel = assignment?.vessel_id ? `vessel ${assignment.vessel_id}` : "";
      const workspaceLabel = workspace === "company" ? "both" : workspace;

      const matchSearch =
        !query ||
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query) ||
        department.includes(query) ||
        workspaceLabel.includes(query) ||
        vessel.includes(query) ||
        (user.is_active ? "active" : "disabled").includes(query);

      const matchRole = roleFilter === "all" || user.role === roleFilter;
      const matchDepartment = departmentFilter === "all" || department === departmentFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "disabled" && !user.is_active) ||
        (statusFilter === "pending" && !user.last_sign_in_at) ||
        (statusFilter === "locked" && !user.is_active && !!user.last_sign_in_at);

      const matchWorkspace =
        workspaceFilter === "all" ||
        (workspaceFilter === "both" && workspace === "company") ||
        (workspaceFilter === "office" && workspace === "office") ||
        (workspaceFilter === "fleet" && workspace === "fleet");

      return matchSearch && matchRole && matchDepartment && matchStatus && matchWorkspace;
    });
  }, [departmentFilter, roleFilter, search, statusFilter, users, workspaceFilter]);

  const visibleUsers = useMemo(
    () => (useInfiniteScroll ? filteredUsers.slice(0, visibleCount) : filteredUsers.slice(0, pageSize)),
    [filteredUsers, pageSize, useInfiniteScroll, visibleCount]
  );

  const departments = useMemo(() => {
    const unique = new Set<string>();
    users.forEach((user) => {
      const value = user.assignments[0]?.department;
      if (value) unique.add(value.toLowerCase());
    });
    return Array.from(unique).sort();
  }, [users]);

  const dashboardCards = useMemo(() => {
    const total = users.length;
    const office = users.filter((user) => (user.assignments[0]?.workspace || "") === "office").length;
    const fleet = users.filter((user) => (user.assignments[0]?.workspace || "") === "fleet").length;
    const disabled = users.filter((user) => !user.is_active).length;
    const pending = users.filter((user) => !user.last_sign_in_at).length;
    const activeSessions = users.filter((user) => !!user.last_sign_in_at).length;
    const recentLogins = users
      .filter((user) => !!user.last_sign_in_at)
      .sort((a, b) => Date.parse(b.last_sign_in_at || "") - Date.parse(a.last_sign_in_at || ""))
      .slice(0, 5).length;
    const passwordExpiring = users.filter((user) => user.force_password_change).length;

    return [
      { label: "Total Users", value: total },
      { label: "Office Users", value: office },
      { label: "Fleet Users", value: fleet },
      { label: "Disabled Users", value: disabled },
      { label: "Pending Invitations", value: pending },
      { label: "Active Sessions", value: activeSessions },
      { label: "Recent Logins", value: recentLogins },
      { label: "Password Expiring", value: passwordExpiring },
    ];
  }, [users]);

  const upsertAssignments = (assignment: RoleAssignmentInput) => [assignment];

  const createUser = async () => {
    setSaving(true);
    try {
      const response = await fetchWithSession("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      const json = await parseResponse<UsersApiResponse>(response);
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to create user.");
      }

      setNewUser(newUserSeed());
      setShowCreatePanel(false);
      await loadUsers();
      showToast("User created successfully.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  const saveUserImmediately = async (user: UserManagementRecord, patch: Partial<UserManagementRecord>) => {
    setSaving(true);
    try {
      const merged = { ...user, ...patch };
      const assignment = merged.assignments[0] || defaultAssignment();
      const payload: CreateUserPayload & { user_id: string } = {
        user_id: merged.auth_user_id,
        full_name: merged.full_name,
        email: merged.email,
        temporary_password: "",
        is_active: merged.is_active,
        force_password_change: merged.force_password_change,
        role: merged.role,
        assignments: upsertAssignments({
          ...assignment,
          role: merged.role,
        }),
      };

      const response = await fetchWithSession("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await parseResponse<UsersApiResponse>(response);

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to update user.");
      }

      await loadUsers();
      showToast("User updated.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async (user: UserManagementRecord) => {
    setSaving(true);
    try {
      const response = await fetchWithSession(`/api/admin/users/${user.auth_user_id}/reset-password`, {
        method: "POST",
      });
      const json = await parseResponse<{ success?: boolean; error?: string; recovery_link?: string | null }>(response);
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to reset password.");
      }

      if (json.recovery_link) {
        await navigator.clipboard.writeText(json.recovery_link);
      }
      showToast("Password reset link generated and copied.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to reset password.");
    } finally {
      setSaving(false);
    }
  };

  const confirmAndDelete = async () => {
    if (!confirmDelete) return;

    setSaving(true);
    try {
      const response = await fetchWithSession("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: confirmDelete.auth_user_id }),
      });
      const json = await parseResponse<UsersApiResponse>(response);

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to delete user.");
      }

      await loadUsers();
      setConfirmDelete(null);
      showToast("User deleted.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete user.");
    } finally {
      setSaving(false);
    }
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        showToast("Import file is empty.");
        return;
      }

      const headers = lines[0].split(",").map((value) => value.trim().toLowerCase());
      const rows = lines.slice(1).map((line) => line.split(","));

      const emailIndex = headers.indexOf("email");
      const nameIndex = headers.indexOf("full_name");
      const roleIndex = headers.indexOf("role");
      const workspaceIndex = headers.indexOf("workspace");
      const departmentIndex = headers.indexOf("department");
      const vesselIndex = headers.indexOf("vessel_id");

      if (emailIndex < 0 || nameIndex < 0 || roleIndex < 0) {
        showToast("Import requires full_name,email,role columns.");
        return;
      }

      let imported = 0;
      for (const columns of rows) {
        const email = String(columns[emailIndex] || "").trim().toLowerCase();
        const fullName = String(columns[nameIndex] || "").trim();
        const role = String(columns[roleIndex] || "employee").trim() as RoleAssignmentInput["role"];

        if (!email || !fullName) {
          continue;
        }

        const duplicate = users.some((user) => user.email.toLowerCase() === email);
        if (duplicate) {
          continue;
        }

        const workspaceRaw = workspaceIndex >= 0 ? String(columns[workspaceIndex] || "office").trim() : "office";
        const assignment: RoleAssignmentInput = {
          role,
          workspace: (workspaceRaw || "office") as RoleAssignmentInput["workspace"],
          department: departmentIndex >= 0 ? String(columns[departmentIndex] || "").trim() || null : null,
          vessel_id:
            vesselIndex >= 0 && columns[vesselIndex] ? Number(String(columns[vesselIndex]).trim()) || null : null,
          is_active: true,
        };

        const payload: CreateUserPayload = {
          full_name: fullName,
          email,
          temporary_password: "",
          is_active: true,
          force_password_change: true,
          role,
          assignments: [assignment],
        };

        const response = await fetchWithSession("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await parseResponse<UsersApiResponse>(response);
        if (response.ok && json.success) {
          imported += 1;
        }
      }

      await loadUsers();
      showToast(`Import completed. ${imported} users imported; duplicates skipped.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to import users.");
    }
  };

  const exportCsv = () => {
    const header = ["full_name", "email", "role", "workspace", "department", "vessel_id", "status", "last_login", "created"];
    const rows = filteredUsers.map((user) => {
      const assignment = user.assignments[0] || null;
      return [
        user.full_name,
        user.email,
        user.role,
        assignment?.workspace || "",
        assignment?.department || "",
        assignment?.vessel_id || "",
        user.is_active ? "active" : "disabled",
        user.last_sign_in_at || "",
        user.created_at || "",
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV export generated.");
  };

  const exportExcel = () => {
    exportCsv();
  };

  const exportPdf = () => {
    const html = `<html><body><h1>Users Export</h1><pre>${JSON.stringify(filteredUsers, null, 2)}</pre></body></html>`;
    const blob = new Blob([html], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users-export.pdf";
    a.click();
    URL.revokeObjectURL(url);
    showToast("PDF export generated.");
  };

  if (loading || !authorized) {
    return <div style={styles.loading}>Loading enterprise user management...</div>;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Identity Management</p>
          <h1 style={styles.title}>Enterprise User Administration</h1>
          <p style={styles.subtitle}>Microsoft Entra style centralized identity operations for Office and Fleet.</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => setShowCreatePanel((prev) => !prev)} style={styles.primaryButton}>
            {showCreatePanel ? "Close" : "Create User"}
          </button>
          <label style={styles.secondaryButton}>
            Import CSV/Excel
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                void handleImportFile(file);
              }}
            />
          </label>
          <button onClick={exportCsv} style={styles.secondaryButton}>Export CSV</button>
          <button onClick={exportExcel} style={styles.secondaryButton}>Export Excel</button>
          <button onClick={exportPdf} style={styles.secondaryButton}>Export PDF</button>
        </div>
      </header>

      <section style={styles.dashboardGrid}>
        {dashboardCards.map((card) => (
          <div key={card.label} style={styles.dashboardCard}>
            <p style={styles.cardLabel}>{card.label}</p>
            <p style={styles.cardValue}>{card.value}</p>
          </div>
        ))}
      </section>

      {showCreatePanel && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Create User</h2>
          <div style={styles.gridRow}>
            <input
              value={newUser.full_name}
              onChange={(event) => setNewUser((prev) => ({ ...prev, full_name: event.target.value }))}
              placeholder="Full Name"
              style={styles.input}
            />
            <input
              value={newUser.email}
              onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="Email"
              style={styles.input}
            />
            <input
              value={newUser.temporary_password || ""}
              onChange={(event) => setNewUser((prev) => ({ ...prev, temporary_password: event.target.value }))}
              placeholder="Temporary Password"
              style={styles.input}
            />
          </div>

          <div style={styles.gridRow}>
            <select
              value={newUser.role}
              onChange={(event) =>
                setNewUser((prev) => ({ ...prev, role: event.target.value as CreateUserPayload["role"] }))
              }
              style={styles.input}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={newUser.assignments[0]?.workspace || "office"}
              onChange={(event) =>
                setNewUser((prev) => ({
                  ...prev,
                  assignments: [
                    {
                      ...(prev.assignments[0] || defaultAssignment()),
                      workspace: event.target.value as RoleAssignmentInput["workspace"],
                    },
                  ],
                }))
              }
              style={styles.input}
            >
              {WORKSPACE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              value={newUser.assignments[0]?.department || ""}
              onChange={(event) =>
                setNewUser((prev) => ({
                  ...prev,
                  assignments: [
                    {
                      ...(prev.assignments[0] || defaultAssignment()),
                      department: event.target.value || null,
                    },
                  ],
                }))
              }
              placeholder="Department"
              style={styles.input}
            />

            <input
              type="number"
              value={newUser.assignments[0]?.vessel_id || ""}
              onChange={(event) =>
                setNewUser((prev) => ({
                  ...prev,
                  assignments: [
                    {
                      ...(prev.assignments[0] || defaultAssignment()),
                      vessel_id: event.target.value ? Number(event.target.value) : null,
                    },
                  ],
                }))
              }
              placeholder="Vessel"
              style={styles.input}
            />
          </div>

          <div style={styles.checkboxRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newUser.is_active}
                onChange={(event) => setNewUser((prev) => ({ ...prev, is_active: event.target.checked }))}
              />
              Active
            </label>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newUser.force_password_change}
                onChange={(event) => setNewUser((prev) => ({ ...prev, force_password_change: event.target.checked }))}
              />
              Force Password Change
            </label>
            <button disabled={saving} onClick={() => void createUser()} style={styles.primaryButton}>
              {saving ? "Saving..." : "Create User"}
            </button>
          </div>
        </section>
      )}

      <section style={styles.card}>
        <div style={styles.toolbar}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, role, department, workspace, vessel, status"
            style={styles.inputWide}
          />

          <select value={workspaceFilter} onChange={(event) => setWorkspaceFilter(event.target.value as WorkspaceFilter)} style={styles.input}>
            <option value="all">Workspace: All</option>
            <option value="office">Workspace: Office</option>
            <option value="fleet">Workspace: Fleet</option>
            <option value="both">Workspace: Both</option>
          </select>

          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} style={styles.input}>
            <option value="all">Role: All</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Role: {option.label}
              </option>
            ))}
          </select>

          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} style={styles.input}>
            <option value="all">Department: All</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                Department: {department}
              </option>
            ))}
          </select>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} style={styles.input}>
            <option value="all">Status: All</option>
            <option value="active">Status: Active</option>
            <option value="disabled">Status: Disabled</option>
            <option value="pending">Status: Pending</option>
            <option value="locked">Status: Locked</option>
          </select>

          <select
            value={String(pageSize)}
            onChange={(event) => {
              const value = Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number];
              setPageSize(value);
              setVisibleCount(value);
            }}
            style={styles.input}
          >
            {PAGE_SIZE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} / page
              </option>
            ))}
          </select>

          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={useInfiniteScroll} onChange={(event) => setUseInfiniteScroll(event.target.checked)} />
            Infinite Scroll
          </label>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Avatar</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Workspace</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Vessel</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Last Login</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={11} style={styles.emptyCell}>No users found.</td>
                </tr>
              ) : (
                visibleUsers.map((user) => {
                  const assignment = user.assignments[0] || defaultAssignment();
                  const owner = isOwnerEmail(user.email);
                  return (
                    <tr key={user.auth_user_id}>
                      <td style={styles.td}>
                        <div style={styles.avatar}>{user.full_name.charAt(0).toUpperCase()}</div>
                      </td>
                      <td style={styles.td}>{user.full_name}</td>
                      <td style={styles.td}>{user.email}</td>
                      <td style={styles.td}>
                        <select
                          value={user.role}
                          disabled={owner || saving}
                          onChange={(event) =>
                            void saveUserImmediately(user, { role: event.target.value as UserManagementRecord["role"] })
                          }
                          style={styles.inlineSelect}
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={styles.td}>
                        <select
                          value={assignment.workspace}
                          disabled={owner || saving}
                          onChange={(event) =>
                            void saveUserImmediately(user, {
                              assignments: [
                                {
                                  ...assignment,
                                  workspace: event.target.value as RoleAssignmentInput["workspace"],
                                },
                              ],
                            })
                          }
                          style={styles.inlineSelect}
                        >
                          {WORKSPACE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={styles.td}>
                        <input
                          value={assignment.department || ""}
                          disabled={saving}
                          onBlur={(event) =>
                            void saveUserImmediately(user, {
                              assignments: [{ ...assignment, department: event.target.value || null }],
                            })
                          }
                          defaultValue={assignment.department || ""}
                          style={styles.inlineInput}
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          value={assignment.vessel_id || ""}
                          disabled={saving}
                          onBlur={(event) =>
                            void saveUserImmediately(user, {
                              assignments: [
                                {
                                  ...assignment,
                                  vessel_id: event.target.value ? Number(event.target.value) : null,
                                },
                              ],
                            })
                          }
                          defaultValue={assignment.vessel_id || ""}
                          style={styles.inlineInput}
                        />
                      </td>
                      <td style={styles.td}>
                        <span style={user.is_active ? styles.badgeActive : styles.badgeDisabled}>
                          {user.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td style={styles.td}>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Never"}</td>
                      <td style={styles.td}>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}</td>
                      <td style={styles.td}>
                        <div style={styles.actionsColumn}>
                          <Link href={`/admin/users/${user.auth_user_id}`} style={styles.actionLink}>View</Link>
                          <Link href={`/admin/users/${user.auth_user_id}?tab=overview`} style={styles.actionLink}>Edit</Link>
                          <button disabled={saving || owner} onClick={() => void resetPassword(user)} style={styles.actionButton}>Reset Password</button>
                          <button
                            disabled={saving || owner}
                            onClick={() => void saveUserImmediately(user, { is_active: !user.is_active })}
                            style={styles.actionButton}
                          >
                            {user.is_active ? "Disable" : "Enable"}
                          </button>
                          <button disabled={saving || owner} onClick={() => setConfirmDelete(user)} style={styles.actionDangerButton}>Delete</button>
                          <Link href={`/admin/users/${user.auth_user_id}/security`} style={styles.actionLink}>Security</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!useInfiniteScroll && filteredUsers.length > pageSize && (
          <p style={styles.paginationNote}>Showing first {pageSize} records. Enable infinite scrolling for more.</p>
        )}
      </section>

      {confirmDelete && (
        <div style={styles.dialogBackdrop}>
          <div style={styles.dialogCard}>
            <h3 style={styles.dialogTitle}>Delete User</h3>
            <p style={styles.dialogText}>This action cannot be undone.</p>
            <p style={styles.dialogMeta}>{confirmDelete.full_name} ({confirmDelete.email})</p>
            <div style={styles.dialogActions}>
              <button onClick={() => setConfirmDelete(null)} style={styles.secondaryButton}>Cancel</button>
              <button onClick={() => void confirmAndDelete()} style={styles.dangerButton}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", background: "#f1f5f9", padding: 24, display: "grid", gap: 14 },
  loading: { minHeight: "100vh", display: "grid", placeItems: "center", fontWeight: 700, color: "#0f172a" },
  header: {
    background: "white",
    borderRadius: 16,
    border: "1px solid #dbeafe",
    padding: 18,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  headerActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  eyebrow: { margin: 0, fontSize: 12, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.12em" },
  title: { margin: "6px 0", fontSize: 28, color: "#0f172a", fontWeight: 800 },
  subtitle: { margin: 0, color: "#64748b" },
  dashboardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 },
  dashboardCard: { background: "white", borderRadius: 14, border: "1px solid #dbeafe", padding: 14 },
  cardLabel: { margin: 0, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 },
  cardValue: { margin: "8px 0 0", color: "#0f172a", fontSize: 24, fontWeight: 800 },
  card: { background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: 14, display: "grid", gap: 10 },
  cardTitle: { margin: 0, fontSize: 18, color: "#0f172a", fontWeight: 800 },
  gridRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 },
  checkboxRow: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: 6, color: "#0f172a", fontWeight: 600 },
  toolbar: { display: "grid", gridTemplateColumns: "2fr repeat(6, minmax(130px, 1fr))", gap: 8, alignItems: "center" },
  input: { width: "100%", borderRadius: 10, border: "1px solid #cbd5e1", padding: "10px 12px", fontSize: 13, background: "white" },
  inputWide: { width: "100%", borderRadius: 10, border: "1px solid #cbd5e1", padding: "10px 12px", fontSize: 13, background: "white" },
  inlineInput: { width: "100%", borderRadius: 8, border: "1px solid #cbd5e1", padding: "6px 8px", fontSize: 12 },
  inlineSelect: { width: "100%", borderRadius: 8, border: "1px solid #cbd5e1", padding: "6px 8px", fontSize: 12 },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 1320 },
  th: { textAlign: "left", padding: 12, background: "#f8fafc", fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" },
  td: { padding: 12, borderTop: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, verticalAlign: "top" },
  emptyCell: { textAlign: "center", padding: 26, color: "#64748b" },
  avatar: { width: 34, height: 34, borderRadius: "50%", background: "#2563eb", color: "white", display: "grid", placeItems: "center", fontWeight: 800 },
  badgeActive: { display: "inline-flex", borderRadius: 999, background: "#dcfce7", color: "#166534", padding: "4px 8px", fontSize: 11, fontWeight: 700 },
  badgeDisabled: { display: "inline-flex", borderRadius: 999, background: "#fee2e2", color: "#991b1b", padding: "4px 8px", fontSize: 11, fontWeight: 700 },
  actionsColumn: { display: "grid", gap: 6 },
  actionLink: { color: "#1d4ed8", fontWeight: 700, textDecoration: "none", fontSize: 12 },
  actionButton: { border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", color: "#0f172a", padding: "6px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  actionDangerButton: { border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", padding: "6px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  paginationNote: { margin: 0, color: "#64748b", fontSize: 12 },
  dialogBackdrop: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", display: "grid", placeItems: "center", zIndex: 1000 },
  dialogCard: { width: "min(440px, 92vw)", background: "white", borderRadius: 14, border: "1px solid #dbeafe", padding: 18, display: "grid", gap: 10 },
  dialogTitle: { margin: 0, color: "#0f172a", fontSize: 20, fontWeight: 800 },
  dialogText: { margin: 0, color: "#991b1b", fontWeight: 700 },
  dialogMeta: { margin: 0, color: "#475569", fontSize: 13 },
  dialogActions: { display: "flex", justifyContent: "flex-end", gap: 8 },
  primaryButton: { border: "none", borderRadius: 10, background: "#2563eb", color: "white", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  secondaryButton: { border: "1px solid #cbd5e1", borderRadius: 10, background: "#f8fafc", color: "#0f172a", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  dangerButton: { border: "1px solid #fecaca", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  toast: {
    position: "fixed",
    right: 18,
    bottom: 18,
    background: "#0f172a",
    color: "white",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    fontSize: 13,
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.35)",
  },
};
