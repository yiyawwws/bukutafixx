import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    // Timeout 5 detik agar tidak hang kalau backend mati
    const timeoutId = setTimeout(() => setLoading(false), 5000);
    try {
      const data = await authService.getMe();
      if (data.success) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user (backend mungkin belum jalan):', error.message);
      setUser(null);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    if (data.success) {
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error(e);
      // still clean up locally
      localStorage.removeItem('token');
    }
    setUser(null);
  };

  const switchRole = async (role) => {
    try {
      setLoading(true);
      const res = await authService.switchRole(role);
      if (res.success) {
        setUser(res.user);
      }
      return res;
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-surface-50)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '3rem', height: '3rem', border: '3px solid #E4E6EB', borderTopColor: '#1877F2', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: '#65676B', fontSize: '0.875rem' }}>Memuat Bukuta...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, fetchUser, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};
