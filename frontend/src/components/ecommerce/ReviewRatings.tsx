import { useEffect, useState, useRef } from "react";
import axios from "../../config/axios";
import Swal from "sweetalert2";

interface Review {
  id: number;
  appointment_id: number;
  patient_name: string;
  procedure: string;
  rating: number;
  comment: string;
  date: string;
}

interface ProcedureRating {
  procedure: string;
  average_rating: number;
  total_ratings: number;
  highest: boolean;
}

interface ReviewRatingsProps {
  section?: "procedures" | "reviews";
}

export default function ReviewRatings({ section = "procedures" }: ReviewRatingsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [procedureStats, setProcedureStats] = useState<ProcedureRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [procedurePage, setProcedurePage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 5;
  const proceduresPerPage = 4;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle delete review
  const handleDeleteReview = async (reviewId: number, appointmentId: number) => {
    const result = await Swal.fire({
      title: "Delete Review?",
      text: "Are you sure you want to delete this review? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        const response = await axios.delete(`/api/appointments/${appointmentId}/review`);
        
        if (response.data.success) {
          // Remove from local state
          setReviews(prev => prev.filter(r => r.id !== reviewId));
          
          // Recalculate procedure stats
          const updatedReviews = reviews.filter(r => r.id !== reviewId);
          const procedureMap: { [key: string]: { ratings: number[]; count: number } } = {};
          
          updatedReviews.forEach((review: Review) => {
            if (!procedureMap[review.procedure]) {
              procedureMap[review.procedure] = { ratings: [], count: 0 };
            }
            procedureMap[review.procedure].ratings.push(review.rating);
            procedureMap[review.procedure].count++;
          });
          
          const stats: ProcedureRating[] = Object.entries(procedureMap).map(
            ([procedure, data]) => ({
              procedure,
              average_rating: parseFloat(
                (data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(2)
              ),
              total_ratings: data.count,
              highest: false,
            })
          );
          
          if (stats.length > 0) {
            const maxAverage = Math.max(...stats.map(s => s.average_rating));
            stats.forEach(s => {
              if (s.average_rating === maxAverage) {
                s.highest = true;
              }
            });
          }
          
          setProcedureStats(stats.sort((a, b) => b.average_rating - a.average_rating));

          Swal.fire({
            title: "Deleted!",
            text: "The review has been deleted.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
        }
      } catch (err) {
        console.error("Error deleting review:", err);
        Swal.fire({
          title: "Error",
          text: "Failed to delete the review. Please try again.",
          icon: "error",
        });
      }
    }
    
    setOpenMenuId(null);
  };

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/appointments/reviews");
        
        if (response.data.success) {
          const allReviews = response.data.reviews || [];
          setReviews(allReviews);
          
          // Calculate procedure statistics
          const procedureMap: { [key: string]: { ratings: number[]; count: number } } = {};
          
          allReviews.forEach((review: Review) => {
            if (!procedureMap[review.procedure]) {
              procedureMap[review.procedure] = { ratings: [], count: 0 };
            }
            procedureMap[review.procedure].ratings.push(review.rating);
            procedureMap[review.procedure].count++;
          });
          
          // Calculate averages
          const stats: ProcedureRating[] = Object.entries(procedureMap).map(
            ([procedure, data]) => ({
              procedure,
              average_rating: parseFloat(
                (data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(2)
              ),
              total_ratings: data.count,
              highest: false,
            })
          );
          
          // Find highest rated
          if (stats.length > 0) {
            const maxAverage = Math.max(...stats.map(s => s.average_rating));
            stats.forEach(s => {
              if (s.average_rating === maxAverage) {
                s.highest = true;
              }
            });
          }
          
          setProcedureStats(stats.sort((a, b) => b.average_rating - a.average_rating));
        }
      } catch (err) {
        console.error("Error fetching reviews:", err);
        setError("Failed to load reviews");
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  // Filter reviews based on rating
  const filteredReviews = filterRating
    ? reviews.filter(r => r.rating === filterRating)
    : reviews;

  // Pagination
  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReviews = filteredReviews.slice(startIndex, startIndex + itemsPerPage);

  // Calculate overall statistics
  const totalReviews = reviews.length;
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)
    : 0;
  const fiveStarCount = reviews.filter(r => r.rating === 5).length;
  const fourStarCount = reviews.filter(r => r.rating === 4).length;

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Procedure Ratings Section
  if (section === "procedures") {
    const totalProcedurePages = Math.ceil(procedureStats.length / proceduresPerPage);
    const procStartIndex = (procedurePage - 1) * proceduresPerPage;
    const paginatedProcedures = procedureStats.slice(procStartIndex, procStartIndex + proceduresPerPage);

    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          🏆 Procedure Ratings
        </h3>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-gray-50 rounded-xl dark:bg-gray-800/50">
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Reviews</p>
            <p className="text-lg font-bold text-gray-800 dark:text-white/90">{totalReviews}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl dark:bg-gray-800/50">
            <p className="text-xs text-gray-600 dark:text-gray-400">Avg Rating</p>
            <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{averageRating} ⭐</p>
          </div>
        </div>

        {/* Procedure List */}
        <div className="space-y-2">
          {paginatedProcedures.length > 0 ? (
            paginatedProcedures.map((proc, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl flex items-center justify-between ${
                  proc.highest
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700"
                    : "bg-gray-50 dark:bg-gray-800/50"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white/90 truncate">
                      {proc.procedure}
                    </h4>
                    {proc.highest && (
                      <span className="inline-block px-1.5 py-0.5 bg-yellow-200 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100 rounded text-xs font-bold flex-shrink-0">
                        BEST
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-xs ${
                          i < Math.round(proc.average_rating)
                            ? "text-yellow-400"
                            : "text-gray-300 dark:text-gray-600"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                      {proc.average_rating}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-white/90">{proc.total_ratings}</p>
                  <p className="text-xs text-gray-500">ratings</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600 dark:text-gray-400">No ratings yet</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalProcedurePages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {procedurePage}/{totalProcedurePages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setProcedurePage(prev => Math.max(1, prev - 1))}
                disabled={procedurePage === 1}
                className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
              >
                ←
              </button>
              <button
                onClick={() => setProcedurePage(prev => Math.min(totalProcedurePages, prev + 1))}
                disabled={procedurePage === totalProcedurePages}
                className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
              >
                →
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
            <p className="text-red-800 dark:text-red-300 text-xs">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Recent Reviews Section
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Recent Reviews
        </h3>
        
        {/* Rating Filter */}
        <div className="flex gap-1">
          <button
            onClick={() => {
              setFilterRating(null);
              setCurrentPage(1);
            }}
            className={`px-2 py-1 rounded text-xs font-medium transition ${
              filterRating === null
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}
          >
            All
          </button>
          {[5, 4, 3].map((rating) => (
            <button
              key={rating}
              onClick={() => {
                setFilterRating(rating);
                setCurrentPage(1);
              }}
              className={`px-2 py-1 rounded text-xs font-medium transition ${
                filterRating === rating
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              {rating}⭐
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {paginatedReviews.length > 0 ? (
          paginatedReviews.map((review) => (
            <div
              key={review.id}
              className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl relative"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white/90 truncate">
                    {review.procedure}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {review.patient_name}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-0.5 justify-end">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-xs ${
                            i < review.rating
                              ? "text-yellow-400"
                              : "text-gray-300 dark:text-gray-600"
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">{review.date}</p>
                  </div>
                  
                  {/* Three-dot menu */}
                  <div className="relative" ref={openMenuId === review.id ? menuRef : null}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === review.id ? null : review.id)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                      <svg
                        className="w-4 h-4 text-gray-500 dark:text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    
                    {/* Dropdown Menu */}
                    {openMenuId === review.id && (
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                        <button
                          onClick={() => handleDeleteReview(review.id, review.appointment_id)}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Review
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {review.comment && (
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 p-2 bg-white dark:bg-gray-700/50 rounded border-l-2 border-blue-500 line-clamp-2">
                  "{review.comment}"
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filterRating ? "No reviews found" : "No reviews yet"}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500">{currentPage}/{totalPages}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
          <p className="text-red-800 dark:text-red-300 text-xs">{error}</p>
        </div>
      )}
    </div>
  );
}
