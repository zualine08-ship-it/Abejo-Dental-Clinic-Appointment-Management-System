import { useEffect, useState } from "react";
import axios from "../../config/axios";

interface Review {
  id: number;
  patient_name: string;
  procedure: string;
  rating: number;
  comment: string;
  date: string;
}

interface ReviewsData {
  reviews: Review[];
  total: number;
  average_rating: number;
}

export default function PatientReviews() {
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const reviewsPerPage = 3;

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await axios.get("/api/public/reviews");
        setReviewsData(response.data);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300 dark:text-gray-600"
            }`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!reviewsData || reviewsData.reviews.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Patient Reviews
        </h3>
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400">No reviews yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Be the first to share your experience!</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(reviewsData.reviews.length / reviewsPerPage);
  const displayedReviews = reviewsData.reviews.slice(
    currentPage * reviewsPerPage,
    (currentPage + 1) * reviewsPerPage
  );

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
      {/* Header with Average Rating */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Patient Reviews
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            What our patients say about us
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {reviewsData.average_rating}
            </span>
            <div className="flex flex-col items-start">
              {renderStars(Math.round(reviewsData.average_rating))}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {reviewsData.total} review{reviewsData.total !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {displayedReviews.map((review) => (
          <div
            key={review.id}
            className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                  {review.patient_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {review.patient_name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {review.procedure}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {renderStars(review.rating)}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {review.date}
                </p>
              </div>
            </div>
            {review.comment && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 pl-13">
                "{review.comment}"
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition ${
                  currentPage === i
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage === totalPages - 1}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
