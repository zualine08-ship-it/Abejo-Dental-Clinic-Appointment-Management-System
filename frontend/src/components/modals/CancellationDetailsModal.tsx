import { useEffect, useRef } from "react";
import Swal from "sweetalert2";

interface CancellationData {
  appointment_id: number;
  patient_id: number;
  patient_name: string;
  procedure: string;
  appointment_date: string;
  cancellation_reason: string;
}

interface CancellationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CancellationData | null;
}

export default function CancellationDetailsModal({
  isOpen,
  onClose,
  data,
}: CancellationDetailsModalProps) {
  const hasShownModal = useRef(false);

  useEffect(() => {
    if (isOpen && data && !hasShownModal.current) {
      hasShownModal.current = true;
      Swal.fire({
        title: "Appointment Cancellation Details",
        html: `
          <div class="text-left">
            <div class="mb-4">
              <p class="text-sm text-gray-500 dark:text-gray-400">Patient Name</p>
              <p class="text-base font-medium text-gray-900 dark:text-white">${data.patient_name}</p>
            </div>
            <div class="mb-4">
              <p class="text-sm text-gray-500 dark:text-gray-400">Procedure</p>
              <p class="text-base font-medium text-gray-900 dark:text-white">${data.procedure}</p>
            </div>
            <div class="mb-4">
              <p class="text-sm text-gray-500 dark:text-gray-400">Appointment Date</p>
              <p class="text-base font-medium text-gray-900 dark:text-white">${new Date(data.appointment_date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })} at ${new Date(data.appointment_date).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}</p>
            </div>
            <div class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p class="text-sm text-gray-500 dark:text-gray-400">Cancellation Reason</p>
              <p class="text-base font-medium text-red-600 dark:text-red-400 mt-1">${data.cancellation_reason}</p>
            </div>
          </div>
        `,
        icon: "info",
        confirmButtonText: "Close",
        confirmButtonColor: "#3b82f6",
        allowOutsideClick: true,
        didClose: () => {
          hasShownModal.current = false;
          onClose();
        },
      });
    }
  }, [isOpen, data, onClose]);

  return null;
}
