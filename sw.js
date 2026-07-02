/**
 * 核弹级清除 Service Worker
 * 功能：清除所有缓存 → 注销自身 → 永远消失
 * 一旦浏览器获取此 SW，旧的缓存锁死问题将被彻底终结
 */
'use strict';

// 立即清除所有缓存
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(name) {
        console.log('[SW-Cleanup] 清除缓存:', name);
        return caches.delete(name);
      }));
    }).then(function() {
      // 立即注销自身
      return self.registration.unregister();
    }).then(function() {
      console.log('[SW-Cleanup] ✅ 所有缓存已清除，SW 已永久注销');
    })
  );
  // 跳过等待，立即生效
  self.skipWaiting();
});

// 激活时再次清除并注销
self.addEventListener('activate', function(event) {
  event.waitUntil(
    self.registration.unregister().then(function() {
      console.log('[SW-Cleanup] SW 已从激活状态注销');
      return clients.claim();
    })
  );
});

// 不拦截任何请求（即使有残留）
self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});
