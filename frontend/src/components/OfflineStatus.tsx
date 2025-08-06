import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { backgroundSync, pwaStorage } from '../utils/pwaUtils';

interface OfflineStatusProps {
  className?: string;
}

const OfflineStatus: React.FC<OfflineStatusProps> = ({ className = '' }) => {
  const { isOnline, isUpdateAvailable, updateApp } = usePWA();
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const checkUnsyncedItems = async () => {
      try {
        const unsyncedBookings = await pwaStorage.getUnsyncedBookings();
        const syncQueue = await pwaStorage.getSyncQueue();
        setUnsyncedCount(unsyncedBookings.length + syncQueue.length);
      } catch (error) {
        console.error('Error checking unsynced items:', error);
      }
    };

    checkUnsyncedItems();
    
    // Check every 30 seconds
    const interval = setInterval(checkUnsyncedItems, 30000);
    
    return () => clearInterval(interval);
  }, [isOnline]);

  const handleRetrySync = async () => {
    setIsRetrying(true);
    try {
      await backgroundSync.syncNow();
      
      // Recheck unsynced count
      const unsyncedBookings = await pwaStorage.getUnsyncedBookings();
      const syncQueue = await pwaStorage.getSyncQueue();
      setUnsyncedCount(unsyncedBookings.length + syncQueue.length);
    } catch (error) {
      console.error('Retry sync failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  // Don't show anything if online and no pending items
  if (isOnline && unsyncedCount === 0 && !isUpdateAvailable) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm ${className}`}>
      {/* Update Available Banner */}
      {isUpdateAvailable && (
        <div className="mb-2 bg-green-500 text-white p-3 rounded-lg shadow-lg animate-slide-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm font-medium">App Update Available</span>
            </div>
            <button
              onClick={updateApp}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs font-medium transition-colors"
            >
              Update
            </button>
          </div>
        </div>
      )}

      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="mb-2 bg-orange-500 text-white p-3 rounded-lg shadow-lg animate-slide-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">You're offline</span>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-orange-200 hover:text-white transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
          </div>
          
          {showDetails && (
            <div className="mt-2 text-xs text-orange-100">
              <p>• You can still view cached data</p>
              <p>• New bookings will sync when online</p>
              <p>• Limited functionality available</p>
            </div>
          )}
        </div>
      )}

      {/* Unsynced Items Banner */}
      {unsyncedCount > 0 && (
        <div className={`p-3 rounded-lg shadow-lg animate-slide-in ${
          isOnline 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-600 text-gray-100'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CloudOff className="w-4 h-4" />
              <span className="text-sm font-medium">
                {unsyncedCount} item{unsyncedCount !== 1 ? 's' : ''} pending sync
              </span>
            </div>
            
            {isOnline && (
              <button
                onClick={handleRetrySync}
                disabled={isRetrying}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  isOnline
                    ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
                    : 'bg-gray-500 cursor-not-allowed'
                }`}
              >
                {isRetrying ? (
                  <div className="flex items-center space-x-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Syncing...</span>
                  </div>
                ) : (
                  'Retry Sync'
                )}
              </button>
            )}
          </div>
          
          {showDetails && (
            <div className="mt-2 text-xs">
              <p>Items will sync automatically when connection is restored.</p>
              {isOnline && (
                <p className="mt-1 text-blue-200">Click "Retry Sync" to sync now.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Online Confirmation (brief) */}
      {isOnline && unsyncedCount === 0 && (
        <div className="bg-green-500 text-white p-3 rounded-lg shadow-lg animate-slide-in">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Back online - All synced!</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Add CSS animation class
const styles = `
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

export default OfflineStatus;