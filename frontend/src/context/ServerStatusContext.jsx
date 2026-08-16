import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiGet } from '../lib/apiClient';

const ServerStatusContext = createContext({
  backendStatus: 'checking', // checking, online, offline
  aiLayerStatus: 'checking',
  isOnline: false,
});

export const useServerStatus = () => useContext(ServerStatusContext);

export const ServerStatusProvider = ({ children }) => {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [aiLayerStatus, setAiLayerStatus] = useState('checking');

  useEffect(() => {
    let mounted = true;

    const checkRootHealth = async () => {
      try {
        const res = await apiGet('/api/health');
        if (!mounted) return;

        if (res && res.data && res.data.status === 'ok') {
          setBackendStatus(res.data.backend || 'online');
          setAiLayerStatus(res.data.aiLayer || 'offline');
        } else {
          setBackendStatus('offline');
          setAiLayerStatus('offline');
        }
      } catch (err) {
        if (!mounted) return;
        setBackendStatus('offline');
        setAiLayerStatus('offline');
      }
    };

    checkRootHealth();
    
    // Poll every 15 seconds to keep Render awake while the site is open
    const interval = setInterval(checkRootHealth, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const isOnline = backendStatus === 'online' && aiLayerStatus === 'online';

  return (
    <ServerStatusContext.Provider value={{ backendStatus, aiLayerStatus, isOnline }}>
      {children}
    </ServerStatusContext.Provider>
  );
};
