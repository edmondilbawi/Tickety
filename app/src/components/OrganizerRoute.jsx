import { Navigate } from 'react-router-dom';
import LoadingMessage from './LoadingMessage.jsx';
import useAuth from '../context/useAuth.js';

function OrganizerRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingMessage message="Loading account..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'organizer') {
    return <Navigate to="/events" replace />;
  }

  return children;
}

export default OrganizerRoute;
