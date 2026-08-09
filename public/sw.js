// SpeakNote の Service Worker
//
// 方針:
//   - ページ本体(ナビゲーション)はネットワーク優先。キャッシュ優先にすると
//     デプロイしても古い index.html が配られ続け、そこが参照する旧ハッシュの
//     JS は既に存在しないため起動に失敗する。
//   - /assets 配下はファイル名にハッシュが付き、内容が変わればURLも変わるので
//     キャッシュ優先で安全。取得したものは実行時にキャッシュへ入れる。
//   - CACHE_NAME を変えると activate 時に古いキャッシュを破棄する。
//     配信するファイルの構成を変えたときは版を上げること。
const CACHE_NAME = 'speaknote-v2'

// ナビゲーションがオフラインで失敗したときに見せるページ
const OFFLINE_FALLBACK = '/index.html'

self.addEventListener('install', (event) => {
  // 新しい Service Worker を待機させず即座に有効化する
  self.skipWaiting()

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_FALLBACK))
      .catch((error) => {
        // オフライン用の控えが取れなくても通常の動作には影響しない
        console.log('Offline fallback cache failed:', error)
      })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        )
      )
      // 既に開いているタブにも新しい Service Worker を適用する
      .then(() => self.clients.claim())
  )
})

const isCacheableAsset = (request) => {
  if (request.method !== 'GET') return false
  const url = new URL(request.url)
  return url.origin === self.location.origin && url.pathname.startsWith('/assets/')
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  // ページ本体はネットワーク優先。失敗したときだけ控えを返す
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_FALLBACK).then((cached) => cached || Response.error())
      )
    )
    return
  }

  if (!isCacheableAsset(request)) {
    // それ以外(翻訳API、辞書CDN、Firebase など)には介入しない
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
    })
  )
})
