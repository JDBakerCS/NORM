import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingState from './LoadingState.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState fullPage label="Restoring your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
