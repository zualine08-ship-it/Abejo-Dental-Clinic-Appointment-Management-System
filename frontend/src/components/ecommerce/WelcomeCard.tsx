import { useEffect, useState } from "react";

interface WelcomeData {
  userName: string;
  appointmentsToday: number;
  patientsTotal: number;
  lastUpdate: string;
}

export default function WelcomeCard() {
  const [welcomeData, setWelcomeData] = useState<WelcomeData>({
    userName: "Admin",
    appointmentsToday: 0,
    patientsTotal: 0,
    lastUpdate: new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  });

  useEffect(() => {
    const fetchWelcomeData = async () => {
      try {
        // Get stored user info
        const userName = localStorage.getItem("userName") || "Admin";

        // Fetch appointments for today
        const appointmentsRes = await fetch("/api/appointments", {
          credentials: "include",
        });
        const appointmentsData = await appointmentsRes.json();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const appointmentsToday = Array.isArray(appointmentsData)
          ? appointmentsData.filter((apt: any) => {
              const aptDate = new Date(apt.appointment_date);
              aptDate.setHours(0, 0, 0, 0);
              return aptDate.getTime() === today.getTime();
            }).length
          : 0;

        // Fetch total patients count
        const patientCountRes = await fetch("/api/patients/count", {
          credentials: "include",
        });
        const patientCountData = await patientCountRes.json();
        const patientsTotal = patientCountData.total || 0;

        setWelcomeData({
          userName,
          appointmentsToday,
          patientsTotal,
          lastUpdate: new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        });
      } catch (error) {
        console.error("Error fetching welcome data:", error);
      }
    };

    fetchWelcomeData();
  }, []);

  return (
    <div className="rounded-2xl bg-cyan-100 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 p-8 dark:p-10 sm:p-10">
      <div className="space-y-6">
        <div>
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
            Welcome, {welcomeData.userName}!
          </h2>
          <p className="mt-3 text-lg text-cyan-700 dark:text-cyan-400">
            Great to have you here! Let's get started with your dashboard
          </p>
        </div>

        <div className="border-t border-cyan-200 dark:border-cyan-800 pt-6">
          <p className="text-base text-cyan-800 dark:text-cyan-300">
            Today is {welcomeData.lastUpdate}
          </p>
        </div>
      </div>
    </div>
  );
}
