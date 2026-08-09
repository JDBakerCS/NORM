import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('normToken')));

  useEffect(() => {
    const clearSession = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('norm:session-expired', clearSession);
    const token = localStorage.getItem('normToken');
    if (token) {
      api
        .get('/auth/me')
        .then(({ data }) => setUser(data.user))
        .catch(clearSession)
        .finally(() => setLoading(false));
    }
    return () => window.removeEventListener('norm:session-expired', clearSession);
  }, []);

  const finishAuthentication = ({ user: nextUser, token }) => {
    localStorage.setItem('normToken', token);
    setUser(nextUser);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(credentials) {
        const { data } = await api.post('/auth/login', credentials);
        finishAuthentication(data);
      },
      async register(details) {
        const { data } = await api.post('/auth/register', details);
        finishAuthentication(data);
      },
      logout() {
        localStorage.removeItem('normToken');
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
