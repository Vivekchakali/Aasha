import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, logoutUser } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('asha_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const login = async (username, password) => {
    try {
      setIsLoading(true);
      setAuthError('');
      const res = await apiLogin(username, password);
      setUser(res.user);
      localStorage.setItem('asha_user', JSON.stringify(res.user));
      if (res.token) {
        localStorage.setItem('asha_token', res.token);
      }
      return res.user;
    } catch (err) {
      const msg = err.message || 'Login failed. Please verify your credentials.';
      setAuthError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutUser().catch(() => {});
    } finally {
      setUser(null);
      localStorage.removeItem('asha_user');
      localStorage.removeItem('asha_token');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: Boolean(user),
      login, 
      logout, 
      authError,
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
