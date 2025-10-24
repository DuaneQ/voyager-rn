import fetch from 'node-fetch';

const DEFAULT_TIMEOUT = 120000; // 2 minutes
const POLL_INTERVAL = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUrl(url: string) {
  // remove trailing slash
  return url.replace(/\/$/, '');
}

export async function waitForApp(appUrl: string, timeoutMs = DEFAULT_TIMEOUT): Promise<void> {
  const start = Date.now();
  if (!appUrl) throw new Error('waitForApp: appUrl is required');
  const base = normalizeUrl(appUrl);

  // common expo RN web bundle path (may vary) - try a couple of likely bundle endpoints
  const bundleCandidates = [
    `${base}/node_modules/expo/AppEntry.bundle?platform=web&dev=true`,
    `${base}/node_modules/expo/AppEntry.bundle`,
    `${base}/index.bundle?platform=web&dev=true`,
  ];

  // Poll until either root HTML responds with 200 and non-empty body OR a bundle endpoint returns JS
  while (Date.now() - start < timeoutMs) {
    try {
      // 1) check root
      const rootResp = await fetch(base, { method: 'GET' });
      if (rootResp.ok) {
        const text = await rootResp.text();
        if (text && text.length > 200) {
          // reasonable HTML served; still verify bundle
          // check bundles
          for (const b of bundleCandidates) {
            try {
              const br = await fetch(b, { method: 'GET' });
              if (br.ok) {
                const ct = br.headers.get('content-type') || '';
                if (ct.includes('javascript') || ct.includes('application/x-javascript') || ct.includes('application/javascript') || ct.includes('text/javascript')) {
                  return;
                }
              }
            } catch (e) {
              // ignore and continue
            }
          }
          // if no bundle OK yet, still continue polling
        }
      }
    } catch (err) {
      // ignore network errors and retry
    }

    await sleep(POLL_INTERVAL);
  }

  throw new Error(`waitForApp: timed out waiting for app at ${appUrl} after ${timeoutMs}ms`);
}

export default waitForApp;
