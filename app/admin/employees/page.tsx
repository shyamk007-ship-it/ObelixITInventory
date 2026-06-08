"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { createAuditLog, buildAuditDescription } from "../../lib/audit";
import { getUserProfile } from "../../lib/rbac";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading employees:", error);
      return;
    }

    setEmployees(data || []);
  };

  const createEmployee = async () => {
    if (!fullName || !email) {
      alert("Please fill all required fields");
      return;
    }

    const { data, error } = await supabase.from("employees").insert([
      {
        full_name: fullName,
        email,
        department,
        position,
        role: "employee",
      },
    ]).select();

    if (error) {
      alert(error.message);
      return;
    }

    const profile = await getUserProfile();
    await createAuditLog({
      action: "Created Employee",
      description: buildAuditDescription({
        event: "Created Employee",
        userName: profile?.full_name || "Unknown User",
        recordType: "employee",
        recordId: data?.[0]?.id,
        itemName: fullName,
      }),
    });

    alert("Employee Added ✅");
    setFullName("");
    setEmail("");
    setDepartment("");
    setPosition("");

    loadEmployees();
  };

  const deleteEmployee = async (id: number, name: string) => {
    const confirmDelete = confirm("Delete employee?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }

    const profile = await getUserProfile();
    await createAuditLog({
      action: "Deleted Employee",
      description: buildAuditDescription({
        event: "Deleted Employee",
        userName: profile?.full_name || "Unknown User",
        recordType: "employee",
        recordId: id,
        itemName: name,
      }),
    });

    loadEmployees();
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Employees</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employees..."
          style={styles.search}
        />
      </div>

      <div style={styles.form}>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          style={styles.input}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={styles.input}
        />
        <input
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="Department"
          style={styles.input}
        />
        <input
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Position"
          style={styles.input}
        />
        <button type="button" onClick={createEmployee} style={styles.button}>
          Add Employee
        </button>
      </div>

      <div style={styles.grid}>
        {filteredEmployees.map((employee) => (
          <div key={employee.id} style={styles.card}>
            <div style={styles.avatar}>
              {employee.full_name?.charAt(0) || "?"}
            </div>
            <h3>{employee.full_name}</h3>
            <p>{employee.email}</p>
            <p>{employee.department}</p>
            <p>{employee.position}</p>
            <button
              type="button"
              style={styles.delete}
              onClick={() => deleteEmployee(employee.id, employee.full_name)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: any = {
  container: {
    padding: 30,
    background: "#f1f5f9",
    minHeight: "100vh",
    fontFamily: "Arial",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 12,
  },
  search: {
    padding: 12,
    width: 260,
    borderRadius: 8,
    border: "1px solid #d1d5db",
  },
  form: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 30,
    background: "white",
    padding: 20,
    borderRadius: 14,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    border: "1px solid #d1d5db",
  },
  button: {
    padding: 12,
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 20,
  },
  card: {
    background: "white",
    padding: 20,
    borderRadius: 14,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "#2563eb",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
  },
  delete: {
    marginTop: 15,
    padding: "10px 14px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
};