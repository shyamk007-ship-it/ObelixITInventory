import ModulePageShell from "../../../components/office/ModulePageShell";

export default function OfficeReportsExportPage() {
  return (
    <ModulePageShell
      title="Export Center"
      description="Generate and distribute office analytics and operational reports in Excel, CSV, and PDF formats."
      highlights={["Scheduled Exports", "Format Selection", "Distribution Lists"]}
      primaryAction={{ label: "Open Analytics", href: "/office/analytics" }}
      secondaryAction={{ label: "Open Reports", href: "/office/reports" }}
    />
  );
}
