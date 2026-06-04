"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    const loggedIn = localStorage.getItem("loggedIn");
    if (!loggedIn) router.push("/login");
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>IT Inventory Dashboard</h1>

      <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
        <div style={card}>📦 Total Assets: 120</div>
        <div style={card}>🟢 Available: 80</div>
        <div style={card}>🔴 Assigned: 40</div>
      </div>
    </div>
  );
}

const card = {
  padding: 20,
  borderRadius: 10,
  background: "#f1f5f9",
  flex: 1,
};