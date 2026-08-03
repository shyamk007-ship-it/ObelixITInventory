import ModulePageShell from "../../components/office/ModulePageShell";

export default function OfficeVisitorsPage() {
  return (
    <ModulePageShell
      title="Visitors"
      description="Manage visitor pre-registrations, access windows, and facility escort records for compliance."
      highlights={["Pre-Registration", "Badge Issuance", "Visit History"]}
      primaryAction={{ label: "View Activity", href: "/office/activity" }}
      secondaryAction={{ label: "Open Dashboard", href: "/office/dashboard" }}
    />
  );
}
