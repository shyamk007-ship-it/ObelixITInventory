import type { CSSProperties } from "react";

interface SearchBarProps {
  placeholder?: string;
}

export default function SearchBar({ placeholder = "Search..." }: SearchBarProps) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      style={styles.input}
      aria-label="Search"
    />
  );
}

const styles: Record<string, CSSProperties> = {
  input: {
    width: "100%",
    maxWidth: 460,
    padding: 14,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 15,
    background: "white",
  },
};
