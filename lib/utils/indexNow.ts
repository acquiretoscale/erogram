const INDEXNOW_KEY = 'f8f91525268a439b8ae6ce03d362f9bc';
const INDEXNOW_HOST = 'erogram.pro';
const SITEMAP_URL = `https://${INDEXNOW_HOST}/sitemap.xml`;

/**
 * Ping Google to re-fetch the sitemap (free, no auth required).
 */
async function pingGoogleSitemap() {
  try {
    const res = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`);
    if (res.ok) {
      console.log('[SEO] Google sitemap ping OK');
    } else {
      console.error('[SEO] Google sitemap ping failed:', res.status);
    }
  } catch (err) {
    console.error('[SEO] Google sitemap ping error:', err);
  }
}

/**
 * Submit a single URL to IndexNow (Bing + Yandex + Naver).
 * Also pings Google's sitemap endpoint so it re-crawls faster.
 */
export async function pingIndexNow(url: string) {
  if (!url) return;

  const engines = [
    { name: 'Bing', endpoint: `https://www.bing.com/indexnow?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}` },
    { name: 'Yandex', endpoint: `https://yandex.com/indexnow?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}` },
    { name: 'Naver', endpoint: `https://searchadvisor.naver.com/indexnow?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}` },
  ];

  const results = await Promise.allSettled([
    ...engines.map(async ({ name, endpoint }) => {
      const res = await fetch(endpoint, { method: 'GET' });
      if (res.ok || res.status === 202) {
        console.log(`[SEO] IndexNow ${name} pinged:`, url);
      } else {
        console.error(`[SEO] IndexNow ${name} failed:`, res.status, url);
      }
    }),
    pingGoogleSitemap(),
  ]);

  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length) {
    console.error(`[SEO] ${failures.length} ping(s) errored`);
  }
}

/**
 * Batch submit (kept for scripts / bulk operations only).
 */
export async function submitToIndexNow(urls: string[]) {
  if (!urls || urls.length === 0) return;

  const data = {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  const engines = [
    { name: 'Bing', url: 'https://www.bing.com/indexnow' },
    { name: 'Yandex', url: 'https://yandex.com/indexnow' },
  ];

  await Promise.allSettled([
    ...engines.map(async ({ name, url }) => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          console.log(`[SEO] IndexNow batch ${name}:`, urls.length, 'URLs');
        } else {
          console.error(`[SEO] IndexNow batch ${name} failed:`, res.status);
        }
      } catch (error) {
        console.error(`[SEO] IndexNow batch ${name} error:`, error);
      }
    }),
    pingGoogleSitemap(),
  ]);
}
