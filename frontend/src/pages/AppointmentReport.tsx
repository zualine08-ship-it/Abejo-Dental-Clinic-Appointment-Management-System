import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import AppointmentReportTable from "../components/tables/BasicTables/AppointmentReportTable";

export default function AppointmentReport() {
  return (
    <>
      <PageMeta
        title=" "
        
      />
      <PageBreadcrumb pageTitle="Appointment Report" />
      <div className="space-y-6" >
        
        
          
      <ComponentCard title="">
          <AppointmentReportTable />
       </ComponentCard>
      </div>
    </>
  );
}
