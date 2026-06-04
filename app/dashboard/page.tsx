"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div
      style={{
        padding: 40,
        fontFamily: "Arial",
      }}
    >
      <h1>Dashboard ✅</h1>

      <p>Welcome to Obelix IT System</p>

      <button
        onClick={handleLogout}
        style={{
          padding: 10,
          background: "red",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
}