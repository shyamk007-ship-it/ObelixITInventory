import type { CSSProperties } from "react";
import { InventoryModuleNav } from "../../components/inventory";

export default function OfficeInventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={styles.wrap}>
      <InventoryModuleNav />
      <section style={styles.content}>{children}</section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: "grid",
    gap: 12,
  },
  content: {
    minHeight: 0,
  },
};

