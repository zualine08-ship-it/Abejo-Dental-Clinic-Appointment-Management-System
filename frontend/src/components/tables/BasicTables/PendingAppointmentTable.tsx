import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import Swal from "sweetalert2";
import AdminCancellationReasonModal from "../../modals/AdminCancellationReasonModal";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";

interface Appointment {
  id: number;
  patient?: { id: number; name: string };
  patient_info?: {
    name: string;
    age: number;
    contact: string;
    email: string;
  };
  procedure: { id: number; name: string };
  appointment_date: string;
  appointment_time: string;
  status: string;
}

export interface PendingAppointmentTableRef {
  fetchAppointments: () => Promise<void>;
}

const PendingAppointmentTable = forwardRef<PendingAppointmentTableRef>((_, ref) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedAppointmentForCancel, setSelectedAppointmentForCancel] = useState<Appointment | null>(null);

  useImperativeHandle(ref, () => ({
    fetchAppointments,
  }));

  useEffect(() => {
    fetchAppointments();
    // Poll for updates every 30 seconds instead of every 5 seconds
    const interval = setInterval(fetchAppointments, 30000);
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
        // Filter to show only approved/confirmed appointments
        const approvedAppointments = data.filter((a: Appointment) => a.status === "approved");
        setAppointments(approvedAppointments);
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

  const handleComplete = async (id: number, appointmentData: Appointment) => {
    try {
      // Show confirmation dialog
      const result = await Swal.fire({
        title: "Complete Appointment?",
        html: `<div class="text-left">
          <p class="mb-2"><strong>Patient:</strong> ${appointmentData.patient?.name || "N/A"}</p>
          <p class="mb-2"><strong>Procedure:</strong> ${appointmentData.procedure?.name || "N/A"}</p>
          <p class="mb-2"><strong>Date:</strong> ${appointmentData.appointment_date}</p>
          <p class="mb-2"><strong>Time:</strong> ${appointmentData.appointment_time}</p>
        </div>
        <p class="mt-4">Mark this appointment as completed?</p>`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Complete",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#2563eb",
        cancelButtonColor: "#6B7280",
        didOpen: (modal) => {
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });

      if (!result.isConfirmed) return;

      // Show loading state
      Swal.fire({
        title: "Processing...",
        text: "Completing appointment",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: (modal) => {
          Swal.showLoading();
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });

      // First, mark appointment as completed
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status: "completed" }),
      });
      const data = await response.json();
      
      if (response.ok && (data.success || data.appointment)) {
        // Now create patient history record from the appointment
        try {
          const historyResponse = await fetch(`/api/patient-history`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ appointment_id: id }),
          });
          const historyData = await historyResponse.json();
          
          if (historyResponse.ok && (historyData.success || historyData.patient_history)) {
            setAppointments(appointments.filter((a) => a.id !== id));
            Swal.fire({
              title: "Success!",
              text: "Appointment completed and patient record created",
              icon: "success",
              confirmButtonText: "OK",
              confirmButtonColor: "#3B82F6",
              didOpen: (modal) => {
                modal.style.zIndex = "999999";
                const backdrop = document.querySelector(".swal2-container");
                if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
              },
            });
          } else {
            // Appointment completed but record creation might have failed
            setAppointments(appointments.filter((a) => a.id !== id));
            console.warn("Record creation response:", historyData);
            Swal.fire({
              title: "Completed",
              text: historyData.message || "Appointment completed",
              icon: "success",
              confirmButtonText: "OK",
              confirmButtonColor: "#3B82F6",
              didOpen: (modal) => {
                modal.style.zIndex = "999999";
                const backdrop = document.querySelector(".swal2-container");
                if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
              },
            });
          }
        } catch (historyErr) {
          console.error("History creation error:", historyErr);
          setAppointments(appointments.filter((a) => a.id !== id));
          Swal.fire({
            title: "Completed",
            text: "Appointment completed (please refresh for patient record)",
            icon: "warning",
            confirmButtonText: "OK",
            confirmButtonColor: "#3B82F6",
            didOpen: (modal) => {
              modal.style.zIndex = "999999";
              const backdrop = document.querySelector(".swal2-container");
              if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
            },
          });
        }
      } else {
        Swal.fire({
          title: "Error",
          text: data.message || "Failed to complete appointment",
          icon: "error",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "999999";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
          },
        });
      }
    } catch (err) {
      console.error("Complete error:", err);
      Swal.fire({
        title: "Error",
        text: "Failed to complete appointment",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });
    }
  };
  const handleCancel = (appointmentData: Appointment) => {
    setSelectedAppointmentForCancel(appointmentData);
    setCancelModalOpen(true);
  };

  const handleCancelConfirm = async (id: number, reason: string, details?: string) => {
    try {
      // Show loading state
      Swal.fire({
        title: "Processing...",
        text: "Cancelling appointment",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: (modal) => {
          Swal.showLoading();
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });

      const response = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          status: "cancelled",
          cancellation_reason: reason,
          cancellation_reason_details: details,
          cancelled_by: "admin",
        }),
      });
      const data = await response.json();

      Swal.close();

      if (response.ok && (data.success || data.appointment)) {
        setAppointments(appointments.filter((a) => a.id !== id));
        setCancelModalOpen(false);
        Swal.fire({
          title: "Cancelled",
          text: "Appointment cancelled and patient notified",
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "999999";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
          },
        });
      } else {
        Swal.fire({
          title: "Error",
          text: data.message || "Failed to cancel appointment",
          icon: "error",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "999999";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
          },
        });
      }
    } catch (err) {
      console.error("Cancel error:", err);
      Swal.fire({
        title: "Error",
        text: "Failed to cancel appointment",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });
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
          <TableHeader className="border-b border-gray-100 border border-gray-300 dark:border-white/[0.05] bg-sky-100 dark:bg-sky-900">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-sky-700 text-center border border-gray-300 text-center text-theme-xs dark:text-sky-300"
              >
                Name
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-sky-700 text-center border border-gray-300 text-center text-theme-xs dark:text-sky-300"
              >
                Procedure
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-sky-700 text-center border border-gray-300 text-center text-theme-xs dark:text-sky-300"
              >
                Schedule
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-sky-700  border border-gray-300 text-center  text-theme-xs dark:text-sky-300"
              >
                Time
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-sky-700  border border-gray-300 text-center  text-theme-xs dark:text-sky-300"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-sky-700  border border-gray-300 text-center  text-theme-xs dark:text-sky-300"
              >
                Action
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          {appointments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="px-5 py-4  border border-gray-300 text-gray-600 text-center dark:text-gray-400">
                No pending appointments
              </TableCell>
            </TableRow>
          ) : (
            appointments.map((appointment) => (
              <TableRow key={appointment.id} className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableCell className="px-5 py-4 text-black-700 dark:text-gray-300">
                  {appointment.patient?.name || (appointment.patient_info as any)?.name || "N/A"}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700 text-center border border-gray-300 dark:text-gray-300">
                  {appointment.procedure?.name || "N/A"}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700 text-center border border-gray-300 dark:text-gray-300">
                  {appointment.appointment_date}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700 text-center border border-gray-300 dark:text-gray-300">
                  {appointment.appointment_time}
                </TableCell>
                <TableCell className="px-5 py-4 text-center border border-gray-300">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Confirmed
                  </span>
                </TableCell>
                <TableCell className="px-5 py-4 text-center border border-gray-300">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleComplete(appointment.id, appointment)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => handleCancel(appointment)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </Table>
      </div>

      {/* Admin Cancellation Reason Modal */}
      {selectedAppointmentForCancel && (
        <AdminCancellationReasonModal
          isOpen={cancelModalOpen}
          appointmentId={selectedAppointmentForCancel.id}
          appointmentData={selectedAppointmentForCancel}
          onConfirm={handleCancelConfirm}
          onClose={() => {
            setCancelModalOpen(false);
            setSelectedAppointmentForCancel(null);
          }}
        />
      )}
    </div>
  );
});

PendingAppointmentTable.displayName = "PendingAppointmentTable";

export default PendingAppointmentTable;
