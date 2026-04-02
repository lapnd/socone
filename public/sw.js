/**
 * Service Worker — soc.one static clone
 * Intercepts requests to static.wixstatic.com and serves local copies
 * when the CDN returns 403 (Referer restriction on static GitHub Pages host).
 *
 * Strategy: extract the Wix media image ID from the URL and find the
 * best locally-cached variant.
 */

const CACHE = 'soc-v2';

// Map: wixstatic image ID  →  best local path (largest/highest quality variant)
const IMAGE_MAP = {
  '11062b_952485dce28e4eac9e9f09d63fdc9ada~mv2.jpg': '/assets/static.wixstatic.com/media/11062b_952485dce28e4eac9e9f09d63fdc9ada~mv2.jpg/v1/fill/w_1440,h_820,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/11062b_952485dce28e4eac9e9f09d63fdc9ada~mv2.jpg',
  '11062b_d8c8c150557a41fb986c6162f2556939~mv2.jpg': '/assets/static.wixstatic.com/media/11062b_d8c8c150557a41fb986c6162f2556939~mv2.jpg/v1/fill/w_1440,h_900,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/11062b_d8c8c150557a41fb986c6162f2556939~mv2.jpg',
  '6e2266_1b304e45d25d4cfaa8c46a2e4372b4d3~mv2.png': '/assets/static.wixstatic.com/media/6e2266_1b304e45d25d4cfaa8c46a2e4372b4d3~mv2.png/v1/fill/w_153,h_60,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/SoCone-logo.png',
  '6e2266_4894833edcff4a299b21116f827dadee~mv2.png': '/assets/static.wixstatic.com/media/6e2266_4894833edcff4a299b21116f827dadee~mv2.png/v1/fill/w_200,h_200,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Intel-logo.png',
  '6e2266_63e41ae4f5664badb9dd942b78577bc5~mv2.jpg': '/assets/static.wixstatic.com/media/6e2266_63e41ae4f5664badb9dd942b78577bc5~mv2.jpg/v1/fill/w_653,h_510,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/6e2266_63e41ae4f5664badb9dd942b78577bc5~mv2.jpg',
  '6e2266_dd1fff16d59f4e139a81f3167fae799a~mv2.png': '/assets/static.wixstatic.com/media/6e2266_dd1fff16d59f4e139a81f3167fae799a~mv2.png/v1/fill/w_200,h_200,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Siemens-logo.png',
  'nsplsh_0457e3c639c7437c8efd6e5ef2ff72f3~mv2.jpg': '/assets/static.wixstatic.com/media/nsplsh_0457e3c639c7437c8efd6e5ef2ff72f3~mv2.jpg/v1/fill/w_327,h_511,al_l,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/nsplsh_0457e3c639c7437c8efd6e5ef2ff72f3~mv2.jpg',
  'nsplsh_180cb9475d35470e81293861b8bb812d~mv2.jpg': '/assets/static.wixstatic.com/media/nsplsh_180cb9475d35470e81293861b8bb812d~mv2.jpg/v1/fill/w_651,h_366,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/Image%20by%20Mike%20Kononov.jpg',
  'nsplsh_65a10343f15b4c11921de392829bc419~mv2.jpg': '/assets/static.wixstatic.com/media/nsplsh_65a10343f15b4c11921de392829bc419~mv2.jpg/v1/fill/w_652,h_436,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/Image%20by%20Joshua%20Sortino.jpg',
  'nsplsh_c08fce552b05491baba77381fe7f365f~mv2.jpg': '/assets/static.wixstatic.com/media/nsplsh_c08fce552b05491baba77381fe7f365f~mv2.jpg/v1/fill/w_1440,h_754,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/nsplsh_c08fce552b05491baba77381fe7f365f~mv2.jpg',
};

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Only intercept wixstatic.com image requests
  if (!url.includes('static.wixstatic.com/media/')) return;

  event.respondWith(handleImage(event.request, url));
});

async function handleImage(request, url) {
  // 1. Try exact cache hit first
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  // 2. Try fetching from CDN
  try {
    const resp = await fetch(request);
    if (resp.ok) {
      cache.put(request, resp.clone());
      return resp;
    }
    // CDN returned 403 or other error — fall through to local lookup
  } catch (_) {}

  // 3. Extract image ID and look up local file
  const mediaMatch = url.match(/\/media\/([^\/]+~mv2\.[a-z]+)/i);
  if (mediaMatch) {
    const imgId = mediaMatch[1];
    if (IMAGE_MAP[imgId]) {
      const localResp = await fetch(IMAGE_MAP[imgId]);
      if (localResp.ok) {
        cache.put(request, localResp.clone());
        return localResp;
      }
    }
  }

  return new Response('', { status: 404 });
}
