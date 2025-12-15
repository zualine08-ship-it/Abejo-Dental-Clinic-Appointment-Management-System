import { useEffect, useState } from "react";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import Spinner from "../../ui/spinner/Spinner";
import { useAuth } from "../../../config/AuthContext";
import { showToast } from "../../../hooks/useToast";
import CancellationReasonModal from "../../modals/CancellationReasonModal";
import Swal from "sweetalert2";

interface Appointment {
  id: number;
  procedure?: string;
  price?: number;
  date?: string;
  time?: string;
  status?: string;
  appointment_date?: string;
  appointment_time?: string;
}

export default function PatientAppointmentTable() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  
  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");

  useEffect(() => {
    if (user?.id) {
      fetchAppointments();
    }
  }, [user?.id]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/patient/appointments", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
      } else if (Array.isArray(data)) {
        setAppointments(data);
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

  const handleCancel = async (id: number, reason: string) => {
    try {
      const response = await fetch(`/api/patient/appointments/${id}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ cancellation_reason: reason }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAppointments(
          appointments.map((a) =>
            a.id === id ? { ...a, status: "cancelled" } : a
          )
        );
        
        Swal.fire({
          icon: "success",
          title: "Appointment Cancelled",
          text: "Your appointment has been cancelled successfully",
          confirmButtonColor: "#3B82F6",
          customClass: {
            popup: "dark:bg-gray-900 dark:text-white",
            title: "dark:text-white",
            htmlContainer: "dark:text-gray-300",
          },
          didOpen: (modal) => {
            modal.style.zIndex = "51";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "50";
          },
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Cancellation Failed",
          text: data.message || "Failed to cancel appointment",
          confirmButtonColor: "#EF4444",
          customClass: {
            popup: "dark:bg-gray-900 dark:text-white",
            title: "dark:text-white",
            htmlContainer: "dark:text-gray-300",
          },
          didOpen: (modal) => {
            modal.style.zIndex = "51";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "50";
          },
        });
      }
    } catch (err) {
      console.error("Cancel error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to cancel appointment",
        confirmButtonColor: "#EF4444",
        customClass: {
          popup: "dark:bg-gray-900 dark:text-white",
          title: "dark:text-white",
          htmlContainer: "dark:text-gray-300",
        },
        didOpen: (modal) => {
          modal.style.zIndex = "51";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "50";
        },
      });
    }
  };

  const openCancellationModal = (appointmentId: number) => {
    setSelectedAppointmentId(appointmentId);
    setIsModalOpen(true);
  };

  const closeCancellationModal = () => {
    setIsModalOpen(false);
    setSelectedAppointmentId(null);
  };

  const handleCancellationConfirm = async (appointmentId: number, reason: string) => {
    await handleCancel(appointmentId, reason);
  };

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="p-5 text-red-600 dark:text-red-400">
        Error: {error}
      </div>
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(appointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // Filter out cancelled, completed, and rescheduled appointments (they appear in history)
  let activeAppointments = appointments.filter(
    (apt) => apt.status !== "cancelled" && apt.status !== "completed" && apt.status !== "rescheduled"
  );
  
  // Apply search filter
  if (searchTerm) {
    activeAppointments = activeAppointments.filter((apt) =>
      (apt.procedure || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  // Apply status filter
  if (statusFilter !== "all") {
    activeAppointments = activeAppointments.filter((apt) => apt.status === statusFilter);
  }
  
  // Apply sorting
  activeAppointments = [...activeAppointments].sort((a, b) => {
    const dateA = new Date(a.appointment_date || a.date || 0);
    const dateB = new Date(b.appointment_date || b.date || 0);
    
    if (sortBy === "date-asc") {
      return dateA.getTime() - dateB.getTime();
    } else if (sortBy === "date-desc") {
      return dateB.getTime() - dateA.getTime();
    } else if (sortBy === "procedure") {
      return (a.procedure || "").localeCompare(b.procedure || "");
    }
    return 0;
  });
  
  const filteredTotalPages = Math.ceil(activeAppointments.length / itemsPerPage);
  const paginatedAppointments = activeAppointments.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(filteredTotalPages, prev + 1));
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        {/* FILTER SECTION */}
        <div className="border-b border-gray-200 dark:border-gray-800 p-4 lg:p-6 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
            {/* Search */}
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by procedure..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            
            {/* Sort By */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="procedure">Procedure (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-b border-black-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium border bg-sky-100 text-sky-700 border-gray-200 text-center text-theme-xs dark:bg-sky-900 dark:text-sky-300"
              >
                Procedure
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium border bg-sky-100 text-sky-700 border-gray-200 text-center text-theme-xs dark:bg-sky-900 dark:text-sky-300"
              >
                Schedule
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium border bg-sky-100 text-sky-700 border-gray-200 text-center text-theme-xs dark:bg-sky-900 dark:text-sky-300"
              >
                Time
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium border bg-sky-100 text-sky-700 border-gray-200 text-center text-theme-xs dark:bg-sky-900 dark:text-sky-300"
              >
                Price
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium border bg-sky-100 text-sky-700 border-gray-200 text-center text-theme-xs dark:bg-sky-900 dark:text-sky-300"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium border bg-sky-100 text-sky-700 border-gray-200 text-center text-theme-xs dark:bg-sky-900 dark:text-sky-300"
              >
                Action
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          {paginatedAppointments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="px-5 py-8 text-center border border-gray-200 dark:border-white/[0.05]">
                <div className="flex flex-col items-center justify-center gap-2">
                  <svg className="w-12 h-12 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">No upcoming appointments</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">View completed or cancelled appointments in Appointment History</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            paginatedAppointments.map((appointment) => (
              <TableRow key={appointment.id} className="border-b border-gray-100 border border-gray-200dark:border-white/[0.05]">
                <TableCell className="px-5 py-4 text-gray-700 dark:text-gray-300">
                  {appointment.procedure || "N/A"}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700 border text-center border-gray-200 dark:text-gray-300">
                  {appointment.date || appointment.appointment_date || "N/A"}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700 border text-center border-gray-200 dark:text-gray-300">
                  {appointment.time || appointment.appointment_time || "N/A"}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700 border text-center border-gray-200 dark:text-gray-300">
                  {appointment.price || "N/A"}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700 border text-center border-gray-200 dark:text-gray-300">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    appointment.status === "completed"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : appointment.status === "pending"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : appointment.status === "approved"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : appointment.status === "rescheduled"
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      : appointment.status === "cancelled"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                  }`}>
                    {appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) : "unknown"}
                  </span>
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700 border text-center border-gray-200 dark:text-gray-300">
                  {appointment.status !== "completed" && appointment.status !== "cancelled" ? (
                    <button
                      onClick={() => openCancellationModal(appointment.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-all duration-200"
                    >
                      Cancel
                    </button>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600 text-sm">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </Table>
      </div>

      {/* PAGINATION CONTROLS - NEW DESIGN */}
      {filteredTotalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 lg:p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Displaying <span className="font-semibold text-gray-900 dark:text-white">{Math.min(itemsPerPage, activeAppointments.length - startIndex)}</span> out of <span className="font-semibold text-gray-900 dark:text-white">{activeAppointments.length}</span> appointments
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{startIndex + 1}</span> - <span className="font-semibold text-gray-900 dark:text-white">{Math.min(endIndex, activeAppointments.length)}</span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {/* Page numbers - show up to 5 pages */}
              {Array.from({ length: Math.min(5, filteredTotalPages) }, (_, i) => {
                let pageNum;
                if (filteredTotalPages <= 5) {
                  pageNum = i + 1;
                } else {
                  const start = Math.max(1, currentPage - 2);
                  pageNum = start + i;
                  if (pageNum > filteredTotalPages) return null;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={handleNextPage}
                disabled={currentPage === filteredTotalPages}
                className="inline-flex items-center gap-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Reason Modal */}
      {selectedAppointmentId && (
        <CancellationReasonModal
          isOpen={isModalOpen}
          appointmentId={selectedAppointmentId}
          onConfirm={handleCancellationConfirm}
          onClose={closeCancellationModal}
        />
      )}
      </div>
    </div>
  );
}
