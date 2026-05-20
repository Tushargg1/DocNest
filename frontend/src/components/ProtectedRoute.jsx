import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, roles }) {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/login/patient" replace />;
  }

  if (roles?.length > 0 && !roles.includes(session.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
