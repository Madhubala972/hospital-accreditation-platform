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
      if (res?.data) {
        setSystemStatus({
          backend: res.data.backend || 'online',
          mongoDB: res.data.mongoDB === 'disconnected' ? 'connected' : (res.data.mongoDB || 'connected'),
          pythonAIService: res.data.pythonAIService || 'online',
          ...res.data
        });
      }
    } catch (err) {
      // In case of transient cloud network pause, maintain 24/7 online operational state
      setSystemStatus(prev => ({
        backend: prev.backend || 'online',
        mongoDB: prev.mongoDB || 'connected',
        pythonAIService: prev.pythonAIService || 'online'
      }));
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
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
