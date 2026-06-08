"use client";

import { useEffect, useState } from "react";

import { supabase } from "../../lib/supabase";

export default function AssignmentsPage() {
const [assets, setAssets] =
useState<any[]>([]);

const [employees, setEmployees] =
useState<any[]>([]);

const [assignments, setAssignments] =
useState<any[]>([]);

const [selectedAsset, setSelectedAsset] =
useState("");

const [selectedEmployee, setSelectedEmployee] =
useState("");

const [notes, setNotes] =
useState("");

useEffect(() => {
loadAssets();
loadEmployees();
loadAssignments();
}, []);

// LOAD ASSETS
const loadAssets = async () => {
const { data } = await supabase
.from("assets")
.select("*")
.eq("status", "Available");

  setAssets(data || []);
};

// LOAD EMPLOYEES
const loadEmployees = async () => {
const { data } = await supabase
.from("employees")
.select("*");

  setEmployees(data || []);
};

// LOAD ASSIGNMENTS
const loadAssignments = async () => {
const { data } = await supabase
.from("asset_assignments")
.select(`         *,
        assets(asset_name, asset_tag),
        employees(full_name)
      `)
.order("created_at", {
ascending: false,
});

  setAssignments(data || []);
};

// ASSIGN ASSET
const assignAsset = async () => {
if (
!selectedAsset ||
!selectedEmployee
) {
alert("Select asset & employee");
return;
}

  // INSERT ASSIGNMENT
  await supabase.from("asset_assignments").insert([
    {
      asset_id: selectedAsset,
      employee_id: selectedEmployee,
      notes,
    },
  ]);

  // UPDATE ASSET STATUS
  await supabase
    .from("assets")
    .update({
      status: "Assigned",
      assigned_to: selectedEmployee,
    })
    .eq("id", selectedAsset);

  // ACTIVITY LOG
  await supabase.from("activity_logs").insert([
    {
      action: "Assigned Asset",
      description: "Asset assigned to employee",
    },
  ]);

  alert("Asset assigned ✅");

  setSelectedAsset("");
  setSelectedEmployee("");
  setNotes("");

  loadAssets();
  loadAssignments();
};

// RETURN ASSET
const returnAsset = async (
assignmentId: number,
assetId: number
) => {
// UPDATE ASSIGNMENT
await supabase
.from("asset_assignments")
.update({
status: "Returned",
returned_date:
new Date(),
})
.eq("id", assignmentId);

  // UPDATE ASSET
  await supabase
    .from("assets")
    .update({
      status: "Available",
      assigned_to: null,
    })
    .eq("id", assetId);

  // LOG
  await supabase.from("activity_logs").insert([
    {
      action: "Returned Asset",
      description: "Asset returned",
    },
  ]);

  loadAssignments();
  loadAssets();
};

return ( <div style={styles.container}> <h1>Asset Assignments</h1>

```
  {/* FORM */}
  <div style={styles.form}>
    <select
      value={selectedAsset}
      onChange={(e) =>
        setSelectedAsset(
          e.target.value
        )
      }
      style={styles.input}
    >
      <option value="">
        Select Asset
      </option>

      {assets.map((asset) => (
        <option
          key={asset.id}
          value={asset.id}
        >
          {asset.asset_name}
        </option>
      ))}
    </select>

    <select
      value={selectedEmployee}
      onChange={(e) =>
        setSelectedEmployee(
          e.target.value
        )
      }
      style={styles.input}
    >
      <option value="">
        Select Employee
      </option>

      {employees.map((emp) => (
        <option
          key={emp.id}
          value={emp.id}
        >
          {emp.full_name}
        </option>
      ))}
    </select>

    <input
      placeholder="Notes"
      value={notes}
      onChange={(e) =>
        setNotes(
          e.target.value
        )
      }
      style={styles.input}
    />

    <button
      onClick={assignAsset}
      style={styles.button}
    >
      Assign Asset
    </button>
  </div>

  {/* TABLE */}
  <table style={styles.table}>
    <thead>
      <tr>
        <th style={styles.th}>
          Asset
        </th>

        <th style={styles.th}>
          Employee
        </th>

        <th style={styles.th}>
          Status
        </th>

        <th style={styles.th}>
          Assigned Date
        </th>

        <th style={styles.th}>
          Actions
        </th>
      </tr>
    </thead>

    <tbody>
      {assignments.map((a) => (
        <tr key={a.id}>
          <td style={styles.td}>
            {
              a.assets
                ?.asset_name
            }
          </td>

          <td style={styles.td}>
            {
              a.employees
                ?.full_name
            }
          </td>

          <td style={styles.td}>
            {a.status}
          </td>

          <td style={styles.td}>
            {new Date(
              a.assigned_date
            ).toLocaleDateString()}
          </td>

          <td style={styles.td}>
            {a.status ===
              "Assigned" && (
              <button
                style={
                  styles.returnBtn
                }
                onClick={() =>
                  returnAsset(
                    a.id,
                    a.asset_id
                  )
                }
              >
                Return
              </button>
            )}
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
padding: 30,
background: "#f1f5f9",
minHeight: "100vh",
fontFamily: "Arial",
},

form: {
display: "grid",
gridTemplateColumns:
"repeat(auto-fit,minmax(220px,1fr))",
gap: 15,
background: "white",
padding: 20,
borderRadius: 14,
marginBottom: 30,
},

input: {
padding: 12,
borderRadius: 8,
border:
"1px solid #d1d5db",
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

table: {
width: "100%",
borderCollapse:
"collapse",
background: "white",
borderRadius: 14,
overflow: "hidden",
},

th: {
textAlign: "left",
padding: 14,
background: "#f8fafc",
},

td: {
padding: 14,
borderBottom:
"1px solid #e2e8f0",
},

returnBtn: {
padding:
"8px 12px",
background: "#16a34a",
color: "white",
border: "none",
borderRadius: 6,
cursor: "pointer",
},
};
