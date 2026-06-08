"use client";

import ProfileMenu from "./ProfileMenu";

export default function TopBar() {
  return (
    <div style={styles.topbar}>
      <input
        type="text"
        placeholder="Search..."
        style={styles.search}
      />

      <ProfileMenu />
    </div>
  );
}

const styles: any = {
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },

  search: {
    width: 300,
    padding: 14,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 16,
  },
};