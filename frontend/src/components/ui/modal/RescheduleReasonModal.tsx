import { useState } from "react";
import Button from "../button/Button";

interface RescheduleReasonModalProps {
  isOpen: boolean;
  appointmentData: {
    patient?: { id: number; name: string };
    patient_info?: {
      name: string;
      age: number;
      contact: string;
      email: string;
    };
    procedure?: { id: number; name: string };
    appointment_date: string;
    appointment_time: string;
  };
  onConfirm: (reason: string, otherReason?: string) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

const RESCHEDULE_REASONS = [
  "Dentist is not available",
  "Dentist has an emergency",
  "Dentist is on leave",
  "Dentist has an urgent medical appointment",
  "Dentist attending seminar or training",
  "Clinic needs to adjust the schedule",
  "Clinic closed due to maintenance",
  "Power interruption",
  "Equipment needed for the procedure is unavailable",
  "Dental chair or room is under sanitation",
  "Overlapping appointments",
  "Clinic is fully booked",
  "Equipment malfunction",
  "Procedure requires more preparation time",
  "Materials or supplies are not ready",
  "Procedure cannot be performed on the selected date",
  "Laboratory results not yet available",
  "Technician or dental assistant unavailable",
  "Appointment time conflict",
  "Prior procedure taking longer than expected",
  "Emergency patient needs the slot",
  "Unexpected delays in earlier treatments",
  "Other (Admin to specify)",
];

export default function RescheduleReasonModal({
  isOpen,
  appointmentData,
  onConfirm,
  onCancel,
  isLoading,
}: RescheduleReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState<string>("");
  const [submitLoading, setSubmitLoading] = useState(false);

  if (!isOpen) return null;

  const patientName =
    appointmentData.patient?.name ||
    (appointmentData.patient_info as any)?.name ||
    "N/A";

  const handleSubmit = async () => {
    if (!selectedReason) {
      alert("Please select a reschedule reason");
      return;
    }

    if (selectedReason === "Other (Admin to specify)" && !otherReason.trim()) {
      alert("Please specify the reason");
      return;
    }

    setSubmitLoading(true);
    try {
      const reason =
        selectedReason === "Other (Admin to specify)"
          ? otherReason.trim()
          : selectedReason;
      await onConfirm(selectedReason, reason);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-lg dark:bg-gray-800 p-6">
        {/* Header */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Reschedule Appointment
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Please select the reason for rescheduling
          </p>
        </div>

        {/* Appointment Details */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Appointment Details
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Patient:</p>
              <p className="font-medium text-gray-800 dark:text-white">
                {patientName}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Procedure:</p>
              <p className="font-medium text-gray-800 dark:text-white">
                {appointmentData.procedure?.name || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Date:</p>
              <p className="font-medium text-gray-800 dark:text-white">
                {appointmentData.appointment_date}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Time:</p>
              <p className="font-medium text-gray-800 dark:text-white">
                {appointmentData.appointment_time}
              </p>
            </div>
          </div>
        </div>

        {/* Reschedule Reasons */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Reason for Rescheduling <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
            {RESCHEDULE_REASONS.map((reason) => (
              <label
                key={reason}
                className="flex items-center p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-600 cursor-pointer transition-colors border border-transparent hover:border-blue-200 dark:hover:border-gray-500"
              >
                <input
                  type="radio"
                  name="reschedule_reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => {
                    setSelectedReason(e.target.value);
                    if (reason !== "Other (Admin to specify)") {
                      setOtherReason("");
                    }
                  }}
                  className="w-4 h-4 text-blue-600 accent-blue-600"
                />
                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  {reason}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Other Reason Input */}
        {selectedReason === "Other (Admin to specify)" && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Please Specify <span className="text-red-500">*</span>
            </label>
            <textarea
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              placeholder="Enter the reason for rescheduling..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
          </div>
        )}

        {/* Info Message */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> The patient will be notified about the
            rescheduled appointment with the reason provided.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            onClick={onCancel}
            disabled={submitLoading || isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitLoading || isLoading || !selectedReason}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitLoading || isLoading ? "Processing..." : "Confirm Reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
