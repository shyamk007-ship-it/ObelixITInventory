"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { getUserProfile, isEmployee } from "../lib/rbac";

interface AssignedAsset {
  id: number;
  asset_id: number;
  assigned_date: string;
  returned_date?: string | null;
  status: string;
  notes?: string;
  assets?: { asset_name: string; asset_tag?: string; serial_number?: string };
}

export default function EmployeePage() {
  const [profile, setProfile] = useState<any>(null);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [assignedAssets, setAssignedAssets] = useState<AssignedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initialize = async () => {
      const currentProfile = await getUserProfile();

      if (!currentProfile) {
        router.push("/login");
        return;
      }

      if (!isEmployee(currentProfile.role)) {
        router.push("/dashboard");
        return;
      }

      const { data: employee, error } = await supabase
        .from("employees")
        .select("id, full_name, email, department, position")
        .eq("email", currentProfile.email)
        .single();

      if (error || !employee) {
        setProfile({
          ...currentProfile,
          email: currentProfile.email,
          full_name: currentProfile.full_name,
          missingEmployee: true,
        });
        setLoading(false);
        return;
      }

      setProfile({
        ...currentProfile,
        full_name: employee.full_name,
        department: employee.department,
        position: employee.position,
      });
      setEmployeeId(employee.id);

      await loadAssignedAssets(employee.id);
      setLoading(false);
    };

    initialize();
  }, [router]);

  const loadAssignedAssets = async (employeeId: number) => {
    const { data } = await supabase
      .from("asset_assignments")
      .select("id,assigned_date,returned_date,status,notes,assets(asset_name,asset_tag,serial_number)")
      .eq("employee_id", employeeId)
      .order("assigned_date", { ascending: false });

    setAssignedAssets(data || []);
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (profile?.missingEmployee) {
    return (
      <>
        <Sidebar />
        <div style={styles.container}>
          <TopBar />
          <div style={styles.errorCard}>
            <h1 style={styles.title}>Employee Record Not Found</h1>
            <p style={styles.subtitle}>
              We could not locate your employee profile. Please contact an administrator to link your account.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div style={styles.container}>
        <TopBar />

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>My Assignments</h1>
            <p style={styles.subtitle}>
              View assets assigned to you and check return status.
            </p>
          </div>
        </div>

        <div style={styles.profileCard}>
          <h2 style={styles.sectionTitle}>My Profile</h2>
          <p>
            <strong>Name:</strong> {profile.full_name}
          </p>
          <p>
            <strong>Email:</strong> {profile.email}
          </p>
          <p>
            <strong>Role:</strong> {profile.role === "employee" ? "Employee" : profile.role}
          </p>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Asset</th>
                <th style={styles.th}>Assigned Date</th>
                <th style={styles.th}>Returned Date</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {assignedAssets.length === 0 ? (
                <tr>
                  <td style={styles.emptyTd} colSpan={5}>
                    No assigned assets found.
                  </td>
                </tr>
              ) : (
                assignedAssets.map((assignment) => (
                  <tr key={assignment.id}>
                    <td style={styles.td}>
                      {assignment.assets?.asset_name || "Unknown Asset"}
                    </td>
                    <td style={styles.td}>{formatDate(assignment.assigned_date)}</td>
                    <td style={styles.td}>{formatDate(assignment.returned_date)}</td>
                    <td style={styles.td}>{assignment.status}</td>
                    <td style={styles.td}>{assignment.notes || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const formatDate = (date?: string | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
};

const styles: any = {
  container: {
    marginLeft: 260,
    padding: 30,
    minHeight: "100vh",
    background: "#f1f5f9",
    fontFamily: "Arial, sans-serif",
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#f8fafc",
    color: "#0f172a",
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
  profileCard: {
    background: "white",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    marginBottom: 24,
  },
  errorCard: {
    background: "white",
    borderRadius: 18,
    padding: 32,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    marginTop: 24,
  },
  sectionTitle: {
    margin: "0 0 16px",
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 720,
    background: "white",
    borderRadius: 18,
    overflow: "hidden",
  },
  th: {
    padding: 16,
    textAlign: "left",
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
};
