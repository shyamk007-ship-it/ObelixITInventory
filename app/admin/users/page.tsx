"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [role, setRole] =
    useState("viewer");

  useEffect(() => {
    fetchUsers();
  }, []);

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
    if (!fullName || !email) {
      alert("Fill all fields");
      return;
    }

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

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>
        User Management
      </h1>

      {/* CREATE USER FORM */}
      <div style={styles.formCard}>
        <h2>Create User</h2>

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

      {/* USERS TABLE */}
      <div style={{ marginTop: 40 }}>
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
    </div>
  );
}

const styles: any = {
  container: {
    padding: 40,
    fontFamily: "Arial",
    background: "#f8fafc",
    minHeight: "100vh",
  },

  title: {
    marginBottom: 30,
  },

  formCard: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    width: 400,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.1)",
  },

  input: {
    padding: 12,
    borderRadius: 6,
    border: "1px solid #cbd5e1",
  },

  button: {
    padding: 12,
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: "bold",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "white",
  },

  th: {
    padding: 12,
    border: "1px solid #ddd",
    background: "#e2e8f0",
    textAlign: "left",
  },

  td: {
    padding: 12,
    border: "1px solid #ddd",
  },
};