const CACHE_NAME = "africa-ai-shell-v1";
const APP_SHELL = ["/", "/style.css", "/script.js", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("africa-ai-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/__/auth/")) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok && (request.mode === "navigate" || APP_SHELL.includes(url.pathname))) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") {
        return new Response("AFRICA AI nécessite une connexion Internet pour utiliser ses fonctions d'intelligence artificielle.", {headers: {"Content-Type": "text/plain; charset=utf-8"}});
      }
      throw error;
    }
  })());
});
