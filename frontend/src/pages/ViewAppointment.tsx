import { useState } from "react";
import Button from "../components/ui/button/Button";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import ViewAppointmentTable from "../components/tables/BasicTables/ViewAppointmentTable";
import WalkInModal from "../components/ui/modal/WalkInModal";

export default function ViewAppointment() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <PageMeta title="Appointment List" />
      <PageBreadcrumb pageTitle="View Appointment" />

      <ComponentCard title="Appointment List">
          <ViewAppointmentTable />
        </ComponentCard>

       
    </>
  );
}
