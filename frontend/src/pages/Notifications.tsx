import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useNotifications } from "../hooks/useNotifications";
import CancellationDetailsModal from "../components/modals/CancellationDetailsModal";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Swal from "sweetalert2";

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, deleteNotification, fetchNotifications } = useNotifications();
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "appointment":
        return "📅";
      case "completed":
        return "✅";
      case "appointment_cancelled":
        return "❌";
      case "cancellation":
        return "❌";
      case "inventory":
        return "📦";
      default:
        return "📢";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "appointment":
        return "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800";
      case "completed":
        return "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800";
      case "appointment_cancelled":
        return "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800";
      case "cancellation":
        return "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800";
      case "inventory":
        return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(date).toLocaleDateString();
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);

    if (notification.type === "appointment_cancelled" && notification.data) {
      setSelectedNotification(notification.data);
      setShowModal(true);
    } else if (notification.type === "completed" && notification.data?.action === "rate") {
      // Handle completed notification with rate action
      Swal.fire({
        title: "🎉 Procedure Completed!",
        html: `
          <div class="text-left">
            <p class="mb-3">${notification.message}</p>
            <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <p class="text-sm"><strong>Procedure:</strong> ${notification.data.procedure_name}</p>
              <p class="text-sm"><strong>Date:</strong> ${notification.data.date}</p>
            </div>
          </div>
        `,
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "⭐ Rate Now",
        cancelButtonText: "Maybe Later",
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#6b7280",
        customClass: {
          popup: "dark:bg-gray-900 dark:text-white",
          title: "dark:text-white",
          htmlContainer: "dark:text-gray-300",
        },
      }).then((result) => {
        if (result.isConfirmed) {
          // Navigate to appointment history page with rate parameter to auto-open modal
          const appointmentId = notification.data.appointment_id;
          navigate(`/patient-dashboard/appointment-history${appointmentId ? `?rate=${appointmentId}` : ''}`);
        }
      });
    }
  };

  const toggleSelectNotification = (id: string | number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const deleteSelected = () => {
    selectedIds.forEach(id => {
      deleteNotification(id);
    });
    setSelectedIds(new Set());
  };

  const markSelectedAsRead = () => {
    selectedIds.forEach(id => {
      markAsRead(id);
    });
    setSelectedIds(new Set());
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  return (
    <>
      <PageMeta title="Notifications" />
      <PageBreadcrumb pageTitle="All Notifications" />
      
      <div className="max-w-4xl mx-auto">

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="mb-6 flex flex-col sm:flex-row gap-3">
            {!isSelectMode ? (
              <button
                onClick={() => setIsSelectMode(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Select
              </button>
            ) : (
              <>
                <button
                  onClick={() => toggleSelectAll()}
                  className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                >
                  {selectedIds.size === notifications.length ? "Deselect All" : "Select All"}
                </button>

                {selectedIds.size > 0 && (
                  <>
                    <button
                      onClick={markSelectedAsRead}
                      className="px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
                    >
                      Mark {selectedIds.size} as read
                    </button>
                    <button
                      onClick={deleteSelected}
                      className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    >
                      Delete {selectedIds.size}
                    </button>
                  </>
                )}

                <button
                  onClick={exitSelectMode}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                No notifications
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${getNotificationColor(notification.type)} ${
                  !notification.read
                    ? "ring-2 ring-blue-400 dark:ring-blue-600"
                    : "opacity-75 hover:opacity-100"
                } ${selectedIds.has(notification.id) ? "ring-2 ring-purple-500 dark:ring-purple-400" : ""}`}
              >
                <div className="flex gap-4">
                  {/* Checkbox - Only show in select mode */}
                  {isSelectMode && (
                    <div className="flex-shrink-0 flex items-start pt-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(notification.id)}
                        onChange={() => toggleSelectNotification(notification.id)}
                        className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-full text-lg cursor-pointer"
                      onClick={() => !isSelectMode && handleNotificationClick(notification)}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => !isSelectMode && handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {notification.message}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex gap-2">
                        {notification.type === "completed" && notification.data?.action === "rate" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white">
                            ⭐ Rate Now
                          </span>
                        )}
                        {!notification.read && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                            New
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(notification.timestamp)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cancellation Details Modal */}
      {showModal && (
        <CancellationDetailsModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          data={selectedNotification}
        />
      )}
    </>
  );
}
