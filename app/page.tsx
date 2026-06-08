"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";
import { getUserProfile, isEmployee } from "./lib/rbac";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const profile = await getUserProfile();

      if (!profile) {
        router.push("/login");
        return;
      }

      router.push(isEmployee(profile.role) ? "/employee" : "/dashboard");
    };

    init();
  }, [router]);

  return (
    <div style={styles.container}>
      <p style={styles.message}>Redirecting to your workspace...</p>
    </div>
  );
}

const styles: any = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f8fafc",
    fontFamily: "Arial, sans-serif",
  },
  message: {
    color: "#0f172a",
    fontSize: 16,
  },
};
