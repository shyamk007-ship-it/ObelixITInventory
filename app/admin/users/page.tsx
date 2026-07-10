"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { createAuditLog, buildAuditDescription } from "../../lib/audit";
import { canManageUsers, getUserProfile } from "../../lib/rbac";

interface UserRow {
  id: number;
  full_name: string;
  email: string;
  role: string;
}

export default function UsersPage() {
  const router = useRouter();
  const accessTimerRef = useRef<number | null>(null);
  const [authorized, setAuthorized] =
    useState(false);

  const [users, setUsers] = useState<UserRow[]>([]);

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [role, setRole] =
    useState("employee");

  // FETCH USERS
  const fetchUsers = useCallback(async () => {
    const { data, error } =
      await supabase
        .from("users")
        .select("id, full_name, email, role")
        .order("created_at", {
          ascending: false,
        });

    if (!error) {
      const typedUsers: UserRow[] = (data || []).map((item) => ({
        id: Number(item.id),
        full_name: String(item.full_name || ""),
        email: String(item.email || ""),
        role: String(item.role || "employee"),
      }));
      setUsers(typedUsers);
    }
  }, []);

  // CHECK ACCESS
  const checkAccess = useCallback(async () => {
    const profile = await getUserProfile();

    if (!profile) {
      router.replace("/login");
      return;
    }

    if (!canManageUsers(profile.role)) {
      alert("Access denied");

      router.replace("/dashboard");

      return;
    }

    setAuthorized(true);

    await fetchUsers();
  }, [fetchUsers, router]);

  useEffect(() => {
    accessTimerRef.current = window.setTimeout(() => {
      void checkAccess();
    }, 0);

    return () => {
      if (accessTimerRef.current !== null) {
        window.clearTimeout(accessTimerRef.current);
      }
    };
  }, [checkAccess]);

  // CREATE USER
  const createUser = useCallback(async () => {
    const { data, error } =
      await supabase.from("users").insert([
        {
          full_name: fullName,
          email,
          role,
        },
      ]).select();

    if (error) {
      alert(error.message);
      return;
    }

    await createAuditLog({
      action: "Created User",
      description: buildAuditDescription({
        event: "Created User",
        userName: fullName,
        recordType: "user",
        recordId: data?.[0]?.id,
        itemName: email,
      }),
    });

    alert("User created ✅");

    setFullName("");
    setEmail("");
    setRole("employee");

    await fetchUsers();
  }, [email, fetchUsers, fullName, role]);

  if (!authorized) {
    return <h1>Checking access...</h1>;
  }

  return (
    <div style={styles.container}>
      <h1>User Management</h1>

      <div style={styles.formCard}>
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) =>
            setFullName(e.target.value)
          }
          style={styles.input}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          style={styles.input}
        />

        <select
          value={role}
          onChange={(e) =>
            setRole(e.target.value)
          }
          style={styles.input}
        >
          <option value="employee">
            Employee
          </option>

          <option value="it_staff">
            IT Staff
          </option>

          <option value="admin">
            Admin
          </option>
        </select>

        <button
          onClick={createUser}
          style={styles.button}
        >
          Create User
        </button>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>
              Name
            </th>

            <th style={styles.th}>
              Email
            </th>

            <th style={styles.th}>
              Role
            </th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td style={styles.td}>
                {user.full_name}
              </td>

              <td style={styles.td}>
                {user.email}
              </td>

              <td style={styles.td}>
                {user.role}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: 40,
    fontFamily: "Arial",
  },

  formCard: {
    width: 400,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 30,
  },

  input: {
    padding: 12,
  },

  button: {
    padding: 12,
    background: "#2563eb",
    color: "white",
    border: "none",
    cursor: "pointer",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    border: "1px solid #ddd",
    padding: 12,
    background: "#f1f5f9",
  },

  td: {
    border: "1px solid #ddd",
    padding: 12,
  },
};