import { useEffect, useState, useCallback } from "react";

export interface Notification {
  id: number | string;
  type: "appointment" | "appointment_cancelled" | "cancellation" | "inventory" | "system" | "completed";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  icon?: string;
  color?: string;
  data?: {
    appointment_id?: number;
    patient_id?: number;
    patient_name?: string;
    procedure?: string;
    procedure_name?: string;
    appointment_date?: string;
    date?: string;
    cancellation_reason?: string;
    inventory_id?: number;
    item_name?: string;
    current_stock?: number;
    action?: string;
    status?: string;
  };
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/notifications", {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const notificationsList = Array.isArray(data) ? data : data.data || [];
        
        // Convert to notification format
        const formattedNotifications: Notification[] = notificationsList.map((notif: any) => ({
          id: notif.id,
          type: notif.type || "system",
          title: notif.title,
          message: notif.message,
          timestamp: new Date(notif.created_at),
          read: notif.read || false,
          data: notif.data,
        }));

        setNotifications(formattedNotifications);
        setHasNew(formattedNotifications.some((n) => !n.read));
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string | number) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
        credentials: "include",
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );

      setHasNew(
        notifications.some((n) => !n.read && n.id !== notificationId)
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, [notifications]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "PUT",
        credentials: "include",
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setHasNew(false);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string | number) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
        credentials: "include",
      });

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  }, []);

  // Fetch on mount and set up polling
  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 60 seconds (increased from 30 to reduce server load)
    const interval = setInterval(fetchNotifications, 60000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return {
    notifications,
    isLoading,
    hasNew,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};
