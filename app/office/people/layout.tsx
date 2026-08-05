import type { CSSProperties } from "react";
import PeopleModuleNav from "../../components/people/PeopleModuleNav";

export default function OfficePeopleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={styles.wrap}>
      <PeopleModuleNav />
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
