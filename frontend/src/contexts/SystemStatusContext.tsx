import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface SystemStatusContextType {
  isSystemActive: boolean;
  lastUpdate: Date;
  updateStatus: (status: boolean) => void;
}

const SystemStatusContext = createContext<SystemStatusContextType | undefined>(undefined);

// Custom hook to access system status context
export const useSystemStatus = () => {
  const context = useContext(SystemStatusContext);
  if (!context) {
    throw new Error('useSystemStatus must be used within a SystemStatusProvider');
  }
  return context;
};

interface SystemStatusProviderProps {
  children: ReactNode;
}

export const SystemStatusProvider: React.FC<SystemStatusProviderProps> = ({ children }) => {
  const [isSystemActive, setIsSystemActive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Periodically updates system status every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const isActive = Math.random() > 0.001; // Simulates system status
      setIsSystemActive(isActive);
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Updates lastUpdate timestamp when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setLastUpdate(new Date());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Allows manual update of system status
  const updateStatus = (status: boolean) => {
    setIsSystemActive(status);
    setLastUpdate(new Date());
  };

  const value: SystemStatusContextType = {
    isSystemActive,
    lastUpdate,
    updateStatus,
  };

  return (
    <SystemStatusContext.Provider value={value}>
      {children}
    </SystemStatusContext.Provider>
  );
};