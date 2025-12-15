import { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Link, useNavigate } from "react-router";
import { useNotifications } from "../../hooks/useNotifications";
import CancellationDetailsModal from "../modals/CancellationDetailsModal";
import { useAuth } from "../../config/AuthContext";
import Swal from "sweetalert2";

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
      return "bg-blue-100 dark:bg-blue-900/30";
    case "completed":
      return "bg-green-100 dark:bg-green-900/30";
    case "appointment_cancelled":
      return "bg-red-100 dark:bg-red-900/30";
    case "cancellation":
      return "bg-red-100 dark:bg-red-900/30";
    case "inventory":
      return "bg-yellow-100 dark:bg-yellow-900/30";
    default:
      return "bg-gray-100 dark:bg-gray-800";
  }
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCancellationDetails, setShowCancellationDetails] = useState(false);
  const [selectedCancellationData, setSelectedCancellationData] = useState(null);
  const { notifications, hasNew, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { user } = useAuth();

  const unreadNotifications = notifications.filter((n) => !n.read);
  
  // Determine the correct notifications path based on user role
  const notificationsPath = user?.role === "patient" 
    ? "/patient-dashboard/notifications" 
    : "/notifications";

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const handleClick = () => {
    toggleDropdown();
  };

  const navigate = useNavigate();

  const handleNotificationClick = (notificationId: string | number, notification: any) => {
    markAsRead(notificationId);
    
    // Check if this is an appointment_cancelled notification with data
    if (notification.type === "appointment_cancelled" && notification.data) {
      setSelectedCancellationData(notification.data);
      setShowCancellationDetails(true);
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
          setIsOpen(false);
          const appointmentId = notification.data.appointment_id;
          navigate(`/patient-dashboard/appointment-history${appointmentId ? `?rate=${appointmentId}` : ''}`);
        }
      });
    } else {
      // For other notification types, show a generic modal
      Swal.fire({
        title: notification.title,
        html: `<p>${notification.message}</p>`,
        icon: "info",
        confirmButtonText: "Close",
        confirmButtonColor: "#3b82f6",
        customClass: {
          popup: "dark:bg-gray-900 dark:text-white",
          title: "dark:text-white",
          htmlContainer: "dark:text-gray-300",
        },
      });
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

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
        aria-label="Notifications"
      >
        {hasNew && (
          <span className="absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 flex">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifications {unreadNotifications.length > 0 && `(${unreadNotifications.length})`}
          </h5>
          <button
            onClick={toggleDropdown}
            className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">No notifications yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">You're all caught up!</p>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto custom-scrollbar">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <DropdownItem
                    onItemClick={() => handleNotificationClick(notification.id, notification)}
                    className={`flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 cursor-pointer transition ${
                      !notification.read ? "bg-blue-50 dark:bg-blue-900/10" : ""
                    }`}
                  >
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full text-lg flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-gray-800 dark:text-white text-sm truncate">
                          {notification.title}
                        </span>
                        {!notification.read && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <span className="flex items-center gap-2 text-gray-500 text-xs dark:text-gray-500 mt-2">
                        <span>{formatTime(notification.timestamp)}</span>
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    </div>
                  </DropdownItem>
                </li>
              ))}
            </ul>

            {unreadNotifications.length > 0 && (
              <button
                onClick={() => {
                  markAllAsRead();
                }}
                className="w-full px-4 py-2 mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
              >
                Mark all as read
              </button>
            )}
          </>
        )}

        <Link
          to={notificationsPath}
          onClick={closeDropdown}
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View All Notifications
        </Link>
      </Dropdown>

      <CancellationDetailsModal
        isOpen={showCancellationDetails}
        onClose={() => setShowCancellationDetails(false)}
        data={selectedCancellationData}
      />
    </div>
  );
}
