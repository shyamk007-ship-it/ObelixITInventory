import Link from "next/link";
import type { CSSProperties } from "react";

interface EmployeeCardProps {
  id: number;
  name: string;
  department: string;
  designation: string;
  status: string;
  email?: string;
}

export default function EmployeeCard({ id, name, department, designation, status, email }: EmployeeCardProps) {
  return (
    <article style={styles.card}>
      <div style={styles.top}>
        <h3 style={styles.name}>{name}</h3>
        <span style={{ ...styles.badge, ...(status.toLowerCase().includes("active") ? styles.ok : styles.warn) }}>{status}</span>
      </div>
      <p style={styles.meta}>{designation || "Designation Not Set"}</p>
      <p style={styles.meta}>{department || "Unassigned Department"}</p>
      <p style={styles.meta}>{email || "No email"}</p>
      <Link href={`/office/people/employees/${id}`} style={styles.link}>Open Profile</Link>
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    background: "white",
    padding: 12,
    display: "grid",
    gap: 6,
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  name: {
    margin: 0,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 800,
  },
  badge: {
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 700,
  },
  ok: {
    background: "#dcfce7",
    color: "#166534",
  },
  warn: {
    background: "#fef3c7",
    color: "#92400e",
  },
  meta: {
    margin: 0,
    color: "#64748b",
    fontSize: 13,
  },
  link: {
    marginTop: 6,
    textDecoration: "none",
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: 700,
  },
};
