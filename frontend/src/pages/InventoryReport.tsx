import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import InventoryReportTable from "../components/tables/BasicTables/InventoryReportTable";

export default function InventoryReport() {
  return (
    <>
      <PageMeta
        title="Inventory Report"
      />
      <PageBreadcrumb pageTitle="Inventory Report" />
      <div className="space-y-6" >
        
        
          
      <ComponentCard title="" >
          <InventoryReportTable />
       </ComponentCard>
      </div>
    </>
  );
}
