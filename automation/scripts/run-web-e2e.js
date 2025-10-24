#!/usr/bin/env node
/*
  Start Expo web server, wait for the app bundle to be available, run WDIO tests, then stop Expo.
  Usage: from /automation run `node ./scripts/run-web-e2e.js` or `npm run run:web-e2e`.
  Environment variables used:
    APP_URL (defaults to http://localhost:19006)
    WAIT_TIMEOUT_MS (optional, ms to wait for app readiness)
    PLATFORM (optional, set to 'web')
*/

const { spawn } = require('child_process');
const path = require('path');

const automationDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(automationDir, '..');
const APP_URL = process.env.APP_URL || 'http://localhost:19006';
const WAIT_TIMEOUT_MS = process.env.WAIT_TIMEOUT_MS ? Number(process.env.WAIT_TIMEOUT_MS) : 120000;

// Inline waitForApp implementation (avoid importing TypeScript file)
async function waitForAppInline(appUrl, timeoutMs = WAIT_TIMEOUT_MS) {
  const start = Date.now();
  const base = appUrl.replace(/\/$/, '');
  const bundleCandidates = [
    `${base}/node_modules/expo/AppEntry.bundle?platform=web&dev=true`,
    `${base}/node_modules/expo/AppEntry.bundle`,
    `${base}/index.bundle?platform=web&dev=true`,
  ];

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  while (Date.now() - start < timeoutMs) {
    try {
      const rootResp = await fetch(base, { method: 'GET' });
      if (rootResp.ok) {
        const text = await rootResp.text();
        if (text && text.length > 200) {
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
              // continue
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
    await sleep(1500);
  }
  throw new Error(`waitForAppInline: timed out waiting for ${appUrl}`);
}

function startExpo() {
  console.log('Starting Expo web server (npx expo start --web --port 19006)');
  const child = spawn('npx', ['expo', 'start', '--web', '--port', '19006', '--non-interactive'], {
    cwd: repoRoot,
    env: Object.assign({}, process.env),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (d) => process.stdout.write(`[expo] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[expo] ${d}`));

  child.on('exit', (code, signal) => {
    console.log(`Expo process exited with code=${code} signal=${signal}`);
  });

  return child;
}

async function run() {
  const expo = startExpo();

  try {
  console.log(`Waiting for app at ${APP_URL} (timeout=${WAIT_TIMEOUT_MS}ms)`);
  await waitForAppInline(APP_URL, WAIT_TIMEOUT_MS);
    console.log('App ready; starting WDIO runner');

    // spawn WDIO from automation dir
    await new Promise((resolve, reject) => {
      const wdio = spawn('npx', ['wdio', 'run', 'wdio.conf.ts'], {
        cwd: automationDir,
        env: Object.assign({}, process.env, { PLATFORM: process.env.PLATFORM || 'web', APP_URL }),
        stdio: 'inherit'
      });

      wdio.on('exit', (code) => {
        if (code === 0) resolve(0);
        else reject(new Error('WDIO failed with code ' + code));
      });
      wdio.on('error', (err) => reject(err));
    });

    console.log('WDIO finished successfully');
    // kill expo
    expo.kill('SIGINT');
    process.exit(0);
  } catch (err) {
    console.error('Error during run:', err && err.message ? err.message : err);
    try { expo.kill('SIGINT'); } catch (e) {}
    process.exit(1);
  }
}

run();
