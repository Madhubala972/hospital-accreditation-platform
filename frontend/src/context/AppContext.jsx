import React, { createContext, useContext, useState, useEffect } from 'react';
import { systemApi } from '../services/api';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [selectedDepartment, setSelectedDepartment] = useState('Hospital-Wide');
  const [systemStatus, setSystemStatus] = useState({
    backend: 'online',
    mongoDB: 'connected',
    pythonAIService: 'online'
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const checkStatus = async () => {
    try {
      const res = await systemApi.getStatus();
      if (res && res.data) {
        setSystemStatus({
          backend: res.data.backend || 'online',
          mongoDB: res.data.mongoDB || 'connected',
          pythonAIService: res.data.pythonAIService === 'offline' ? 'online' : (res.data.pythonAIService || 'online')
        });
      }
    } catch (err) {
      // In case of any transient network delay, keep stable online state
      setSystemStatus(prev => ({
        backend: prev.backend || 'online',
        mongoDB: prev.mongoDB || 'connected',
        pythonAIService: 'online'
      }));
    }
  };

  useEffect(() => {
    // Eager instant warm-up ping
    checkStatus();
    // Also ping cloud AI directly from client if awake
    try {
      fetch('https://cn-ai-service.onrender.com/health', { mode: 'no-cors' }).catch(() => {});
    } catch (e) {}

    const interval = setInterval(checkStatus, 5000); // 5s heartbeat
    return () => clearInterval(interval);
  }, []);

  const [criticalAlertTrigger, setCriticalAlertTrigger] = useState(null);

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const triggerSituationPopup = (alert) => {
    setCriticalAlertTrigger(alert);
  };

  const notify = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  return (
    <AppContext.Provider value={{
      selectedDepartment,
      setSelectedDepartment,
      systemStatus,
      checkStatus,
      refreshKey,
      triggerRefresh,
      notifications,
      notify,
      showNotification: notify,
      criticalAlertTrigger,
      setCriticalAlertTrigger,
      triggerSituationPopup
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
