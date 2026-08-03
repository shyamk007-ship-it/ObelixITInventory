import ModulePageShell from "../../../components/office/ModulePageShell";

export default function OfficeInventorySparePartsPage() {
  return (
    <ModulePageShell
      title="Spare Parts"
      description="Manage critical spare components, warranty tie-ins, and replacement readiness for key systems."
      highlights={["Critical Part List", "Shelf Availability", "Replacement Readiness"]}
      primaryAction={{ label: "Open Maintenance", href: "/office/maintenance" }}
      secondaryAction={{ label: "Open Stock", href: "/office/inventory/stock" }}
    />
  );
}
