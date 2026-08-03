import ModulePageShell from "../../components/office/ModulePageShell";

export default function OfficeContractsPage() {
  return (
    <ModulePageShell
      title="Contracts"
      description="Store vendor and service contracts, renewal milestones, and obligation tracking in one place."
      highlights={["Contract Register", "Renewal Milestones", "Obligation Tracking"]}
      primaryAction={{ label: "Open Vendors", href: "/office/vendors" }}
      secondaryAction={{ label: "Open Reports", href: "/office/reports" }}
    />
  );
}
