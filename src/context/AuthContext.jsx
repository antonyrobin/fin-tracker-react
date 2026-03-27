import { createContext, useContext, useState, useEffect } from 'react';
import { getUserById } from '../db/database';

const AuthContext = createContext(null);

const SESSION_KEY = 'fintracker_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const { userId } = JSON.parse(stored);
        const userData = await getUserById(userId);
        if (userData) {
          setUser(userData);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }

  function login(userData) {
    setUser(userData);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: userData.id }));
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
