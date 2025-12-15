import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import RescheduleReasonModal from "../../ui/modal/RescheduleReasonModal";

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

export default function ViewAppointmentTable() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    fetchAppointments();
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
        // Filter to show ONLY pending appointments
        const pendingAppointments = data.filter((a: Appointment) => a.status === "pending");
        setAppointments(pendingAppointments);
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

  const handleConfirm = async (id: number, appointmentData: Appointment) => {
    try {
      // Get patient name from either patient relationship or patient_info (for walk-ins)
      const patientName = appointmentData.patient?.name || (appointmentData.patient_info as any)?.name || "N/A";
      
      // Show confirmation dialog
      const result = await Swal.fire({
        title: "Confirm Appointment?",
        html: `<div class="text-left">
          <p class="mb-2"><strong>Patient:</strong> ${patientName}</p>
          <p class="mb-2"><strong>Procedure:</strong> ${appointmentData.procedure?.name || "N/A"}</p>
          <p class="mb-2"><strong>Date:</strong> ${appointmentData.appointment_date}</p>
          <p class="mb-2"><strong>Time:</strong> ${appointmentData.appointment_time}</p>
        </div>
        <p class="mt-4">Are you sure you want to confirm this appointment?</p>`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Confirm",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#16a34a",
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
        text: "Confirming appointment",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: (modal) => {
          Swal.showLoading();
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });

      setActionLoading(id);
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status: "approved" }),
      });
      const data = await response.json();

      Swal.close();

      if (response.ok && data.success) {
        // Refresh the appointments list
        await fetchAppointments();
        Swal.fire({
          title: "Success!",
          text: "Appointment confirmed successfully",
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "999999";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
          },
        });
      } else if (data.conflict_with) {
        // Show conflict error with details
        Swal.fire({
          title: "Cannot Confirm",
          text: `Time slot is taken by ${data.conflict_with.patient}. Please reschedule.`,
          icon: "error",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
          didOpen: (modal) => {
            modal.style.zIndex = "999999";
            const backdrop = document.querySelector(".swal2-container");
            if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
          },
        });
      } else if (data.current_count !== undefined) {
        // Show daily limit reached error
        Swal.fire({
          title: "Cannot Confirm",
          text: `Already 5 patients scheduled for ${data.message.split('for ')[1] || 'this date'}. Please reschedule.`,
          icon: "error",
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
          text: data.message || "Failed to confirm appointment",
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
      console.error("Confirm error:", err);
      Swal.fire({
        title: "Error",
        text: "Failed to confirm appointment",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReschedule = (id: number, appointmentData: Appointment) => {
    setSelectedAppointment(appointmentData);
    setRescheduleModalOpen(true);
  };

  const handleRescheduleConfirm = async (
    selectedReason: string,
    specifiedReason?: string
  ) => {
    if (!selectedAppointment) return;

    try {
      setRescheduling(true);

      const requestBody = {
        status: "rescheduled",
        reschedule_reason: selectedReason,
        reschedule_reason_details:
          selectedReason === "Other (Admin to specify)" && specifiedReason
            ? specifiedReason
            : null,
      };

      const response = await fetch(
        `/api/appointments/${selectedAppointment.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Refresh the appointments list
        await fetchAppointments();
        setRescheduleModalOpen(false);
        setSelectedAppointment(null);

        Swal.fire({
          title: "Success!",
          text: "Patient will be notified about the rescheduling reason",
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
          text: data?.message || "Failed to reschedule appointment",
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
      console.error("Reschedule error:", err);
      Swal.fire({
        title: "Error",
        text:
          err instanceof Error
            ? err.message
            : "Failed to reschedule appointment",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        didOpen: (modal) => {
          modal.style.zIndex = "999999";
          const backdrop = document.querySelector(".swal2-container");
          if (backdrop) (backdrop as HTMLElement).style.zIndex = "999998";
        },
      });
    } finally {
      setRescheduling(false);
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
    <>
      <RescheduleReasonModal
        isOpen={rescheduleModalOpen}
        appointmentData={selectedAppointment || {
          patient: undefined,
          patient_info: undefined,
          procedure: { id: 0, name: "" },
          appointment_date: "",
          appointment_time: "",
        }}
        onConfirm={handleRescheduleConfirm}
        onCancel={() => {
          setRescheduleModalOpen(false);
          setSelectedAppointment(null);
        }}
        isLoading={rescheduling}
      />
      <div className="overflow-hidden rounded-xl border border-gray-300 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-sky-100 dark:bg-sky-900">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-sky-700 text-center border border-gray-300
 text-theme-xs  dark:text-sky-300"
              >
                Name
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-sky-700 text-center border border-gray-300
 text-theme-xs dark:text-sky-300"
              >
                Procedure
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-sky-700 text-center   border border-gray-300 text-theme-xs dark:text-sky-300"
              >
                Schedule
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-sky-700 text-center  border border-gray-300 text-theme-xs dark:text-sky-300"
              >
                Time
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-sky-700 text-center  border border-gray-300 text-theme-xs dark:text-sky-300"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-sky-700 text-center  border border-gray-300
 text-theme-xs dark:text-sky-300"
              >
                Action
              </TableCell>
              
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          {appointments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="px-5 py-4 text-center  border border-gray-300 text-gray-600 dark:text-gray-400">
                No pending appointments
              </TableCell>
            </TableRow>
          ) : (
            appointments.map((appointment) => (
              <TableRow key={appointment.id} className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableCell className="px-5 py-4 text-black-700  text-center border border-gray-300 border border-gray-300 dark:text-gray-300">
                  {appointment.patient?.name || (appointment.patient_info as any)?.name || "N/A"}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700  text-center border border-gray-300 dark:text-gray-300">
                  {appointment.procedure?.name || "N/A"}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700  text-center border border-gray-300 dark:text-gray-300">
                  {appointment.appointment_date}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700  text-center border border-gray-300 dark:text-gray-300">
                  {appointment.appointment_time}
                </TableCell>
                <TableCell className="px-5 py-4  text-center border border-gray-300">
                  <span className="inline-block px-3 py-1 rounded-full  text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    pending
                  </span>
                </TableCell>
                <TableCell className="px-5 py-4  text-center border border-gray-300">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleConfirm(appointment.id, appointment)}
                      disabled={actionLoading === appointment.id}
                      className="px-3 py-1 bg-green-600 text-center hover:bg-green-700 disabled:bg-gray-400 text-white text-xs font-medium rounded transition-colors"
                    >
                      {actionLoading === appointment.id ? "..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => handleReschedule(appointment.id, appointment)}
                      disabled={actionLoading === appointment.id}
                      className="px-3 py-1 bg-orange-600 text-center hover:bg-orange-700 disabled:bg-gray-400 text-white text-xs font-medium rounded transition-colors"
                    >
                      {actionLoading === appointment.id ? "..." : "Reschedule"}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </Table>
      </div>
    </div>
    </>
  );
}
