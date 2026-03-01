const INDEXNOW_KEY = 'f8f91525268a439b8ae6ce03d362f9bc';
const INDEXNOW_HOST = 'erogram.pro';

/**
 * Submit a single URL to IndexNow (streaming mode).
 * Preferred by Bing over batch submissions — call this each time a page changes.
 */
export async function pingIndexNow(url: string) {
  if (!url) return;
  try {
    const endpoint = `https://www.bing.com/indexnow?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}`;
    const res = await fetch(endpoint, { method: 'GET' });
    if (res.ok || res.status === 202) {
      console.log('IndexNow pinged:', url);
    } else {
      console.error('IndexNow ping failed:', res.status, url);
    }
  } catch (err) {
    console.error('IndexNow ping error:', err);
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

  try {
    const response = await fetch('https://www.bing.com/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      console.log('IndexNow batch submitted:', urls.length, 'URLs');
    } else {
      console.error('IndexNow batch failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('IndexNow batch error:', error);
  }
}