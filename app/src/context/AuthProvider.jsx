import { useEffect, useState } from 'react';
import AuthContext from './AuthContext.jsx';
import {
  clearAuthToken,
  getAuthToken,
  getCurrentUser,
  login as loginRequest,
  setAuthToken,
} from '../services/authService.js';

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restoreUser = async () => {
      if (!getAuthToken()) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();

        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        clearAuthToken();

        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    restoreUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (credentials) => {
    const result = await loginRequest(credentials);
    setAuthToken(result.token);
    setUser(result.user);
    return result.user;
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
