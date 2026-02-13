const INDEXNOW_CONFIG = {
  host: 'erogram.pro',
  key: 'f8f91525268a439b8ae6ce03d362f9bc',
  keyLocation: 'https://erogram.pro/f8f91525268a439b8ae6ce03d362f9bc.txt',
};

export async function submitToIndexNow(urls: string[]) {
  if (!urls || urls.length === 0) return;

  const data = {
    host: INDEXNOW_CONFIG.host,
    key: INDEXNOW_CONFIG.key,
    keyLocation: INDEXNOW_CONFIG.keyLocation,
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
      console.log('✅ Submitted to IndexNow:', urls);
    } else {
      console.error('❌ Failed to submit to IndexNow:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ Error submitting to IndexNow:', error);
  }
}