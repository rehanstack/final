import React from 'react';
import { useServerStatus } from '../context/ServerStatusContext';
import { Server, Brain, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DebugMenu() {
  const { backendStatus, aiLayerStatus, isOnline } = useServerStatus();

  const getStatusColor = (status) => {
    if (status === 'online') return 'bg-green-500';
    if (status === 'checking') return 'bg-yellow-500 animate-pulse';
    return 'bg-red-500';
  };

  const getStatusText = (status) => {
    if (status === 'online') return 'Online';
    if (status === 'checking') return 'Waking...';
    return 'Offline';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
    >
      {!isOnline && (
        <div className="bg-dark-800/90 backdrop-blur-md border border-red-500/30 p-3 rounded-lg shadow-xl mb-2 max-w-xs">
          <p className="text-xs text-red-400 font-medium">
            Servers are asleep or unreachable. Render free instances take ~50 seconds to wake up. Please wait...
          </p>
        </div>
      )}
      
      <div className="bg-dark-800/80 backdrop-blur-md border border-dark-600 p-3 rounded-xl shadow-2xl flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-dark-400" />
          <span className="text-xs text-dark-300 font-medium">Node.js</span>
          <div className={`w-2 h-2 rounded-full ${getStatusColor(backendStatus)}`} />
        </div>
        
        <div className="w-px h-4 bg-dark-600"></div>
        
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-dark-400" />
          <span className="text-xs text-dark-300 font-medium">AI Layer</span>
          <div className={`w-2 h-2 rounded-full ${getStatusColor(aiLayerStatus)}`} />
        </div>
      </div>
    </motion.div>
  );
}
