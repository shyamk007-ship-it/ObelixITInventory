import ModulePageShell from "../../../components/office/ModulePageShell";

export default function OfficeAuditLogsPage() {
  return (
    <ModulePageShell
      title="Audit Logs"
      description="Review user actions, permission checks, and critical event trails for governance and security."
      highlights={["Access Events", "Change Tracking", "Compliance Filters"]}
      primaryAction={{ label: "Open Activity", href: "/office/activity" }}
      secondaryAction={{ label: "Open Users", href: "/office/users" }}
    />
  );
}
