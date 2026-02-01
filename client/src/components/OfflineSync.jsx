import { useState, useEffect } from 'react';
import { 
  CloudArrowUpIcon, 
  WifiIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import syncQueue from '../utils/sync-queue';
import offlineStorage from '../utils/offline-storage';

export default function OfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({ status: 'idle', progress: 0 });
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Initialize offline storage
    offlineStorage.init();

    // Start auto-sync
    syncQueue.startAutoSync(30000); // Sync every 30 seconds

    // Update pending count
    updatePendingCount();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue.syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync status updates
    const unsubscribe = syncQueue.addListener((status) => {
      setSyncStatus(status);
      if (status.status === 'complete') {
        updatePendingCount();
      }
    });

    // Update pending count every 10 seconds
    const interval = setInterval(updatePendingCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      syncQueue.stopAutoSync();
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const updatePendingCount = async () => {
    const count = await offlineStorage.getPendingSalesCount();
    setPendingCount(count);
  };

  const handleManualSync = () => {
    syncQueue.syncNow();
  };

  if (!isOnline && pendingCount === 0) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
          <p className="text-sm text-yellow-700">
            <strong>Offline Mode:</strong> You're offline. Sales will be queued and synced when connection is restored.
          </p>
        </div>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CloudArrowUpIcon className="h-5 w-5 text-blue-400 mr-2" />
            <div>
              <p className="text-sm text-blue-700">
                <strong>{pendingCount} sale{pendingCount > 1 ? 's' : ''} pending sync</strong>
              </p>
              {syncStatus.status === 'syncing' && (
                <div className="mt-1">
                  <div className="w-48 bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${syncStatus.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Syncing... {syncStatus.synced || 0}/{pendingCount}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOnline && (
              <button
                onClick={handleManualSync}
                disabled={syncStatus.status === 'syncing'}
                className={`flex items-center gap-1 px-3 py-1 text-sm rounded ${
                  syncStatus.status === 'syncing'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <ArrowPathIcon className={`h-4 w-4 ${syncStatus.status === 'syncing' ? 'animate-spin' : ''}`} />
                Sync Now
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (syncStatus.status === 'complete' && syncStatus.synced > 0) {
    return (
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
        <div className="flex items-center">
          <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
          <p className="text-sm text-green-700">
            <strong>Sync Complete:</strong> {syncStatus.synced} sale{syncStatus.synced > 1 ? 's' : ''} synced successfully
          </p>
        </div>
      </div>
    );
  }

  return null;
}
