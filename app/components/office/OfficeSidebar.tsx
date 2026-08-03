"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

const sections = [
  {
    title: "Dashboard",
    links: [{ href: "/office/dashboard", label: "Executive Dashboard" }],
  },
  {
    title: "Asset Management",
    links: [
      { href: "/office/assets", label: "Assets" },
      { href: "/office/assets/assignments", label: "Assignments" },
      { href: "/office/assets/maintenance", label: "Maintenance" },
      { href: "/office/assets/warranty", label: "Warranty" },
      { href: "/office/assets/reports", label: "Asset Reports" },
    ],
  },
  {
    title: "People",
    links: [
      { href: "/office/employees", label: "Employees" },
      { href: "/office/users", label: "Users" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/office/tickets", label: "Tickets" },
      { href: "/office/reports", label: "Reports" },
      { href: "/office/activity", label: "Activity Logs" },
      { href: "/office/network", label: "Network Monitoring" },
    ],
  },
  {
    title: "Administration",
    links: [{ href: "/office/settings", label: "Settings" }],
  },
];

export default function OfficeSidebar() {
  const pathname = usePathname();

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brandCard}>
        <div>
          <p style={styles.eyebrow}>Office Workspace</p>
          <h2 style={styles.logo}>Enterprise IT Portal</h2>
          <p style={styles.description}>Office assets, support, employees, and administration in one workspace.</p>
        </div>
        <span style={styles.badge}>Office only</span>
      </div>

      <nav style={styles.nav} aria-label="Office navigation">
        {sections.map((section) => (
          <div key={section.title} style={styles.section}>
            <p style={styles.sectionTitle}>{section.title}</p>
            <div style={styles.sectionLinks}>
              {section.links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      ...styles.link,
                      ...(active ? styles.linkActive : {}),
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <Link href="/" style={styles.portalLink}>
        Company Portal
      </Link>
    </aside>
  );
}

const styles: Record<string, CSSProperties> = {
  sidebar: {
    width: 292,
    height: "100vh",
    position: "fixed",
    inset: "0 auto 0 0",
    background:
      "linear-gradient(180deg, #06111f 0%, #0b1f35 42%, #102a46 100%)",
    color: "white",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    overflow: "hidden",
    borderRight: "1px solid rgba(148, 163, 184, 0.18)",
    boxShadow: "16px 0 40px rgba(2, 8, 23, 0.18)",
  },
  brandCard: {
    borderRadius: 22,
    padding: 18,
    background: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.10)",
    backdropFilter: "blur(16px)",
    display: "grid",
    gap: 12,
  },
  eyebrow: {
    margin: 0,
    fontSize: 11,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#93c5fd",
    fontWeight: 800,
  },
  logo: {
    margin: "8px 0 0",
    color: "#ffffff",
    fontSize: 20,
    lineHeight: 1.15,
  },
  description: {
    margin: "8px 0 0",
    color: "#bfdbfe",
    fontSize: 13,
    lineHeight: 1.6,
  },
  badge: {
    display: "inline-flex",
    width: "fit-content",
    padding: "6px 12px",
    borderRadius: 999,
    background: "rgba(37, 99, 235, 0.25)",
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid rgba(96, 165, 250, 0.25)",
  },
  nav: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    paddingRight: 4,
    display: "grid",
    gap: 14,
    scrollbarWidth: "thin",
    scrollbarColor: "#475569 transparent",
  },
  section: {
    display: "grid",
    gap: 8,
  },
  sectionTitle: {
    margin: 0,
    color: "#94a3b8",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    fontWeight: 800,
  },
  sectionLinks: {
    display: "grid",
    gap: 8,
  },
  portalLink: {
    flexShrink: 0,
    color: "#dbeafe",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 800,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(148, 163, 184, 0.18)",
    background: "rgba(255, 255, 255, 0.04)",
  },
  link: {
    color: "#e2e8f0",
    textDecoration: "none",
    padding: "12px 14px",
    borderRadius: 14,
    background: "rgba(15, 23, 42, 0.36)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    fontSize: 14,
    fontWeight: 700,
    transition: "transform 160ms ease, background 160ms ease, border-color 160ms ease",
  },
  linkActive: {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    borderColor: "rgba(96, 165, 250, 0.45)",
    color: "white",
    boxShadow: "0 14px 28px rgba(37, 99, 235, 0.28)",
  },
};
