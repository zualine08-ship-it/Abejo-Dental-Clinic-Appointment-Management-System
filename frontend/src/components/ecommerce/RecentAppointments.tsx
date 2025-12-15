import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import Spinner from "../ui/spinner/Spinner";

interface Appointment {
  id: number;
  patient: { id: number; name: string };
  procedure: { id: number; name: string };
  appointment_date: string;
  appointment_time: string;
  status: string;
}

export default function RecentAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/appointments", {
        credentials: "include",
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        // Sort by date descending
        const sorted = data.sort(
          (a: Appointment, b: Appointment) =>
            new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
        );
        setAllAppointments(sorted);
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(allAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAppointments = allAppointments.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "success";
      case "completed":
        return "info";
      case "rescheduled":
        return "warning";
      case "cancelled":
        return "error";
      default:
        return "info";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent Appointments
          </h3>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Patient
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Procedure
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Date
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Time
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Status
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedAppointments.length > 0 ? (
              paginatedAppointments.map((appointment) => (
                <TableRow key={appointment.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <TableCell className="py-3 text-start text-theme-xs text-gray-900 dark:text-gray-300">
                    <span className="font-medium">{appointment.patient?.name || "N/A"}</span>
                  </TableCell>
                  <TableCell className="py-3 text-start text-theme-xs text-gray-700 dark:text-gray-400">
                    {appointment.procedure?.name || "N/A"}
                  </TableCell>
                  <TableCell className="py-3 text-start text-theme-xs text-gray-700 dark:text-gray-400">
                    {formatDate(appointment.appointment_date)}
                  </TableCell>
                  <TableCell className="py-3 text-start text-theme-xs text-gray-700 dark:text-gray-400">
                    {appointment.appointment_time}
                  </TableCell>
                  <TableCell className="py-3 text-start text-theme-xs">
                    <Badge color={getStatusColor(appointment.status) as any}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-gray-500">
                  No recent appointments
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {currentPage}/{totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
