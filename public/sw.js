// Simple service worker for PWA functionality
const CACHE_NAME = 'speaknote-v1'
const urlsToCache = ['/', '/src/main.tsx', '/src/style.css', '/manifest.json']

self.addEventListener('install', function (event) {
  // Skip waiting to activate immediately
  self.skipWaiting()

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(urlsToCache)
      })
      .catch(function (error) {
        console.log('Cache install failed:', error)
      })
  )
})

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      // Return cached version or fetch from network
      return response || fetch(event.request)
    })
  )
})

self.addEventListener('activate', function (event) {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})
