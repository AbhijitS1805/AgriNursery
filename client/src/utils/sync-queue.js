// Sync queue manager for offline → online synchronization
import offlineStorage from './offline-storage';
import api from './api';

class SyncQueue {
  constructor() {
    this.syncing = false;
    this.syncInterval = null;
    this.listeners = [];
  }

  // Start auto-sync when online
  startAutoSync(intervalMs = 30000) {
    console.log('[SyncQueue] Starting auto-sync with interval:', intervalMs);
    
    // Initial sync if online
    if (navigator.onLine) {
      this.syncNow();
    }

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.syncing) {
        this.syncNow();
      }
    }, intervalMs);

    // Listen for online event
    window.addEventListener('online', () => {
      console.log('[SyncQueue] Network restored - triggering sync');
      this.syncNow();
    });

    // Listen for offline event
    window.addEventListener('offline', () => {
      console.log('[SyncQueue] Network lost - pausing sync');
    });
  }

  // Stop auto-sync
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[SyncQueue] Auto-sync stopped');
    }
  }

  // Manually trigger sync
  async syncNow() {
    if (this.syncing) {
      console.log('[SyncQueue] Sync already in progress');
      return { success: false, message: 'Sync in progress' };
    }

    if (!navigator.onLine) {
      console.log('[SyncQueue] Cannot sync - offline');
      return { success: false, message: 'Device is offline' };
    }

    this.syncing = true;
    this.notifyListeners({ status: 'syncing', progress: 0 });

    try {
      const pendingSales = await offlineStorage.getPendingSales();
      const totalSales = pendingSales.length;

      console.log(`[SyncQueue] Syncing ${totalSales} pending sales`);

      if (totalSales === 0) {
        this.syncing = false;
        this.notifyListeners({ status: 'idle', progress: 100 });
        return { success: true, message: 'No pending sales', synced: 0 };
      }

      let syncedCount = 0;
      let failedCount = 0;
      const errors = [];

      for (let i = 0; i < pendingSales.length; i++) {
        const sale = pendingSales[i];
        const progress = Math.round(((i + 1) / totalSales) * 100);

        try {
          console.log(`[SyncQueue] Syncing sale ${i + 1}/${totalSales}:`, sale.id);
          
          // Send to server
          const response = await api.post('/sales', sale.data);

          if (response.data) {
            // Delete from offline storage
            await offlineStorage.deleteSyncedSale(sale.id);
            syncedCount++;
            console.log(`[SyncQueue] Successfully synced sale:`, sale.id);
          } else {
            failedCount++;
            errors.push({ id: sale.id, error: 'Invalid response' });
          }
        } catch (error) {
          console.error(`[SyncQueue] Failed to sync sale:`, sale.id, error);
          failedCount++;
          errors.push({ id: sale.id, error: error.message });
        }

        this.notifyListeners({ status: 'syncing', progress, synced: syncedCount, failed: failedCount });
      }

      this.syncing = false;
      this.notifyListeners({ 
        status: 'complete', 
        progress: 100, 
        synced: syncedCount, 
        failed: failedCount 
      });

      console.log(`[SyncQueue] Sync complete: ${syncedCount} synced, ${failedCount} failed`);

      return {
        success: true,
        synced: syncedCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('[SyncQueue] Sync error:', error);
      this.syncing = false;
      this.notifyListeners({ status: 'error', error: error.message });
      return { success: false, message: error.message };
    }
  }

  // Add listener for sync status updates
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify all listeners
  notifyListeners(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[SyncQueue] Listener error:', error);
      }
    });
  }

  // Get sync status
  getStatus() {
    return {
      syncing: this.syncing,
      online: navigator.onLine
    };
  }

  // Check for pending sales
  async hasPendingSales() {
    const count = await offlineStorage.getPendingSalesCount();
    return count > 0;
  }

  // Get pending sales count
  async getPendingCount() {
    return await offlineStorage.getPendingSalesCount();
  }

  // Trigger service worker sync (if available)
  async triggerBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-offline-sales');
        console.log('[SyncQueue] Background sync registered');
        return true;
      } catch (error) {
        console.error('[SyncQueue] Background sync failed:', error);
        return false;
      }
    }
    return false;
  }
}

// Export singleton instance
const syncQueue = new SyncQueue();
export default syncQueue;
