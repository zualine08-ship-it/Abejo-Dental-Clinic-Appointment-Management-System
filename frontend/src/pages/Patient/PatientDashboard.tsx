import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import axios from "../../config/axios";
import HealthMetrics from "../../components/patient/HealthMetrics";
import UpcomingAppointments from "../../components/patient/UpcomingAppointments";
import MedicalHistory from "../../components/patient/MedicalHistory";
import PatientProfile from "../../components/patient/PatientProfile";
import PatientReviews from "../../components/patient/PatientReviews";
import { useAuth } from "../../config/AuthContext";
import { CalenderIcon } from "../../icons";

interface HealthSummary {
  total_appointments: number;
  upcoming_appointments: number;
  completed_appointments: number;
  medical_records: number;
  last_visit: string;
}

interface Appointment {
  id: number;
  doctor: string;
  procedure: string;
  date: string;
  appointment_date?: string;
  time: string;
  appointment_time?: string;
  status: string;
  notes: string;
  location: string;
}

interface MedicalRecord {
  id: number;
  date: string;
  diagnosis: string;
  treatment: string;
  doctor: string;
  notes: string;
}

interface PatientProfileData {
  id: number;
  name: string;
  email: string;
  phone: string;
  age?: number;
  gender?: string;
  date_of_birth: string | null;
  address: string;
  blood_type: string;
  emergency_contact: string;
  created_at: string;
}

export default function PatientDashboard() {
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<MedicalRecord[]>([]);
  const [patientProfile, setPatientProfile] = useState<PatientProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAppointments, setSelectedAppointments] = useState<Set<number>>(new Set());
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Verify authentication first (will return 401/302 if unauthenticated)
        try {
          await axios.get("/api/me");
        } catch (authErr) {
          console.warn("Not authenticated when fetching dashboard:", (authErr as any)?.response?.status);
          // Redirect to signin
          navigate("/signin", { replace: true });
          return;
        }

        const [summaryRes, appointmentsRes, historyRes, profileRes] = await Promise.all([
          axios.get("/api/patient/health-summary"),
          axios.get("/api/patient/appointments"),
          axios.get("/api/patient/medical-history"),
          axios.get("/api/patient/profile"),
        ]);

        setHealthSummary(summaryRes.data.summary);
        setAppointments(appointmentsRes.data.appointments);
        setMedicalHistory(historyRes.data.history);
        setPatientProfile(profileRes.data.patient);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        const resp = (err as any).response;
        const message = resp?.data?.message || resp?.data || (err as any).message || "Failed to load dashboard data. Please try again.";
        setError(typeof message === 'string' ? message : JSON.stringify(message));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-300">{error}</p>
      </div>
    );
  }

  // Determine if this is a first-time user
  const isFirstTimeUser = patientProfile?.created_at ? (() => {
    const createdDate = new Date(patientProfile.created_at);
    const now = new Date();
    const daysDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff < 1; // Account created less than 1 day ago
  })() : false;

  const welcomeMessage = isFirstTimeUser 
    ? `Welcome, ${patientProfile?.name || user?.name || 'Patient'}!` 
    : `Welcome back, ${patientProfile?.name || user?.name || 'Patient'}!`;
  
  const welcomeDescription = isFirstTimeUser
    ? "Great to have you here! Let's get started with your health profile"
    : "Here's an overview of your appointments and health summary";

  return (
    <>
      <PageMeta
        title="Patient Dashboard | Abejo AMS"
        
      />
      
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Welcome Header */}
        <div className="col-span-12">
          <div className="rounded-2xl bg-cyan-100 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 p-8 md:p-10">
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {welcomeMessage}
                </h1>
                <p className="text-cyan-700 dark:text-cyan-400">{welcomeDescription}</p>
              </div>
              <div className="border-t border-cyan-200 dark:border-cyan-800 pt-6">
                <p className="text-base text-cyan-800 dark:text-cyan-300">
                  Today is {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Health Metrics */}
        <div className="col-span-12">
          {healthSummary && <HealthMetrics summary={healthSummary} />}
        </div>

       
       
        {/* Appointment History / Recent Activities */}
        <div className="col-span-12 md:col-span-6">
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
              Recent Appointment History
            </h3>

            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400 mb-4">No appointment history yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.slice(0, 5).map((appointment, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition"
                  >
                    {/* Timeline Dot */}
                    <div className="flex flex-col items-center mt-1">
                      <div className={`w-3 h-3 rounded-full ${
                        appointment.status === 'completed'
                          ? 'bg-green-500'
                          : appointment.status === 'pending'
                          ? 'bg-yellow-500'
                          : appointment.status === 'cancelled'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}></div>
                      {index < 4 && <div className="w-0.5 h-12 bg-gray-300 dark:bg-gray-700 mt-2"></div>}
                    </div>

                    {/* Activity Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {appointment.procedure || 'Appointment'}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          appointment.status === 'completed'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : appointment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : appointment.status === 'cancelled'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {appointment.status || 'scheduled'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <CalenderIcon className="w-4 h-4 inline mr-2" />
                        {appointment.date || appointment.appointment_date || 'N/A'} at {appointment.time || appointment.appointment_time || 'N/A'}
                      </p>
                      {appointment.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {appointment.notes}
                        </p>
                      )}
                    </div>
                    
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
          {/* Upcoming Appointments */}
        <div className="col-span-12 md:col-span-6">
          <UpcomingAppointments appointments={appointments} />
        </div>

        {/* Patient Reviews Section */}
        <div className="col-span-12 md:col-span-6">
          <PatientReviews />
        </div>
      </div>
    </>
  );
}
