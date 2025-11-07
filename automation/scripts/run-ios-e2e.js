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
// Give Metro more time to initialize on CI/machines that are slower
const WAIT_TIMEOUT_MS = process.env.WAIT_TIMEOUT_MS ? Number(process.env.WAIT_TIMEOUT_MS) : 300000;
// How many incremental ports to try before failing (8081..8081+MAX_PORT_TRIES-1)
const MAX_PORT_TRIES = 10;

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

  // Create logs directory for easier debugging in CI
  const logsDir = path.resolve(repoRoot, 'automation', 'logs');
  try { require('fs').mkdirSync(logsDir, { recursive: true }); } catch (_) {}
  const outLog = path.resolve(logsDir, `metro-${port}.out.log`);
  const errLog = path.resolve(logsDir, `metro-${port}.err.log`);

  // Only set CI=1 if the environment already requires it (preserve interactive behavior locally)
  const metroEnv = Object.assign({}, process.env, { RCT_METRO_PORT: String(port) });
  if (process.env.CI) metroEnv.CI = '1';

  const child = spawn('npx', ['expo', 'start', '--dev-client', '--port', String(port)], {
    cwd: repoRoot,
    env: metroEnv,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const fs = require('fs');
  const outStream = fs.createWriteStream(outLog, { flags: 'a' });
  const errStream = fs.createWriteStream(errLog, { flags: 'a' });

  child.stdout.on('data', (d) => {
    process.stdout.write(`[metro:${port}] ${d}`);
    outStream.write(d);
  });
  child.stderr.on('data', (d) => {
    process.stderr.write(`[metro:${port}][ERR] ${d}`);
    errStream.write(d);
  });

  child.on('exit', (code, signal) => {
    console.log(`Metro process (port ${port}) exited code=${code} signal=${signal}. See ${outLog} ${errLog}`);
    try { outStream.end(); errStream.end(); } catch (_) {}
  });

  return child;
}

async function run() {
  // If an instance is already running on 8081, prefer to reuse it.
  let metro;
  // Try existing metro first (fast probe), otherwise attempt to start metro on a sequence of ports
  let foundExisting = false;
  try {
    await waitForMetroReady(METRO_PORT, 3000);
    console.log(`Detected existing Metro on ${METRO_PORT}; reusing.`);
    foundExisting = true;
  } catch (_) {
    // try to start metro on a range of ports
  }

  if (!foundExisting) {
    let started = false;
    const basePort = Number(METRO_PORT);
    for (let i = 0; i < MAX_PORT_TRIES; i++) {
      const tryPort = String(basePort + i);
      console.log(`Attempting to start Metro on port ${tryPort} (attempt ${i + 1}/${MAX_PORT_TRIES})`);
      metro = startMetro(tryPort);
      try {
        await waitForMetroReady(tryPort, WAIT_TIMEOUT_MS);
        METRO_PORT = tryPort;
        started = true;
        break;
      } catch (e) {
        console.log(`Port ${tryPort} failed: ${e && e.message ? e.message : e}`);
        try { if (metro) metro.kill('SIGINT'); } catch (_) {}
        // continue to next port
      }
    }
    if (!started) throw new Error(`Timed out waiting for Metro on ports ${METRO_PORT}..${String(Number(METRO_PORT) + MAX_PORT_TRIES - 1)}`);
  }
  
  console.log(`Metro is ready; starting WDIO iOS run (METRO_PORT=${METRO_PORT})`);
  try {
    await new Promise((resolve, reject) => {
      const wdioEnv = Object.assign({}, process.env, { PLATFORM: 'ios', METRO_PORT: String(METRO_PORT), RCT_METRO_PORT: String(METRO_PORT) });
      if (process.env.CI) wdioEnv.CI = '1';

      const wdio = spawn('npx', ['wdio', 'run', 'wdio.mobile.conf.ts'], {
        cwd: automationDir,
        // Pass chosen METRO_PORT so WDIO can inject it via capabilities
        env: wdioEnv,
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
