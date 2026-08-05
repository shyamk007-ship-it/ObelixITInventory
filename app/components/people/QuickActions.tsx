import Link from "next/link";
import type { CSSProperties } from "react";

interface QuickAction {
  label: string;
  href: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export default function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div style={styles.wrap}>
      {actions.map((action) => (
        <Link key={action.label} href={action.href} style={styles.action}>
          {action.label}
        </Link>
      ))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  action: {
    textDecoration: "none",
    borderRadius: 10,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontWeight: 700,
    fontSize: 13,
    padding: "8px 11px",
    transition: "transform 150ms ease, box-shadow 150ms ease",
  },
};
