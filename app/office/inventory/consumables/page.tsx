import ModulePageShell from "../../../components/office/ModulePageShell";

export default function OfficeInventoryConsumablesPage() {
  return (
    <ModulePageShell
      title="Consumables"
      description="Track expendable items, usage velocity, and replenishment cycles across office departments."
      highlights={["Usage Patterns", "Refill Plans", "Department Demand"]}
      primaryAction={{ label: "Open Stock", href: "/office/inventory/stock" }}
      secondaryAction={{ label: "Open Dashboard", href: "/office/dashboard" }}
    />
  );
}
