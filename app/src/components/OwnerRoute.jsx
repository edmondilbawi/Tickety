import { Navigate } from 'react-router-dom';
import useAuth from '../context/useAuth.js';
import LoadingMessage from './LoadingMessage.jsx';

function OwnerRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingMessage message="Loading account..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'owner') {
    return <Navigate to="/events" replace />;
  }

  return children;
}

export default OwnerRoute;
