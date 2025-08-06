const CACHE_NAME = 'boardroom-booking-v1';
const OFFLINE_URL = '/offline.html';

// Resources to cache immediately
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  // Add critical CSS and JS files here when available
];

// API endpoints that should be cached
const CACHE_API_PATTERNS = [
  /\/api\/boardrooms/,
  /\/api\/users\/profile/,
  /\/api\/bookings\/my/,
];

// API endpoints that should always be fresh (not cached)
const NETWORK_FIRST_PATTERNS = [
  /\/api\/auth/,
  /\/api\/bookings\/create/,
  /\/api\/bookings\/update/,
  /\/api\/bookings\/cancel/,
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static resources:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Ensure the new service worker takes control immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests with different caching strategies
  if (url.pathname.startsWith('/api/')) {
    // API requests
    event.respondWith(handleAPIRequest(request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
    // Static assets - cache first with fallback to network
    event.respondWith(handleStaticAssets(request));
  } else {
    // HTML pages - network first with cache fallback
    event.respondWith(handlePageRequests(request));
  }
});

// Handle API requests with intelligent caching
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Always try network first for critical endpoints
    if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      return await fetchAndCache(request);
    }
    
    // For cacheable API endpoints, try cache first, then network
    if (CACHE_API_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // Return cached response and update in background
        fetchAndCache(request).catch(console.error);
        return cachedResponse;
      }
    }
    
    // Default: network first
    return await fetchAndCache(request);
  } catch (error) {
    console.warn('[SW] API request failed:', error);
    
    // Try to return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for failed requests
    return new Response(
      JSON.stringify({ 
        error: 'Offline - Please check your connection',
        offline: true 
      }), 
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets (images, CSS, JS)
async function handleStaticAssets(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Static asset request failed:', error);
    return new Response('Asset unavailable offline', { status: 404 });
  }
}

// Handle page requests (HTML)
async function handlePageRequests(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful page responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Page request failed:', error);
    
    // Try cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    const offlineResponse = await caches.match(OFFLINE_URL);
    return offlineResponse || new Response('Offline - Page not available', { status: 503 });
  }
}

// Utility function to fetch and cache responses
async function fetchAndCache(request) {
  const response = await fetch(request);
  
  if (response.ok && request.method === 'GET') {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  
  return response;
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-booking-sync') {
    event.waitUntil(syncOfflineBookings());
  }
});

// Sync offline bookings when connection is restored
async function syncOfflineBookings() {
  try {
    console.log('[SW] Syncing offline bookings...');
    
    // Get offline bookings from IndexedDB or cache
    // This would integrate with your offline storage implementation
    const offlineBookings = await getOfflineBookings();
    
    for (const booking of offlineBookings) {
      try {
        await fetch('/api/bookings/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(booking)
        });
        
        // Remove from offline storage after successful sync
        await removeOfflineBooking(booking.id);
      } catch (error) {
        console.error('[SW] Failed to sync booking:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Placeholder functions for offline storage (to be implemented with IndexedDB)
async function getOfflineBookings() {
  // Implementation would use IndexedDB to get stored offline bookings
  return [];
}

async function removeOfflineBooking(id) {
  // Implementation would remove booking from IndexedDB
  console.log('[SW] Remove offline booking:', id);
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'You have a booking reminder!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'booking-reminder',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Booking',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ]
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || options.body;
      options.title = data.title || 'Boardroom Booking';
      options.tag = data.tag || options.tag;
    } catch (error) {
      console.error('[SW] Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('Boardroom Booking', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app to the relevant page
    event.waitUntil(
      clients.openWindow('/my-bookings')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification (already done above)
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for communication with the main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service worker loaded');