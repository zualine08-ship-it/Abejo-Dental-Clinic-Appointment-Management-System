import { useEffect, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GroupIcon,
  CheckCircleIcon,
  CalenderIcon,
} from "../../icons";
import Badge from "../ui/badge/Badge";

interface MetricsData {
  patients: number;
  appointments: number;
  completedToday: number;
  successfulAppointments: number;
  upcomingConfirmed: number;
}

export default function EcommerceMetrics() {
  const [metrics, setMetrics] = useState<MetricsData>({
    patients: 0,
    appointments: 0,
    completedToday: 0,
    successfulAppointments: 0,
    upcomingConfirmed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      // Fetch total patients count
      const patientCountRes = await fetch("/api/patients/count", {
        credentials: "include",
      });
      const patientCountData = await patientCountRes.json();
      const patientCount = patientCountData.total || 0;

      // Fetch appointments
      const appointmentsRes = await fetch("/api/appointments", {
        credentials: "include",
      });
      const appointmentsData = await appointmentsRes.json();
      const appointmentCount = Array.isArray(appointmentsData) ? appointmentsData.length : 0;
      
      // Count completed appointments
      const successfulAppointments = Array.isArray(appointmentsData)
        ? appointmentsData.filter((apt: any) => apt.status === "completed").length
        : 0;
      
      // Count completed appointments today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const completedToday = Array.isArray(appointmentsData)
        ? appointmentsData.filter((apt: any) => {
            if (apt.status !== "completed") return false;
            const aptDate = new Date(apt.appointment_date);
            aptDate.setHours(0, 0, 0, 0);
            return aptDate.getTime() === today.getTime();
          }).length
        : 0;

      // Count upcoming confirmed/approved appointments (future date)
      const upcomingConfirmed = Array.isArray(appointmentsData)
        ? appointmentsData.filter((apt: any) => {
            if (apt.status !== "approved" && apt.status !== "confirmed") return false;
            const aptDate = new Date(apt.appointment_date);
            aptDate.setHours(0, 0, 0, 0);
            return aptDate.getTime() >= today.getTime();
          }).length
        : 0;

      setMetrics({
        patients: patientCount,
        appointments: appointmentCount,
        completedToday: completedToday,
        successfulAppointments: successfulAppointments,
        upcomingConfirmed: upcomingConfirmed,
      });
    } catch (err) {
      console.error("Error fetching metrics:", err);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {/* Total Patients */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/30 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <span className="inline-block text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
              Total Patients
            </span>
            <h4 className="mt-3 text-4xl font-bold text-blue-900 dark:text-blue-100">
              {loading ? "..." : metrics.patients}
            </h4>
          </div>
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-blue-900/30 shadow-sm">
            <GroupIcon className="text-blue-600 size-8 dark:text-blue-400" />
          </div>
        </div>
      </div>

      {/* Total Appointments */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/30 dark:to-cyan-900/20 border border-cyan-200/50 dark:border-cyan-800/30 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <span className="inline-block text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">
              Total Appointments
            </span>
            <h4 className="mt-3 text-4xl font-bold text-cyan-900 dark:text-cyan-100">
              {loading ? "..." : metrics.appointments}
            </h4>
          </div>
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-cyan-900/30 shadow-sm">
            <CalenderIcon className="text-cyan-600 size-8 dark:text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Completed Appointments */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <span className="inline-block text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              Completed Appointments
            </span>
            <h4 className="mt-3 text-4xl font-bold text-emerald-900 dark:text-emerald-100">
              {loading ? "..." : metrics.successfulAppointments}
            </h4>
          </div>
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-emerald-900/30 shadow-sm">
            <CheckCircleIcon className="text-emerald-600 size-8 dark:text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Upcoming Confirmed Appointments */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20 border border-violet-200/50 dark:border-violet-800/30 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <span className="inline-block text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">
              Upcoming Confirmed
            </span>
            <h4 className="mt-3 text-4xl font-bold text-violet-900 dark:text-violet-100">
              {loading ? "..." : metrics.upcomingConfirmed}
            </h4>
          </div>
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-violet-900/30 shadow-sm">
            <CheckCircleIcon className="text-violet-600 size-8 dark:text-violet-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
