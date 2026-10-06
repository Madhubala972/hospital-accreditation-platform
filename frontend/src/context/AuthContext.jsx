import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hospital_user_info');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      name: 'Dean Dr. Arthur Vance',
      email: 'dean@hospital.org',
      role: 'Dean',
      department: 'Hospital-Wide',
      approvalStatus: 'APPROVED'
    };
  });
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = async () => {
    if (user?.role === 'Dean' || user?.role === 'Admin') {
      try {
        const res = await authApi.getPendingUsers();
        setPendingCount(res.data.count || 0);
      } catch (e) {
        // Ignore if unauthenticated
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('hospital_auth_token');
    if (token) {
      authApi.getMe()
        .then(res => {
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('hospital_user_info', JSON.stringify(res.data.user));
          }
        })
        .catch(() => {
          // Token expired or invalid
        });
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
  }, [user]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const res = await authApi.login({ email, password });
      if (res.data?.token) {
        localStorage.setItem('hospital_auth_token', res.data.token);
        localStorage.setItem('hospital_user_info', JSON.stringify(res.data.user));
        setUser(res.data.user);
        return { success: true, user: res.data.user };
      }
      return { success: false, message: 'Invalid response from server' };
    } catch (err) {
      const respData = err.response?.data;
      return { 
        success: false, 
        status: respData?.status || 'ERROR',
        message: respData?.message || err.message,
        isWaitingApproval: respData?.status === 'WAITING_APPROVAL'
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const res = await authApi.register(userData);
      return { 
        success: true, 
        approvalStatus: res.data.approvalStatus,
        message: res.data.message,
        user: res.data.user
      };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || err.message 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem('hospital_auth_token');
    localStorage.removeItem('hospital_user_info');
    setUser(null);
  };

  const switchUserDirect = (newUser) => {
    setUser(newUser);
    localStorage.setItem('hospital_user_info', JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser, 
      login, 
      register, 
      logout, 
      switchUserDirect,
      loading, 
      pendingCount, 
      refreshPendingCount: fetchPendingCount 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

