import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import PatientReportTable from "../components/tables/BasicTables/PatientReportTable";

export default function PatientReport() {
  return (
    <>
      <PageMeta
        title=""
        
      />
      <PageBreadcrumb pageTitle="Patient Report" />
      <div className="space-y-6" >
        
        
          
      <ComponentCard title="" >
          <PatientReportTable />
       </ComponentCard>
      </div>
    </>
  );
}
