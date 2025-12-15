import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import PageMeta from "../../components/common/PageMeta";
import axios from "../../config/axios";
import { useAuth } from "../../config/AuthContext";
import RatingModal from "../../components/modals/RatingModal";

interface Appointment {
  id: number;
  doctor: string;
  procedure: string;
  date: string;
  appointment_date?: string;
  time: string;
  appointment_time?: string;
  status: string;
  notes: string;
  location: string;
  rating?: number;
  comment?: string;
  rating_date?: string;
  price?: number;
}

interface PatientProfile {
  name: string;
  email: string;
}

interface ReviewRating {
  appointment_id: number;
  procedure: string;
  rating: number;
  comment: string;
  date: string;
}

export default function AppointmentHistory() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAppointments, setSelectedAppointments] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [reviews, setReviews] = useState<ReviewRating[]>([]);
  const [activeTab, setActiveTab] = useState<"appointments" | "reviews">("appointments");
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedAppointmentForRating, setSelectedAppointmentForRating] = useState<Appointment | null>(null);
  const itemsPerPage = 10;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Verify authentication
        try {
          await axios.get("/api/me");
        } catch (authErr) {
          navigate("/signin", { replace: true });
          return;
        }

        const [appointmentsRes, profileRes] = await Promise.all([
          axios.get("/api/patient/appointments"),
          axios.get("/api/patient/profile"),
        ]);

        const appointmentsData = appointmentsRes.data.appointments;
        setAppointments(appointmentsData);
        setPatientProfile(profileRes.data.patient);
        
        // Build reviews from appointments that have ratings
        const existingReviews: ReviewRating[] = appointmentsData
          .filter((apt: Appointment) => apt.rating && apt.rating > 0)
          .map((apt: Appointment) => ({
            appointment_id: apt.id,
            procedure: apt.procedure,
            rating: apt.rating!,
            comment: apt.comment || "",
            date: apt.rating_date || apt.date || apt.appointment_date || "",
          }));
        setReviews(existingReviews);

        // Check if there's a rate parameter in URL (from notification)
        const rateAppointmentId = searchParams.get("rate");
        if (rateAppointmentId) {
          const appointmentToRate = appointmentsData.find(
            (apt: Appointment) => apt.id === parseInt(rateAppointmentId) && apt.status === "completed" && !apt.rating
          );
          if (appointmentToRate) {
            setSelectedAppointmentForRating(appointmentToRate);
            setRatingModalOpen(true);
            // Clear the URL parameter
            setSearchParams({});
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        const resp = (err as any).response;
        const message = resp?.data?.message || "Failed to load appointment history";
        setError(typeof message === 'string' ? message : JSON.stringify(message));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Filter appointments based on status
  const filteredAppointments = statusFilter === "all" 
    ? appointments 
    : appointments.filter(apt => apt.status === statusFilter);

  // Pagination logic
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  // Toggle appointment selection
  const toggleAppointmentSelection = (id: number) => {
    const newSelected = new Set(selectedAppointments);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAppointments(newSelected);
  };

  // Print selected or all appointments
  const handlePrint = () => {
    const appointmentsToPrint = selectedAppointments.size > 0
      ? appointments.filter(apt => selectedAppointments.has(apt.id))
      : filteredAppointments;

    const printContent = `
      <html>
        <head>
          <title>Appointment History</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background-color: #f9fafb; }
            .container { max-width: 900px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            h1 { text-align: center; color: #1f2937; margin-bottom: 10px; }
            .meta { text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; }
            th { background-color: #3B82F6; color: white; padding: 12px; text-align: left; font-weight: 600; }
            td { border-bottom: 1px solid #e5e7eb; padding: 12px; color: #374151; }
            tr:hover { background-color: #f3f4f6; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 12px; }
            .completed { background-color: #dcfce7; color: #166534; }
            .pending { background-color: #fef3c7; color: #92400e; }
            .cancelled { background-color: #fee2e2; color: #991b1b; }
            .rescheduled { background-color: #e0e7ff; color: #3730a3; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Appointment History Report</h1>
            <div class="meta">
              <p><strong>Patient:</strong> ${patientProfile?.name || 'N/A'}</p>
              <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Total Appointments:</strong> ${appointmentsToPrint.length}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Procedure</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  
                </tr>
              </thead>
              <tbody>
                ${appointmentsToPrint.map(apt => `
                  <tr>
                    <td><strong>${apt.procedure || 'Appointment'}</strong></td>
                    <td>${apt.date || apt.appointment_date || 'N/A'} at ${apt.time || apt.appointment_time || 'N/A'}</td>
                    <td><span class="status ${apt.status}">${apt.status?.charAt(0).toUpperCase() + apt.status?.slice(1) || 'scheduled'}</span></td>
                    <td>${apt.notes || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=1000,height=700');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Export to CSV
  const handleExport = () => {
    const appointmentsToExport = selectedAppointments.size > 0
      ? appointments.filter(apt => selectedAppointments.has(apt.id))
      : filteredAppointments;

    const headers = ['Procedure', 'Date', 'Time', 'Status', 'Notes'];
    const rows = appointmentsToExport.map(apt => [
      apt.procedure || 'Appointment',
      apt.date || apt.appointment_date || 'N/A',
      apt.time || apt.appointment_time || 'N/A',
      apt.status || 'scheduled',
      apt.notes || ''
    ]);

    const csv = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointment-history-${new Date().getTime()}.csv`;
    a.click();
  };

  // Handle rating submission
  const handleRatingSubmit = async (rating: number, comment: string) => {
    if (!selectedAppointmentForRating) return;

    try {
      // Send rating to API
      const response = await axios.post(
        `/api/appointments/${selectedAppointmentForRating.id}/rate`,
        {
          rating,
          comment,
        }
      );

      if (response.data.success) {
        // Update the appointment with rating
        const updatedAppointments = appointments.map(apt =>
          apt.id === selectedAppointmentForRating.id
            ? {
                ...apt,
                rating,
                comment,
                rating_date: new Date().toLocaleDateString(),
              }
            : apt
        );
        setAppointments(updatedAppointments);

        // Add to reviews list
        const newReview: ReviewRating = {
          appointment_id: selectedAppointmentForRating.id,
          procedure: selectedAppointmentForRating.procedure,
          rating,
          comment,
          date: new Date().toLocaleDateString(),
        };
        setReviews([...reviews, newReview]);

        setSelectedAppointmentForRating(null);
        setRatingModalOpen(false);

        Swal.fire({
          icon: "success",
          title: "Rating Submitted",
          text: "Thank you for your feedback!",
          confirmButtonColor: "#3B82F6",
          customClass: {
            popup: "dark:bg-gray-900 dark:text-white",
            title: "dark:text-white",
            htmlContainer: "dark:text-gray-300",
          },
        });
      }
    } catch (err) {
      console.error("Rating error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to submit rating",
        confirmButtonColor: "#3B82F6",
        customClass: {
          popup: "dark:bg-gray-900 dark:text-white",
          title: "dark:text-white",
          htmlContainer: "dark:text-gray-300",
        },
      });
    }
  };

  const openRatingModal = (appointment: Appointment) => {
    setSelectedAppointmentForRating(appointment);
    setRatingModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading appointment history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Appointment History | Abejo AMS"
   
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              Appointment History
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Total: {filteredAppointments.length} appointment(s)
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
          {/* Indicator Tabs */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-3 pb-6 border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => {
                  setActiveTab("appointments");
                  setStatusFilter("all");
                  setSelectedAppointments(new Set());
                  setCurrentPage(1);
                }}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  activeTab === "appointments"
                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                }`}
              >
                All Appointments
                <span className="ml-2 text-xs font-semibold">
                  ({appointments.length})
                </span>
              </button>

              {activeTab === "appointments" && (
                <>
                  <button
                    onClick={() => {
                      setStatusFilter("completed");
                      setSelectedAppointments(new Set());
                      setCurrentPage(1);
                    }}
                    className={`px-6 py-2 rounded-lg font-medium transition-all text-center ${
                      statusFilter === "completed"
                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                    }`}
                  >
                    Completed
                    <span className="ml-2 text-xs font-semibold">
                      ({appointments.filter(a => a.status === "completed").length})
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setStatusFilter("pending");
                      setSelectedAppointments(new Set());
                      setCurrentPage(1);
                    }}
                    className={`px-6 py-2 rounded-lg font-medium transition-all text-center ${
                      statusFilter === "pending"
                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                    }`}
                  >
                    Pending
                    <span className="ml-2 text-xs font-semibold">
                      ({appointments.filter(a => a.status === "pending").length})
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setStatusFilter("cancelled");
                      setSelectedAppointments(new Set());
                      setCurrentPage(1);
                    }}
                    className={`px-6 py-2 rounded-lg font-medium transition-all text-center ${
                      statusFilter === "cancelled"
                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                    }`}
                  >
                    Cancelled
                    <span className="ml-2 text-xs font-semibold">
                      ({appointments.filter(a => a.status === "cancelled").length})
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setStatusFilter("rescheduled");
                      setSelectedAppointments(new Set());
                      setCurrentPage(1);
                    }}
                    className={`px-6 py-2 rounded-lg font-medium transition-all text-center ${
                      statusFilter === "rescheduled"
                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                    }`}
                  >
                    Rescheduled
                    <span className="ml-2 text-xs font-semibold">
                      ({appointments.filter(a => a.status === "rescheduled").length})
                    </span>
                  </button>
                </>
              )}

              <button
                onClick={() => setActiveTab("reviews")}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  activeTab === "reviews"
                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                }`}
              >
                ⭐ Review Ratings
                <span className="ml-2 text-xs font-semibold">
                  ({reviews.length})
                </span>
              </button>
            </div>
          </div>

          {/* Appointments View */}
          {activeTab === "appointments" && (
            <>
              {/* Controls */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex-1"></div>

                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <button
                onClick={() => setIsSelectMode(!isSelectMode)}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  isSelectMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white'
                }`}
              >
                ☑️ Select
              </button>
              <button
                onClick={handlePrint}
                disabled={filteredAppointments.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                🖨️ Print
              </button>
            </div>
          </div>

          {/* Selection Bar */}
          {isSelectMode && filteredAppointments.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedAppointments.size === filteredAppointments.length && filteredAppointments.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const newSelected = new Set(filteredAppointments.map(apt => apt.id));
                      setSelectedAppointments(newSelected);
                    } else {
                      setSelectedAppointments(new Set());
                    }
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  {selectedAppointments.size > 0 
                    ? `${selectedAppointments.size} selected (${selectedAppointments.size === filteredAppointments.length ? 'All' : 'Partial'})` 
                    : "Select appointments"}
                </span>
              </div>
              {selectedAppointments.size > 0 && (
                <button
                  onClick={() => setSelectedAppointments(new Set())}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Table View */}
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No appointments found</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">Try adjusting your filter or book a new appointment</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {isSelectMode && (
                        <th className="px-4 py-3 text-left text-sm font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 w-12">
                          <input
                            type="checkbox"
                            checked={selectedAppointments.size === paginatedAppointments.length && paginatedAppointments.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const newSelected = new Set(selectedAppointments);
                                paginatedAppointments.forEach(apt => newSelected.add(apt.id));
                                setSelectedAppointments(newSelected);
                              } else {
                                const newSelected = new Set(selectedAppointments);
                                paginatedAppointments.forEach(apt => newSelected.delete(apt.id));
                                setSelectedAppointments(newSelected);
                              }
                            }}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                      )}
                    <th className="px-4 py-3 text-center text-sm font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-200 dark:border-gray-700">Procedure</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-200 dark:border-gray-700">Date</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-200 dark:border-gray-700">Time</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-200 dark:border-gray-700">Price</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-200 dark:border-gray-700">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-gray-200 dark:border-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAppointments.map((appointment) => (
                    <tr
                      key={appointment.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition"
                    >
                      {isSelectMode && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedAppointments.has(appointment.id)}
                            onChange={() => toggleAppointmentSelection(appointment.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-start font-medium text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
                        {appointment.procedure || 'Appointment'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        {appointment.date || appointment.appointment_date || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        {appointment.time || appointment.appointment_time || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        {appointment.price ? `₱${appointment.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-start border border-gray-200 dark:border-gray-700">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium ${
                          appointment.status === 'completed'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : appointment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : appointment.status === 'cancelled'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) : 'Scheduled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center border border-gray-200 dark:border-gray-700">
                        {appointment.status === 'completed' && !appointment.rating ? (
                          <button
                            onClick={() => openRatingModal(appointment)}
                            className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium text-xs transition"
                          >
                            ⭐ Rate
                          </button>
                        ) : appointment.status === 'completed' && appointment.rating ? (
                          <span className="inline-flex items-center justify-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                            ⭐ {appointment.rating}/5
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages} • Showing {paginatedAppointments.length} of {filteredAppointments.length} appointments
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
            </>
          )}

          {/* Review Ratings Section */}
          {activeTab === "reviews" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  ⭐ Share Your Experience
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Your feedback helps us improve our services
                </p>
              </div>

              {reviews && reviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {reviews.map((review, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:shadow-md transition"
                    >
                      <div className="mb-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">
                          {review.procedure}
                        </h3>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-lg ${
                                i < review.rating
                                  ? "text-yellow-400"
                                  : "text-gray-300 dark:text-gray-600"
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {review.comment && (
                        <div className="mb-2">
                          <p className="text-gray-700 dark:text-gray-300 text-xs p-2 bg-blue-50 dark:bg-blue-900/20 rounded border-l-2 border-blue-500 line-clamp-2">
                            "{review.comment}"
                          </p>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {review.date}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <div className="text-5xl mb-4">📝</div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                    No reviews yet
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">
                    Share your feedback after your completed appointments
                  </p>
                  <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
                    ✍️ Leave a Review
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rating Modal */}
        {selectedAppointmentForRating && (
          <RatingModal
            isOpen={ratingModalOpen}
            appointmentId={selectedAppointmentForRating.id}
            procedure={selectedAppointmentForRating.procedure}
            appointmentDate={selectedAppointmentForRating.appointment_date || selectedAppointmentForRating.date}
            onConfirm={handleRatingSubmit}
            onClose={() => {
              setRatingModalOpen(false);
              setSelectedAppointmentForRating(null);
            }}
          />
        )}
      </div>
    </>
  );
}
