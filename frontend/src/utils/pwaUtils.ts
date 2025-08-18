import { toast } from 'react-toastify';

// IndexedDB setup for offline storage
const DB_NAME = 'BoardroomBookingDB';
const DB_VERSION = 1;
const STORES = {
  OFFLINE_BOOKINGS: 'offlineBookings',
  CACHED_BOARDROOMS: 'cachedBoardrooms',
  CACHED_USERS: 'cachedUsers',
  SYNC_QUEUE: 'syncQueue'
};

interface OfflineBooking {
  id: string;
  boardroom: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: any[];
  notes?: string;
  createdAt: string;
  synced: boolean;
}

interface SyncQueueItem {
  id: string;
  type: 'CREATE_BOOKING' | 'UPDATE_BOOKING' | 'CANCEL_BOOKING';
  data: any;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  createdAt: string;
  retries: number;
}

class PWAStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains(STORES.OFFLINE_BOOKINGS)) {
          const bookingStore = db.createObjectStore(STORES.OFFLINE_BOOKINGS, { keyPath: 'id' });
          bookingStore.createIndex('synced', 'synced', { unique: false });
          bookingStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.CACHED_BOARDROOMS)) {
          db.createObjectStore(STORES.CACHED_BOARDROOMS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.CACHED_USERS)) {
          db.createObjectStore(STORES.CACHED_USERS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  private async executeTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Offline booking operations
  async saveOfflineBooking(booking: Omit<OfflineBooking, 'id' | 'createdAt' | 'synced'>): Promise<string> {
    const offlineBooking: OfflineBooking = {
      ...booking,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      synced: false
    };

    await this.executeTransaction(
      STORES.OFFLINE_BOOKINGS,
      'readwrite',
      (store) => store.add(offlineBooking)
    );

    // Add to sync queue
    await this.addToSyncQueue({
      type: 'CREATE_BOOKING',
      data: offlineBooking,
      endpoint: '/api/bookings/create',
      method: 'POST'
    });

    return offlineBooking.id;
  }

  async getOfflineBookings(): Promise<OfflineBooking[]> {
    return this.executeTransaction(
      STORES.OFFLINE_BOOKINGS,
      'readonly',
      (store) => store.getAll()
    );
  }

  async getUnsyncedBookings(): Promise<OfflineBooking[]> {
    const allBookings = await this.executeTransaction(
      STORES.OFFLINE_BOOKINGS,
      'readonly',
      (store) => store.getAll()
    );
    
    // Filter for unsynced bookings in memory to avoid IndexedDB key issues
    return allBookings.filter(booking => booking.synced === false);
  }

  async markBookingAsSynced(id: string): Promise<void> {
    const booking = await this.executeTransaction(
      STORES.OFFLINE_BOOKINGS,
      'readwrite',
      (store) => store.get(id)
    );

    if (booking) {
      booking.synced = true;
      await this.executeTransaction(
        STORES.OFFLINE_BOOKINGS,
        'readwrite',
        (store) => store.put(booking)
      );
    }
  }

  async deleteOfflineBooking(id: string): Promise<void> {
    await this.executeTransaction(
      STORES.OFFLINE_BOOKINGS,
      'readwrite',
      (store) => store.delete(id)
    );
  }

  // Sync queue operations
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries'>): Promise<void> {
    const queueItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      retries: 0
    };

    await this.executeTransaction(
      STORES.SYNC_QUEUE,
      'readwrite',
      (store) => store.add(queueItem)
    );
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return this.executeTransaction(
      STORES.SYNC_QUEUE,
      'readonly',
      (store) => store.getAll()
    );
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    await this.executeTransaction(
      STORES.SYNC_QUEUE,
      'readwrite',
      (store) => store.delete(id)
    );
  }

  async incrementSyncRetries(id: string): Promise<void> {
    const item = await this.executeTransaction(
      STORES.SYNC_QUEUE,
      'readwrite',
      (store) => store.get(id)
    );

    if (item) {
      item.retries += 1;
      await this.executeTransaction(
        STORES.SYNC_QUEUE,
        'readwrite',
        (store) => store.put(item)
      );
    }
  }

  // Cache operations
  async cacheBoardrooms(boardrooms: any[]): Promise<void> {
    const transaction = this.db!.transaction([STORES.CACHED_BOARDROOMS], 'readwrite');
    const store = transaction.objectStore(STORES.CACHED_BOARDROOMS);

    for (const boardroom of boardrooms) {
      store.put(boardroom);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getCachedBoardrooms(): Promise<any[]> {
    return this.executeTransaction(
      STORES.CACHED_BOARDROOMS,
      'readonly',
      (store) => store.getAll()
    );
  }

  // Utility method to clear all data if corruption is detected
  async clearAllData(): Promise<void> {
    if (!this.db) return;
    
    const stores = [STORES.OFFLINE_BOOKINGS, STORES.CACHED_BOARDROOMS, STORES.CACHED_USERS, STORES.SYNC_QUEUE];
    const transaction = this.db.transaction(stores, 'readwrite');
    
    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      store.clear();
    }
    
    await new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(undefined);
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Global instance
export const pwaStorage = new PWAStorage();

// Initialize storage
pwaStorage.init().catch(error => {
  // Use console.error here since logger might not be available during initialization
  console.error('PWA Storage initialization failed:', error);
});

// PWA Installation utilities
export const pwaInstallation = {
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', registration);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is installed and ready
                toast.info('App update available! Click to refresh.', {
                  onClick: () => {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  },
                  autoClose: false
                });
              }
            });
          }
        });

        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
      }
    }
    return null;
  },

  async unregisterServiceWorker(): Promise<boolean> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const result = await registration.unregister();
          console.log('Service Worker unregistered:', result);
          return result;
        }
      } catch (error) {
        console.error('Service Worker unregistration failed:', error);
      }
    }
    return false;
  }
};

// Background sync utilities
export const backgroundSync = {
  async requestSync(tag: string): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(tag);
        console.log('Background sync registered:', tag);
      } catch (error) {
        console.error('Background sync registration failed:', error);
        // Fallback: try to sync immediately
        await this.syncNow();
      }
    } else {
      // Fallback: try to sync immediately
      await this.syncNow();
    }
  },

  async syncNow(): Promise<void> {
    console.log('Attempting immediate sync...');
    
    try {
      const syncQueue = await pwaStorage.getSyncQueue();
      
      for (const item of syncQueue) {
        if (item.retries >= 3) {
          console.log('Max retries reached for sync item:', item.id);
          continue;
        }

        try {
          const response = await fetch(item.endpoint, {
            method: item.method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item.data)
          });

          if (response.ok) {
            await pwaStorage.removeSyncQueueItem(item.id);
            
            if (item.type === 'CREATE_BOOKING') {
              await pwaStorage.markBookingAsSynced(item.data.id);
            }
            
            console.log('Synced item:', item.id);
          } else {
            await pwaStorage.incrementSyncRetries(item.id);
            console.error('Sync failed for item:', item.id, response.status);
          }
        } catch (error) {
          await pwaStorage.incrementSyncRetries(item.id);
          console.error('Sync error for item:', item.id, error);
        }
      }
    } catch (error) {
      console.error('Sync process failed:', error);
    }
  }
};

// Notification utilities
export const pwaNotifications = {
  async requestPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission;
    }
    return 'denied';
  },

  async showNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      const permission = await this.requestPermission();
      
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          ...options
        });
      }
    }
  },

  async scheduleBookingReminder(bookingId: string, reminderTime: Date): Promise<void> {
    const now = new Date().getTime();
    const reminderTimeMs = reminderTime.getTime();
    const delay = reminderTimeMs - now;

    if (delay > 0) {
      setTimeout(async () => {
        await this.showNotification('Booking Reminder', {
          body: 'You have a boardroom booking coming up!',
          tag: `booking-reminder-${bookingId}`,
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: 'View Booking'
            }
          ]
        });
      }, delay);
    }
  }
};

export default {
  pwaStorage,
  pwaInstallation,
  backgroundSync,
  pwaNotifications
};