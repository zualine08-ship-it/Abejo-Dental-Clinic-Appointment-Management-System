import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import PatientHistoryTable from "../components/tables/BasicTables/PatientHistoryTable";

export default function PatientHistory() {
  return (
    <>
      <PageMeta
        title="React.js Basic Tables Dashboard | TailAdmin - Next.js Admin Dashboard Template"
       
      />
      <PageBreadcrumb pageTitle="Patient History" />
      <div className="space-y-6" >
        
        
          
      <ComponentCard title="Patient List" >
          <PatientHistoryTable />
       </ComponentCard>
      </div>
    </>
  );
}
