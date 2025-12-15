import { useState, useEffect } from "react";
import Swal from "sweetalert2";

interface AdminCancellationReasonModalProps {
  isOpen: boolean;
  appointmentId: number;
  appointmentData?: {
    patient?: { name: string };
    patient_info?: { name: string };
    procedure?: { name: string };
    appointment_date: string;
    appointment_time: string;
  };
  onConfirm: (appointmentId: number, reason: string, details?: string) => Promise<void>;
  onClose: () => void;
}

const ADMIN_CANCELLATION_REASONS = [
  // Patient-Related Reasons
  "Patient did not arrive for the appointment",
  "Patient informed late that they cannot attend",
  "Patient had a personal emergency",
  "Patient is feeling unwell",
  "Patient has transportation issues",
  "Patient has a scheduling conflict",
  "Patient could not be contacted",
  "Patient decided not to continue with the treatment",
  "Patient booked with another clinic",
  "Patient needs more time to prepare for the procedure",
  // Dentist/Staff-Related Reasons
  "Dentist had an unexpected emergency",
  "Dentist is unexpectedly unavailable",
  // Clinic-Related Reasons
  "Clinic temporarily closed due to maintenance",
  "Power interruption",
  "Equipment malfunction",
  "Dental chair or room unavailable",
  "Overlapping procedures causing delays",
  "Clinic requested cancellation due to operational reasons",
  "Required materials or supplies not available",
  // Medical/Procedure-Related Reasons
  "Laboratory results incomplete",
  "Procedure cannot be performed on the scheduled day",
  "Patient did not follow required pre-procedure instructions",
  // Administrative Reasons
  "Appointment cancelled by patient request",
  "Appointment cancelled by clinic request",
  // Other
  "Other (Admin to specify)",
];

export default function AdminCancellationReasonModal({
  isOpen,
  appointmentId,
  appointmentData,
  onConfirm,
  onClose,
}: AdminCancellationReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
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

    // If "Other" is selected, require custom reason
    if (selectedReason === "Other (Admin to specify)" && !customReason.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Please Specify",
        text: "Please provide details for the 'Other' reason",
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
      await onConfirm(
        appointmentId,
        selectedReason,
        selectedReason === "Other (Admin to specify)" ? customReason : undefined
      );
      setSelectedReason("");
      setCustomReason("");
      onClose();
    } catch (error) {
      console.error("Confirmation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    setCustomReason("");
    onClose();
  };

  if (!isOpen) return null;

  const patientName =
    appointmentData?.patient?.name || appointmentData?.patient_info?.name || "N/A";
  const procedureName = appointmentData?.procedure?.name || "N/A";
  const appointmentDate = appointmentData?.appointment_date || "N/A";
  const appointmentTime = appointmentData?.appointment_time || "N/A";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-lg dark:bg-gray-800 p-6">
        {/* Header */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Cancel Appointment
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Please select the reason for cancelling this appointment
          </p>
        </div>

        {/* Appointment Details */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">
            Appointment Details
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Patient</p>
              <p className="text-gray-900 dark:text-white font-medium">{patientName}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Procedure</p>
              <p className="text-gray-900 dark:text-white font-medium">{procedureName}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Date</p>
              <p className="text-gray-900 dark:text-white font-medium">{appointmentDate}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Time</p>
              <p className="text-gray-900 dark:text-white font-medium">{appointmentTime}</p>
            </div>
          </div>
        </div>

        {/* Cancellation Reasons */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Reason for Cancellation <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
            {ADMIN_CANCELLATION_REASONS.map((reason) => (
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

        {/* Custom Reason Input (if "Other" is selected) */}
        {selectedReason === "Other (Admin to specify)" && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Please Specify <span className="text-red-500">*</span>
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Enter the specific cancellation reason..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
        )}

        {/* Info Message */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> The patient will be notified about the cancellation along
            with the reason provided.
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
