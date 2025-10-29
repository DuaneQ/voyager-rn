#!/usr/bin/env node
/*
  Start Metro dev server for native (Expo/RN), wait for the iOS bundle to be ready,
  then run the mobile WDIO tests, and finally stop Metro.

  Usage: from repo root
    - npm run test:mobile:ios:headed:metro
      or from automation dir
    - NODE_ENV=test node ./scripts/run-ios-e2e.js

  Env vars (optional):
    METRO_PORT=8081 (default)
    WAIT_TIMEOUT_MS=120000 (default)
    HEADLESS=false|true (forwarded to WDIO)
    IOS_APP_PATH=path/to/app.app (forwarded to WDIO config resolution)
*/

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const repoRoot = path.resolve(__dirname, '..', '..');
const automationDir = path.resolve(__dirname, '..');
let METRO_PORT = process.env.METRO_PORT || '8081';
const WAIT_TIMEOUT_MS = process.env.WAIT_TIMEOUT_MS ? Number(process.env.WAIT_TIMEOUT_MS) : 120000;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk.toString()));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('timeout'));
    });
  });
}

async function waitForMetroReady(port, timeoutMs) {
  const start = Date.now();
  const base = `http://localhost:${port}`;
  while (Date.now() - start < timeoutMs) {
    try {
      // Probe bundle directly; /status may not be exposed in some Expo/Metro versions.
      const bundle = await get(`${base}/index.bundle?platform=ios&dev=true&minify=false`);
      const ct = (bundle.headers && bundle.headers['content-type']) || '';
      if (bundle.status === 200 && typeof bundle.body === 'string' && (ct.includes('javascript') || bundle.body.length > 100)) return;
    } catch (_) {
      // ignore and retry
    }
    await sleep(1500);
  }
  throw new Error(`Timed out waiting for Metro on ${base}`);
}

function startMetro(port) {
  // Prefer Expo CLI since this project uses Expo modules; ensure dev-client mode for native apps
  console.log(`Starting Metro via Expo: npx expo start --dev-client --port ${port}`);
  const child = spawn('npx', ['expo', 'start', '--dev-client', '--port', String(port)], {
    cwd: repoRoot,
    // CI=1 makes expo non-interactive; also pass RCT_METRO_PORT for RN
    env: Object.assign({}, process.env, { CI: '1', RCT_METRO_PORT: String(port) }),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (d) => process.stdout.write(`[metro] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[metro] ${d}`));

  child.on('exit', (code, signal) => {
    console.log(`Metro process exited code=${code} signal=${signal}`);
  });

  return child;
}

async function run() {
  // If an instance is already running on 8081, prefer to reuse it.
  let metro;
  try {
    await waitForMetroReady(METRO_PORT, 3000);
    console.log(`Detected existing Metro on ${METRO_PORT}; reusing.`);
  } catch (_) {
    metro = startMetro(METRO_PORT);
  }
  try {
    console.log(`Waiting for Metro to be ready on port ${METRO_PORT} (timeout=${WAIT_TIMEOUT_MS}ms)`);
    try {
      await waitForMetroReady(METRO_PORT, WAIT_TIMEOUT_MS);
    } catch (e) {
      // If expo refused to start due to port conflict, try next port.
      const fallback = String(Number(METRO_PORT) + 1);
      console.log(`Primary port ${METRO_PORT} failed; retrying on ${fallback}`);
      METRO_PORT = fallback;
      if (metro) { try { metro.kill('SIGINT'); } catch (_) {} }
      metro = startMetro(METRO_PORT);
      await waitForMetroReady(METRO_PORT, WAIT_TIMEOUT_MS);
    }
    console.log('Metro is ready; starting WDIO iOS run');

    await new Promise((resolve, reject) => {
      const wdio = spawn('npx', ['wdio', 'run', 'wdio.mobile.conf.ts'], {
        cwd: automationDir,
        // Pass chosen METRO_PORT so WDIO can inject it via capabilities
        env: Object.assign({}, process.env, { PLATFORM: 'ios', METRO_PORT: String(METRO_PORT), RCT_METRO_PORT: String(METRO_PORT), CI: '1' }),
        stdio: 'inherit'
      });
      wdio.on('exit', (code) => {
        if (code === 0) resolve(0);
        else reject(new Error('WDIO failed with code ' + code));
      });
      wdio.on('error', (err) => reject(err));
    });

    console.log('WDIO finished successfully');
    try { if (metro) metro.kill('SIGINT'); } catch (_) {}
    process.exit(0);
  } catch (err) {
    console.error('E2E run failed:', err && err.message ? err.message : err);
    try { if (metro) metro.kill('SIGINT'); } catch (_) {}
    process.exit(1);
  }
}

run();
