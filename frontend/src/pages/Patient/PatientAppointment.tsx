import PageMeta from "../../components/common/PageMeta";
import PatientAppointmentTable from "../../components/tables/Patient/PatientAppointmentTable";

export default function PatientAppointment() {
  return (
    <>
      <PageMeta title="View Appointment"  />
      <div className="p-4 lg:p-6">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Appointments
          </h1>
          <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
            View and manage all your scheduled appointments
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <PatientAppointmentTable />
        </div>
      </div>
    </>
  );
}
