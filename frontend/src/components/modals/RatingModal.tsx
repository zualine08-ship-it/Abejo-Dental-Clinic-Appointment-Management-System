import { useState } from "react";
import Swal from "sweetalert2";

interface RatingModalProps {
  isOpen: boolean;
  appointmentId: number;
  procedure: string;
  appointmentDate: string;
  onConfirm: (rating: number, comment: string) => Promise<void>;
  onClose: () => void;
}

export default function RatingModal({
  isOpen,
  appointmentId,
  procedure,
  appointmentDate,
  onConfirm,
  onClose,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      Swal.fire({
        icon: "warning",
        title: "Please Rate",
        text: "Please select a rating before submitting",
        confirmButtonColor: "#3B82F6",
        customClass: {
          popup: "dark:bg-gray-900 dark:text-white",
          title: "dark:text-white",
          htmlContainer: "dark:text-gray-300",
        },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(rating, comment);
      setRating(0);
      setComment("");
      onClose();
    } catch (error) {
      console.error("Rating submission error:", error);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg dark:bg-gray-800 p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Rate Your Appointment
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Share your experience to help us improve
          </p>
        </div>

        {/* Appointment Details */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
            <span className="font-semibold">Procedure:</span> {procedure}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Date:</span> {appointmentDate}
          </p>
        </div>

        {/* Rating Section */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-4">
            How would you rate your experience?
          </label>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none transition-transform transform hover:scale-110"
              >
                <span
                  className={`text-5xl transition-colors ${
                    star <= (hoverRating || rating)
                      ? "text-yellow-400"
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                >
                  ★
                </span>
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </p>
          )}
        </div>

        {/* Comment Section */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Comments (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience, suggestions, or any feedback..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={4}
          />
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {comment.length}/500 characters
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Submitting...
              </>
            ) : (
              <>✍️ Submit Rating</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
