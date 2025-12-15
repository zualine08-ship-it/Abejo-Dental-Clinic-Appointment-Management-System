import { useState } from "react";
import Swal from "sweetalert2";

interface CancellationRequestData {
  appointment_id: number;
  patient_id: number;
  patient_name: string;
  procedure: string;
  appointment_date: string;
  cancellation_reason: string;
  cancellation_status: string;
}

interface CancellationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CancellationRequestData | null;
  onApprove?: (appointmentId: number) => void;
  onReject?: (appointmentId: number) => void;
}

export default function CancellationRequestModal({
  isOpen,
  onClose,
  data,
  onApprove,
  onReject,
}: CancellationRequestModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    if (!data) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/appointments/${data.appointment_id}/approve-cancellation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        Swal.fire({
          icon: "success",
          title: "Cancellation Approved",
          text: `Appointment cancellation for ${data.patient_name} has been approved. Patient will be notified.`,
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
        }).then(() => {
          onApprove?.(data.appointment_id);
          onClose();
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Approval Failed",
          text: result.message || "Failed to approve cancellation",
          confirmButtonColor: "#EF4444",
          customClass: {
            popup: "dark:bg-gray-900 dark:text-white",
            title: "dark:text-white",
            htmlContainer: "dark:text-gray-300",
          },
        });
      }
    } catch (error) {
      console.error("Approval error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to approve cancellation",
        confirmButtonColor: "#EF4444",
        customClass: {
          popup: "dark:bg-gray-900 dark:text-white",
          title: "dark:text-white",
          htmlContainer: "dark:text-gray-300",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!data) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/appointments/${data.appointment_id}/reject-cancellation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        Swal.fire({
          icon: "success",
          title: "Cancellation Rejected",
          text: `Appointment cancellation request from ${data.patient_name} has been rejected. Patient will be notified.`,
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
        }).then(() => {
          onReject?.(data.appointment_id);
          onClose();
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Rejection Failed",
          text: result.message || "Failed to reject cancellation",
          confirmButtonColor: "#EF4444",
          customClass: {
            popup: "dark:bg-gray-900 dark:text-white",
            title: "dark:text-white",
            htmlContainer: "dark:text-gray-300",
          },
        });
      }
    } catch (error) {
      console.error("Rejection error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to reject cancellation",
        confirmButtonColor: "#EF4444",
        customClass: {
          popup: "dark:bg-gray-900 dark:text-white",
          title: "dark:text-white",
          htmlContainer: "dark:text-gray-300",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Cancellation Request
        </h3>

        <div className="space-y-4 mb-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Patient Name
            </p>
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {data.patient_name}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Procedure</p>
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {data.procedure}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Appointment Date
            </p>
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {new Date(data.appointment_date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              at{" "}
              {new Date(data.appointment_date).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Cancellation Reason
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {data.cancellation_reason}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onClose()}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            disabled={isLoading}
          >
            Close
          </button>
          <button
            onClick={handleReject}
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "..." : "Reject"}
          </button>
          <button
            onClick={handleApprove}
            className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "..." : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}
