import ModulePageShell from "../../components/office/ModulePageShell";

export default function OfficeCompanyProfilePage() {
  return (
    <ModulePageShell
      title="Company Profile"
      description="Maintain company metadata, workspace standards, and operational defaults for Office operations."
      highlights={["Organization Identity", "Operational Defaults", "Compliance Settings"]}
      primaryAction={{ label: "Open Settings", href: "/office/settings" }}
      secondaryAction={{ label: "Open Dashboard", href: "/office/dashboard" }}
    />
  );
}
