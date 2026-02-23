import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthCallback } from "./components/AuthCallback";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import BookAppointment from "./pages/BookAppointment";
import Appointments from "./pages/Appointments";
import AppointmentDetail from "./pages/AppointmentDetail";
import VideoCall from "./pages/VideoCall";
import MedicalRecords from "./pages/MedicalRecords";
import Invoices from "./pages/Invoices";
import UserManagement from "./pages/UserManagement";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

// Router wrapper to handle auth callback
function AppRouter() {
  const location = useLocation();
  
  // Check URL fragment for session_id - synchronous check before routes render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      {/* Protected routes - All authenticated users */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/appointments" element={
        <ProtectedRoute>
          <Appointments />
        </ProtectedRoute>
      } />
      
      <Route path="/appointments/:id" element={
        <ProtectedRoute>
          <AppointmentDetail />
        </ProtectedRoute>
      } />
      
      <Route path="/book-appointment" element={
        <ProtectedRoute allowedRoles={['patient', 'staff', 'admin']}>
          <BookAppointment />
        </ProtectedRoute>
      } />
      
      <Route path="/video-call/:id" element={
        <ProtectedRoute allowedRoles={['patient', 'doctor']}>
          <VideoCall />
        </ProtectedRoute>
      } />
      
      <Route path="/medical-records" element={
        <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}>
          <MedicalRecords />
        </ProtectedRoute>
      } />
      
      <Route path="/invoices" element={
        <ProtectedRoute>
          <Invoices />
        </ProtectedRoute>
      } />
      
      {/* Admin only routes */}
      <Route path="/users" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <UserManagement />
        </ProtectedRoute>
      } />
      
      {/* Staff routes */}
      <Route path="/patients" element={
        <ProtectedRoute allowedRoles={['staff', 'doctor', 'admin']}>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      {/* Settings placeholder */}
      <Route path="/settings" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
