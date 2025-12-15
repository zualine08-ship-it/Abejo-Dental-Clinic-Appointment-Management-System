import { useEffect, useState } from "react";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";

interface Appointment {
  id: number;
  patient: { id: number; name: string };
  procedure: { id: number; name: string };
  appointment_date: string;
  appointment_time: string;
  status: string;
}

export default function RescheduleAppointmentTable() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAppointments();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchAppointments, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/appointments", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        // Filter to show only rescheduled appointments
        const rescheduledAppointments = data.filter((a: Appointment) => a.status === "rescheduled");
        setAppointments(rescheduledAppointments);
      } else {
        setError("Failed to fetch appointments");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 text-red-600 dark:text-red-400">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Name
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Procedure
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Schedule
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Time
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Status
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          {appointments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="px-5 py-4 text-center text-gray-600 dark:text-gray-400">
                No rescheduled appointments
              </TableCell>
            </TableRow>
          ) : (
            appointments.map((appointment) => (
              <TableRow key={appointment.id} className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableCell className="px-5 py-4 text-gray-700 dark:text-gray-300">
                  {appointment.patient?.name || "N/A"}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700 dark:text-gray-300">
                  {appointment.procedure?.name || "N/A"}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700 dark:text-gray-300">
                  {appointment.appointment_date}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700 dark:text-gray-300">
                  {appointment.appointment_time}
                </TableCell>
                <TableCell className="px-5 py-4">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    Rescheduled
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </Table>
      </div>
    </div>
  );
}
