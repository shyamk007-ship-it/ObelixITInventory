import Link from "next/link";
import type { CSSProperties } from "react";

interface Action {
  label: string;
  href: string;
}

interface InventoryQuickActionsProps {
  actions: Action[];
}

export default function InventoryQuickActions({ actions }: InventoryQuickActionsProps) {
  return (
    <div style={styles.actions}>
      {actions.map((action) => (
        <Link key={action.href + action.label} href={action.href} style={styles.action}>
          {action.label}
        </Link>
      ))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  action: {
    textDecoration: "none",
    color: "white",
    borderRadius: 10,
    padding: "8px 10px",
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    border: "1px solid #1d4ed8",
    fontSize: 12,
    fontWeight: 800,
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.2)",
  },
};
