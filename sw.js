// Service Worker 版本号，更新时修改这个值
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `countdown-cache-${CACHE_VERSION}`;

// 需要缓存的资源列表
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 安装事件：缓存资源
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 缓存资源');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        // 跳过等待，立即激活
        return self.skipWaiting();
      })
  );
});

// 激活事件：清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] 删除旧缓存:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // 立即控制所有页面
        return self.clients.claim();
      })
  );
});

// 请求拦截：优先使用缓存，网络失败时回退到缓存
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // 网络优先策略
    fetch(event.request)
      .then((response) => {
        // 如果网络请求成功，更新缓存
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // 网络失败，尝试从缓存获取
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // 如果是导航请求，返回首页
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response('离线状态，资源不可用', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});
