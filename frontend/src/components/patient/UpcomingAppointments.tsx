import { useState } from "react";
import { useNavigate } from "react-router";
import axios from "../../config/axios";
import Swal from "sweetalert2";

interface Appointment {
  id: number;
  doctor: string;
  procedure: string;
  date: string;
  time: string;
  status: string;
  notes: string;
  location: string;
}

interface UpcomingAppointmentsProps {
  appointments: Appointment[];
}

export default function UpcomingAppointments({ appointments }: UpcomingAppointmentsProps) {
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [canceledAppointments, setCanceledAppointments] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const navigate = useNavigate();

  const handleCancelAppointment = async (appointmentId: number) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      setCancelingId(appointmentId);
      await axios.patch(`/api/patient/appointments/${appointmentId}/cancel`);
      setCanceledAppointments(new Set([...canceledAppointments, appointmentId]));
    } catch (error) {
      console.error("Error canceling appointment:", error);
      alert("Failed to cancel appointment. Please try again.");
    } finally {
      setCancelingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
      confirmed: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
      completed: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
      cancelled: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Only show pending appointments in upcoming (not completed, not cancelled)
  const upcomingList = appointments.filter(apt => 
    !canceledAppointments.has(apt.id) && 
    apt.status === 'pending'
  );
  
  // Pagination logic
  const totalPages = Math.ceil(upcomingList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = upcomingList.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handleViewDetails = (appointment: Appointment) => {
    Swal.fire({
      title: appointment.procedure,
      html: `
        <div class="text-left space-y-3">
          <div class="text-sm">
            <p class="text-gray-600 dark:text-gray-400 text-xs font-medium">STATUS</p>
            <p class="text-gray-900 dark:text-white font-medium capitalize">${appointment.status}</p>
          </div>
          <div class="text-sm">
            <p class="text-gray-600 dark:text-gray-400 text-xs font-medium">DATE & TIME</p>
            <p class="text-gray-900 dark:text-white font-medium">${new Date(appointment.date).toLocaleDateString()} at ${appointment.time}</p>
          </div>
          ${appointment.notes ? `
          <div class="text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
            <p class="text-gray-600 dark:text-gray-400 text-xs font-medium">NOTES</p>
            <p class="text-gray-900 dark:text-white font-medium">${appointment.notes}</p>
          </div>
          ` : ''}
        </div>
      `,
      icon: "info",
      confirmButtonText: "Close",
      confirmButtonColor: "#3B82F6",
      customClass: {
        container: 'dark-swal',
      },
      didOpen: (modal) => {
        modal.style.zIndex = '50';
        const backdrop = document.querySelector('.swal2-container');
        if (backdrop) (backdrop as HTMLElement).style.zIndex = '49';
      },
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
        Upcoming Appointments
      </h3>

      {upcomingList.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No upcoming appointments</p>
          <button 
            onClick={() => navigate('/patient-dashboard/book-appointment')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
            Book Appointment
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {appointment.procedure}
                      </h4>
                      {getStatusBadge(appointment.status)}
                    </div>
                  </div>
                </div>

                <div className="text-sm">
                  <p className="text-gray-600 dark:text-gray-400">Date & Time</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
