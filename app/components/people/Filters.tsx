"use client";

import type { CSSProperties } from "react";

interface FilterOption {
  value: string;
  label: string;
}

interface PeopleFiltersProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function PeopleFilters({ options, value, onChange, label = "Filter" }: PeopleFiltersProps) {
  return (
    <label style={styles.wrap}>
      <span style={styles.label}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} style={styles.select}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: "grid",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
  },
  select: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "8px 10px",
    minWidth: 160,
    fontSize: 13,
    color: "#0f172a",
    background: "#ffffff",
  },
};
