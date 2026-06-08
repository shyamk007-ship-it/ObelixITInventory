"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function UsersPage() {
  const [authorized, setAuthorized] =
    useState(false);

  const [users, setUsers] = useState<any[]>([]);

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [role, setRole] =
    useState("viewer");

  useEffect(() => {
    checkAccess();
  }, []);

  // CHECK ACCESS
  const checkAccess = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("email", user.email)
      .single();

    if (
      data?.role !== "super_admin"
    ) {
      alert("Access denied");

      window.location.href =
        "/dashboard";

      return;
    }

    setAuthorized(true);

    fetchUsers();
  };

  // FETCH USERS
  const fetchUsers = async () => {
    const { data, error } =
      await supabase
        .from("users")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    if (!error) {
      setUsers(data || []);
    }
  };

  // CREATE USER
  const createUser = async () => {
    const { error } =
      await supabase.from("users").insert([
        {
          full_name: fullName,
          email,
          role,
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("User created ✅");

    setFullName("");
    setEmail("");
    setRole("viewer");

    fetchUsers();
  };

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
          <option value="viewer">
            Viewer
          </option>

          <option value="it_staff">
            IT Staff
          </option>

          <option value="admin">
            Admin
          </option>

          <option value="super_admin">
            Super Admin
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

const styles: any = {
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