import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  const checkAuth = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      setUser(response.data);
      setLastActivity(Date.now());
      return response.data;
    } catch (error) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const emailLogin = async (email, password) => {
    try {
      const response = await axios.post(
        `${API}/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      setUser(response.data.user);
      setLastActivity(Date.now());
      window.location.href = '/dashboard';
      return response.data.user;
    } catch (error) {
      console.error('Email login error:', error);
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      window.location.href = '/';
    }
  };

  const exchangeSession = async (sessionId) => {
    try {
      const response = await axios.post(
        `${API}/auth/session`,
        { session_id: sessionId },
        { withCredentials: true }
      );
      setUser(response.data.user);
      setLastActivity(Date.now());
      return response.data.user;
    } catch (error) {
      console.error('Session exchange error:', error);
      throw error;
    }
  };

  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Check for session timeout
  useEffect(() => {
    if (!user) return;

    const checkTimeout = () => {
      if (Date.now() - lastActivity > SESSION_TIMEOUT) {
        logout();
      }
    };

    const interval = setInterval(checkTimeout, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user, lastActivity]);

  // Initial auth check
  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  // Activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [updateActivity]);

  const value = {
    user,
    setUser,
    loading,
    login,
    emailLogin,
    logout,
    checkAuth,
    refreshUser: checkAuth,
    exchangeSession,
    updateActivity,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
