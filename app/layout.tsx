"use client";

import { usePathname, useRouter } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();

  const isLoginPage = path === "/login";

  const menu = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Assets", path: "/assets" },
    { name: "Add Asset", path: "/add-asset" },
    { name: "Users", path: "/users" },
    { name: "Settings", path: "/settings" },
  ];

  return (
    <html lang="en">
      <body style={styles.body}>
        {isLoginPage ? (
          children
        ) : (
          <div style={styles.container}>
            {/* SIDEBAR */}
            <div style={styles.sidebar}>
              <h2 style={styles.logo}>IT Inventory</h2>

              {menu.map((item) => (
                <div
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  style={{
                    ...styles.menuItem,
                    background:
                      path === item.path ? "#2563eb" : "transparent",
                    color: path === item.path ? "white" : "#cbd5e1",
                  }}
                >
                  {item.name}
                </div>
              ))}

              <button
                onClick={() => {
                  localStorage.removeItem("loggedIn");
                  router.push("/login");
                }}
                style={styles.logout}
              >
                Logout
              </button>
            </div>

            {/* MAIN */}
            <div style={styles.main}>{children}</div>
          </div>
        )}
      </body>
    </html>
  );
}

const styles: any = {
  body: {
    margin: 0,
    fontFamily: "Arial",
    background: "#0f172a",
    color: "white",
  },
  container: {
    display: "flex",
    height: "100vh",
  },
  sidebar: {
    width: 250,
    background: "#111827",
    padding: 20,
  },
  logo: {
    marginBottom: 30,
    color: "#38bdf8",
  },
  menuItem: {
    padding: 12,
    borderRadius: 6,
    cursor: "pointer",
    marginBottom: 8,
  },
  main: {
    flex: 1,
    padding: 20,
    overflow: "auto",
  },
  logout: {
    marginTop: 20,
    padding: 10,
    width: "100%",
    background: "red",
    color: "white",
    border: "none",
    cursor: "pointer",
  },
};