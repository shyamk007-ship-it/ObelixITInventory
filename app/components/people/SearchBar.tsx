"use client";

import type { CSSProperties } from "react";
import { Search } from "lucide-react";

interface PeopleSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function PeopleSearchBar({ value, onChange, placeholder = "Search..." }: PeopleSearchBarProps) {
  return (
    <label style={styles.wrap}>
      <Search size={16} style={styles.icon} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={styles.input}
      />
    </label>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#ffffff",
    padding: "10px 12px",
    minWidth: 240,
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.05)",
  },
  icon: {
    color: "#64748b",
  },
  input: {
    border: "none",
    outline: "none",
    width: "100%",
    fontSize: 14,
    color: "#0f172a",
    background: "transparent",
  },
};
