import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { showToast } from "../../hooks/useToast";

interface CancellationReasonModalProps {
  isOpen: boolean;
  appointmentId: number;
  onConfirm: (appointmentId: number, reason: string) => Promise<void>;
  onClose: () => void;
}

const CANCELLATION_REASONS = [
  "I am no longer available on the scheduled date",
  "I have a personal emergency",
  "I am feeling unwell",
  "I changed my mind",
  "I booked the wrong service/procedure",
  "I selected the wrong date or time",
  "I need to reschedule to another day",
  "I have financial concerns at the moment",
  "I have already booked with another clinic",
  "Transportation issues",
  "Other reason",
];

export default function CancellationReasonModal({
  isOpen,
  appointmentId,
  onConfirm,
  onClose,
}: CancellationReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Apply modal overlay to entire page when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!selectedReason) {
      Swal.fire({
        icon: "warning",
        title: "Please Select a Reason",
        text: "You must select a cancellation reason before proceeding",
        confirmButtonColor: "#3B82F6",
        customClass: {
          popup: "dark:bg-gray-900 dark:text-white",
          title: "dark:text-white",
          htmlContainer: "dark:text-gray-300",
        },
      });
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm(appointmentId, selectedReason);
      setSelectedReason("");
      onClose();
    } catch (error) {
      console.error("Confirmation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-lg dark:bg-gray-800 p-6">
        {/* Header */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Cancel Appointment
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Please select the reason for cancelling your appointment
          </p>
        </div>

        {/* Cancellation Reasons */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Reason for Cancellation <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
            {CANCELLATION_REASONS.map((reason) => (
              <label
                key={reason}
                className="flex items-center p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-600 cursor-pointer transition-colors border border-transparent hover:border-blue-200 dark:hover:border-gray-500"
              >
                <input
                  type="radio"
                  name="cancellation_reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-4 h-4 text-blue-600 accent-blue-600"
                />
                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  {reason}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Info Message */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> Your cancellation reason will help us improve our services.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !selectedReason}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Processing..." : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}
