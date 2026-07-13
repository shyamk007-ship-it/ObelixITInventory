import OfficeMaintenancePage from "../../maintenance/page";
import OfficeAssetModuleNav from "../../../components/office/OfficeAssetModuleNav";

export default function OfficeAssetMaintenancePage() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <OfficeAssetModuleNav />
      <OfficeMaintenancePage />
    </div>
  );
}
