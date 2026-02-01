// Service Worker for Offline POS Capability
const CACHE_VERSION = 'agri-nursery-v1';
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(CACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - network first, fallback to cache for offline
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests - network first strategy
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response for caching
          const responseToCache = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline message
            return new Response(
              JSON.stringify({ error: 'Offline - data not available in cache' }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            );
          });
        })
    );
    return;
  }

  // Static assets - cache first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        // Clone and cache
        const responseToCache = response.clone();
        caches.open(CACHE_VERSION).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      });
    })
  );
});

// Background sync for offline sales
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sync-offline-sales') {
    event.waitUntil(
      syncOfflineSales().catch((error) => {
        console.error('[SW] Sync failed:', error);
      })
    );
  }
});

// Message handler for manual sync triggers
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_NOW') {
    console.log('[SW] Manual sync triggered');
    syncOfflineSales().then(() => {
      event.ports[0].postMessage({ success: true });
    }).catch((error) => {
      event.ports[0].postMessage({ success: false, error: error.message });
    });
  }
});

// Sync offline sales function
async function syncOfflineSales() {
  console.log('[SW] Starting offline sales sync...');
  
  // Open IndexedDB
  const db = await openDatabase();
  const transaction = db.transaction(['offline_sales'], 'readonly');
  const store = transaction.objectStore('offline_sales');
  const pendingSales = await getAllFromStore(store);

  console.log(`[SW] Found ${pendingSales.length} pending sales to sync`);

  for (const sale of pendingSales) {
    try {
      // Send to server
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sale.data)
      });

      if (response.ok) {
        // Delete from IndexedDB on success
        const deleteTransaction = db.transaction(['offline_sales'], 'readwrite');
        const deleteStore = deleteTransaction.objectStore('offline_sales');
        await deleteStore.delete(sale.id);
        console.log('[SW] Synced sale:', sale.id);
      } else {
        console.error('[SW] Failed to sync sale:', sale.id, response.status);
      }
    } catch (error) {
      console.error('[SW] Error syncing sale:', sale.id, error);
      // Keep in queue for next sync attempt
    }
  }

  console.log('[SW] Sync complete');
}

// IndexedDB helper functions
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AgriNurseryOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline_sales')) {
        db.createObjectStore('offline_sales', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
