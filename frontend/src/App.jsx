import { Navigate, Route, Routes } from "react-router-dom";
import Footer from "./components/Footer";
import TopNav from "./components/TopNav";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import ApplyClinic from "./pages/ApplyClinic";
import BookAppointment from "./pages/BookAppointment";
import About from "./pages/About";
import DoctorDetails from "./pages/DoctorDetails";
import DoctorWorkspace from "./pages/DoctorWorkspace";
import ClinicWorkspace from "./pages/ClinicWorkspace";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NearbyDoctors from "./pages/NearbyDoctors";
import PatientVisits from "./pages/PatientVisits";
import RegisterPatient from "./pages/RegisterPatient";
import Profile from "./pages/Profile";
import SymptomChecker from "./pages/SymptomChecker";

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterPatient />} />
          <Route path="/register/patient" element={<RegisterPatient />} />
          <Route path="/apply/clinic" element={<ApplyClinic />} />
          <Route path="/nearby" element={<NearbyDoctors />} />
          <Route path="/doctor/:doctorUserId" element={<DoctorDetails />} />
          <Route
            path="/doctor/workspace"
            element={
              <ProtectedRoute roles={["DOCTOR"]}>
                <DoctorWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinic/workspace"
            element={
              <ProtectedRoute roles={["CLINIC"]}>
                <ClinicWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book"
            element={
              <ProtectedRoute roles={["PATIENT"]}>
                <BookAppointment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/visits"
            element={
              <ProtectedRoute roles={["PATIENT"]}>
                <PatientVisits />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute roles={["PATIENT", "CLINIC", "ADMIN"]}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/symptoms"
            element={
              <ProtectedRoute roles={["PATIENT"]}>
                <SymptomChecker />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
