/**
 * Service Worker for SaviEduTech PWA
 * 
 * Features:
 * - Offline caching
 * - Background sync
 * - Push notification handling
 * - Cache strategies for different resource types
 */

const CACHE_NAME = 'saviedutech-v1';
const STATIC_CACHE = 'saviedutech-static-v1';
const DYNAMIC_CACHE = 'saviedutech-dynamic-v1';
const API_CACHE = 'saviedutech-api-v1';

const STATIC_ASSETS = [
    '/',
    '/login',
    '/dashboard',
    '/manifest.json',
];

self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => {
                    return key !== STATIC_CACHE && 
                           key !== DYNAMIC_CACHE && 
                           key !== API_CACHE;
                }).map((key) => {
                    console.log('[SW] Removing old cache:', key);
                    return caches.delete(key);
                })
            );
        })
    );
    
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET') {
        return;
    }

    if (url.origin !== location.origin) {
        return;
    }

    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request, API_CACHE));
        return;
    }

    if (url.pathname.includes('.') || url.pathname.startsWith('/_next/static/')) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    if (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/admin')) {
        event.respondWith(networkFirst(request, DYNAMIC_CACHE));
        return;
    }

    event.respondWith(cacheFirst(request, STATIC_CACHE));
});

async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
        return response;
    } catch (error) {
        console.log('[SW] Cache first failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
        return response;
    } catch (error) {
        console.log('[SW] Network first failed, trying cache:', error);
        const cached = await caches.match(request);
        
        if (cached) {
            return cached;
        }
        
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    
    const options = {
        body: data.body || 'New notification from SaviEduTech',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
            dateOfArrival: Date.now(),
        },
        actions: [
            { action: 'view', title: 'View' },
            { action: 'close', title: 'Close' },
        ],
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'SaviEduTech', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'view' || !event.action) {
        const url = event.notification.data?.url || '/';
        event.waitUntil(
            clients.openWindow(url)
        );
    }
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((keys) => {
                return Promise.all(keys.map((key) => caches.delete(key)));
            })
        );
    }
});
