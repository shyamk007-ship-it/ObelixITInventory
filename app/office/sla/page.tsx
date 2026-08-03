import ModulePageShell from "../../components/office/ModulePageShell";

export default function OfficeSlaPage() {
  return (
    <ModulePageShell
      title="SLA Management"
      description="Track service level targets, breach risk, and response commitments for support operations."
      highlights={["Response Targets", "Breach Alerts", "Team Performance"]}
      primaryAction={{ label: "Open Tickets", href: "/office/tickets" }}
      secondaryAction={{ label: "View Analytics", href: "/office/analytics/tickets" }}
    />
  );
}
