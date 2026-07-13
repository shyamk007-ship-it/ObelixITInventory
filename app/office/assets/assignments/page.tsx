import OfficeAssignmentsPage from "../../assignments/page";
import OfficeAssetModuleNav from "../../../components/office/OfficeAssetModuleNav";

export default function OfficeAssetAssignmentsPage() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <OfficeAssetModuleNav />
      <OfficeAssignmentsPage />
    </div>
  );
}
