import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import PatientRecordTable from "../components/tables/BasicTables/PatientRecordTable";

export default function PatientRecord() {
  return (
    <>
      <PageMeta
        title="Patient Record"
      />
      <PageBreadcrumb pageTitle="Patient Record" />
      <div className="space-y-6" >
        
        
          
      <ComponentCard title="Patient List" >
          <PatientRecordTable />
       </ComponentCard>
      </div>
    </>
  );
}
