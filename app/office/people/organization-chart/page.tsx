"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import { fetchDepartments, fetchEmployees, safeErrorMessage } from "../../../lib/people";
import { PeopleHeader } from "../../../components/people";

interface TreeNode {
  key: string;
  label: string;
  role: string;
  children: TreeNode[];
}

function renderNode(node: TreeNode): ReactElement {
  return (
    <li key={node.key} style={styles.nodeItem}>
      <div style={styles.nodeCard}>
        <strong style={styles.nodeLabel}>{node.label}</strong>
        <span style={styles.nodeRole}>{node.role}</span>
      </div>
      {node.children.length ? <ul style={styles.nodeChildren}>{node.children.map((child) => renderNode(child))}</ul> : null}
    </li>
  );
}

export default function PeopleOrganizationChartPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [departments, employees] = await Promise.all([fetchDepartments(), fetchEmployees()]);

        const deptNodes: TreeNode[] = departments.map((department) => {
          const members = employees.filter((employee) => String(employee.department || "") === department.name);
          const manager = department.manager_employee_id
            ? members.find((member) => member.id === department.manager_employee_id) || employees.find((member) => member.id === department.manager_employee_id)
            : null;

          const memberNodes: TreeNode[] = members.map((member) => ({
            key: `employee-${member.id}`,
            label: member.full_name || `Employee #${member.id}`,
            role: member.designation || "Employee",
            children: [],
          }));

          return {
            key: `department-${department.id}`,
            label: department.name,
            role: manager ? `Manager: ${manager.full_name || `Employee #${manager.id}`}` : "Manager Not Assigned",
            children: memberNodes,
          };
        });

        setTree({
          key: "ceo",
          label: "CEO",
          role: "Enterprise Leadership",
          children: [
            {
              key: "operations",
              label: "Operations",
              role: "Office Operations",
              children: deptNodes,
            },
          ],
        });
      } catch (loadError) {
        setError(safeErrorMessage(loadError, "Unable to load organization hierarchy."));
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  return (
    <section style={styles.page}>
      <PeopleHeader title="Organization Chart" subtitle="Interactive hierarchy from leadership to department-level managers and employees." />

      {loading ? <div style={styles.skeleton} /> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
      {!loading && !error && !tree ? <div style={styles.empty}>No hierarchy data available.</div> : null}

      {!loading && !error && tree ? (
        <div style={styles.treeWrap}>
          <ul style={styles.treeRoot}>{renderNode(tree)}</ul>
        </div>
      ) : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 12 },
  treeWrap: {
    borderRadius: 14,
    border: "1px solid #dbeafe",
    background: "#ffffff",
    padding: 12,
    overflowX: "auto",
  },
  treeRoot: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gap: 10,
    minWidth: 880,
  },
  nodeItem: {
    listStyle: "none",
    display: "grid",
    gap: 8,
  },
  nodeCard: {
    borderRadius: 12,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    padding: "8px 10px",
    display: "grid",
    gap: 4,
    width: "fit-content",
    minWidth: 240,
  },
  nodeLabel: {
    color: "#0f172a",
    fontSize: 13,
  },
  nodeRole: {
    color: "#1e40af",
    fontSize: 12,
    fontWeight: 700,
  },
  nodeChildren: {
    margin: 0,
    paddingLeft: 22,
    display: "grid",
    gap: 8,
  },
  skeleton: {
    borderRadius: 14,
    height: 260,
    background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)",
    backgroundSize: "200% 100%",
    animation: "pulse 1.4s ease-in-out infinite",
  },
  error: { borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", padding: 12, fontWeight: 700 },
  empty: { borderRadius: 12, border: "1px dashed #cbd5e1", padding: 14, color: "#64748b", fontWeight: 600, background: "#ffffff" },
};
