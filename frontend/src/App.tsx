import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { useAuth, AuthProvider } from "./config/AuthContext";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";

import ConfirmedAppointment from "./pages/ConfirmedAppointment";
import ViewAppointment from "./pages/ViewAppointment";
import PatientRecord from "./pages/PatientRecord";
import PatientHistory from "./pages/PatientHistory";
import PatientProcedureHistory from "./pages/PatientProcedureHistory";
import Notifications from "./pages/Notifications";

import PatientReport from "./pages/PatientReport";
import AppointmentReport from "./pages/AppointmentReport";
import InventoryReport from "./pages/InventoryReport";
import InventoryActivityHistory from "./pages/InventoryActivityHistory";
import ManageInventory from "./pages/ManageInventory";
import ManageServices from "./pages/ManageServices";

import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import PatientDashboard from "./pages/Patient/PatientDashboard";
import PatientLayout from "./pages/Patient/PatientLayout";
import BookAppointment from "./pages/Patient/BookAppointment";
import PatientCalendar from "./pages/Patient/Calendar";
import PatientAppointment from "./pages/Patient/PatientAppointment";
import AppointmentHistory from "./pages/Patient/AppointmentHistory";
import EditProfile from "./pages/Patient/EditProfile";
import ToastContainer from "./components/ui/toast/ToastContainer";
import Spinner from "./components/ui/spinner/Spinner";

// Protected Route Component - requires authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Spinner fullHeight />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/signin" replace />;
}

// Admin Route Component - requires admin role
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <Spinner fullHeight />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  // If user is patient, redirect to patient dashboard
  if (user?.role === 'patient') {
    return <Navigate to="/patient-dashboard" replace />;
  }

  return <>{children}</>;
}

// Patient Route Component - requires patient role
function PatientRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <Spinner fullHeight />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  // If user is admin, redirect to admin dashboard
  if (user?.role === 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <Spinner fullHeight />;
  }

  return (
    <Routes>
      {/* Admin Dashboard Layout - Admin only */}
      <Route element={<AdminRoute><AppLayout /></AdminRoute>}>
        <Route index path="/" element={<Home />} />
        <Route path="/notifications" element={<Notifications />} />
        
        {/* Others Page */}
        <Route path="/profile" element={<UserProfiles />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/blank" element={<Blank />} />
        <Route path="/viewappointment" element={<ViewAppointment />} />
        <Route path="/pendingappointment" element={<ConfirmedAppointment />} />
        <Route path="/patientrecord" element={<PatientRecord />} />
        <Route path="/patienthistory" element={<PatientHistory />} />
        <Route path="/patient-procedure-history/:patientId" element={<PatientProcedureHistory />} />

        {/* Reports*/}
        <Route path="/patientreport" element={<PatientReport/>} />
        <Route path="/appointmentreport" element={<AppointmentReport/>} />
        <Route path="/inventoryreport" element={<InventoryReport/>} />
        <Route path="/inventory-activity/:id" element={<InventoryActivityHistory/>} />
        <Route path="/manage-inventory" element={<ManageInventory/>} />
        <Route path="/manage-services" element={<ManageServices/>} />

        {/* Forms */}
        <Route path="/form-elements" element={<FormElements />} />

        {/* Tables */}
        <Route path="/basic-tables" element={<BasicTables />} />

        {/* Ui Elements */}
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/avatars" element={<Avatars />} />
        <Route path="/badge" element={<Badges />} />
        <Route path="/buttons" element={<Buttons />} />
        <Route path="/images" element={<Images />} />
        <Route path="/videos" element={<Videos />} />

        {/* Charts */}
        <Route path="/line-chart" element={<LineChart />} />
        <Route path="/bar-chart" element={<BarChart />} />
      </Route>

      {/* Patient Dashboard Layout - Patient only */}
      <Route element={<PatientRoute><AppLayout /></PatientRoute>}>
        <Route path="/patient-dashboard" element={<PatientLayout />}>
          <Route index element={<PatientDashboard />} />
          <Route path="book-appointment" element={<BookAppointment />} />
          <Route path="patientappointment" element={<PatientAppointment />} />
          <Route path="calendar" element={<PatientCalendar />} />
          <Route path="appointment-history" element={<AppointmentHistory />} />
          <Route path="edit-profile" element={<EditProfile />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
      </Route>

      {/* Auth Layout - redirect based on role if authenticated */}
      <Route 
        path="/signin" 
        element={
          isAuthenticated 
            ? (user?.role === 'patient' ? <Navigate to="/patient-dashboard" replace /> : <Navigate to="/" replace />) 
            : <SignIn />
        } 
      />
      <Route path="/signup" element={<SignUp />} />

      {/* Fallback Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <ToastContainer />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
