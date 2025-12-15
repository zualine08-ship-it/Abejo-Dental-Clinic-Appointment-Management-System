import { useEffect, useState } from "react";
import { CheckCircleIcon, TimeIcon, AlertIcon } from "../../icons";

interface TodaysSummaryData {
  scheduledToday: number;
  completedToday: number;
  pendingToday: number;
  cancelledToday: number;
}

export default function TodaysSummary() {
  const [summary, setSummary] = useState<TodaysSummaryData>({
    scheduledToday: 0,
    completedToday: 0,
    pendingToday: 0,
    cancelledToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaysSummary();
  }, []);

  const fetchTodaysSummary = async () => {
    try {
      setLoading(true);
      const appointmentsRes = await fetch("/api/appointments", {
        credentials: "include",
      });
      const appointmentsData = await appointmentsRes.json();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayAppointments = Array.isArray(appointmentsData)
        ? appointmentsData.filter((apt: any) => {
            const aptDate = new Date(apt.appointment_date);
            aptDate.setHours(0, 0, 0, 0);
            return aptDate.getTime() === today.getTime();
          })
        : [];

      const completedToday = todayAppointments.filter(
        (apt: any) => apt.status === "completed"
      ).length;
      const pendingToday = todayAppointments.filter(
        (apt: any) => apt.status === "pending" || apt.status === "scheduled"
      ).length;
      const cancelledToday = todayAppointments.filter(
        (apt: any) => apt.status === "cancelled"
      ).length;

      setSummary({
        scheduledToday: todayAppointments.length,
        completedToday,
        pendingToday,
        cancelledToday,
      });
    } catch (error) {
      console.error("Error fetching today's summary:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
        Today's Summary
      </h3>

      <div className="space-y-4">
        {/* Scheduled Today */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/20">
              <TimeIcon className="text-blue-600 size-5 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Scheduled Today
              </p>
              <p className="text-lg font-bold text-gray-800 dark:text-white/90">
                {loading ? "..." : summary.scheduledToday}
              </p>
            </div>
          </div>
        </div>

        {/* Completed Today */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
              <CheckCircleIcon className="text-green-600 size-5 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Completed Today
              </p>
              <p className="text-lg font-bold text-gray-800 dark:text-white/90">
                {loading ? "..." : summary.completedToday}
              </p>
            </div>
          </div>
        </div>

        {/* Pending Today */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg dark:bg-yellow-500/20">
              <AlertIcon className="text-yellow-600 size-5 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pending Today
              </p>
              <p className="text-lg font-bold text-gray-800 dark:text-white/90">
                {loading ? "..." : summary.pendingToday}
              </p>
            </div>
          </div>
        </div>

        {/* Cancelled Today */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-500/20">
              <AlertIcon className="text-red-600 size-5 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cancelled Today
              </p>
              <p className="text-lg font-bold text-gray-800 dark:text-white/90">
                {loading ? "..." : summary.cancelledToday}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
