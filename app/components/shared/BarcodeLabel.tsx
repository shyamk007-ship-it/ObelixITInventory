import type { CSSProperties } from "react";

interface BarcodeLabelProps {
  value: string;
}

export default function BarcodeLabel({ value }: BarcodeLabelProps) {
  const bars = value
    .split("")
    .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("")
    .slice(0, 96)
    .split("");

  return (
    <div style={styles.wrap}>
      <div style={styles.bars} aria-label={`Barcode ${value}`}>
        {bars.map((bit, index) => (
          <span
            key={`${value}-${index}`}
            style={{ ...styles.bar, ...(bit === "1" ? styles.barDark : styles.barLight) }}
          />
        ))}
      </div>
      <p style={styles.text}>{value}</p>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: { display: "grid", gap: 4 },
  bars: {
    display: "grid",
    gridTemplateColumns: "repeat(96, 1fr)",
    border: "1px solid #cbd5e1",
    background: "white",
    minHeight: 36,
    alignItems: "stretch",
    overflow: "hidden",
  },
  bar: { display: "block", height: "100%" },
  barDark: { background: "#0f172a" },
  barLight: { background: "white" },
  text: { margin: 0, color: "#334155", fontSize: 11, letterSpacing: "0.08em", fontWeight: 700 },
};
