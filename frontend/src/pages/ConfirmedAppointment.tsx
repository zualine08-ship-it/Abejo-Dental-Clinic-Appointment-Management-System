import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import PendingAppointmentTable from "../components/tables/BasicTables/PendingAppointmentTable";

export default function ConfirmedAppointment() {
  return (
    <>
      <PageMeta
        title="Confirmed Appointment"
      />
      <PageBreadcrumb pageTitle="Confirmed Appointment" />
      <div className="space-y-6" >
        
        
          
      <ComponentCard title="Confirmed List" >
          <PendingAppointmentTable />
       </ComponentCard>
      </div>
    </>
  );
}
