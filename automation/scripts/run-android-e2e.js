#!/usr/bin/env node
/*
  Start Metro (Expo) on port 8081 for Android, ensure adb reverse to 8081,
  wait for readiness, then run WDIO Android tests. Clean up on exit.

  Rationale: Android Debug builds expect Metro on 8081 by default. Rather than
  juggling custom ports, we standardize on 8081 and set up adb reverse so the
  emulator/device can reach the host packager.

  Usage:
    - From repo root: npm run test:mobile:android:headed:metro

  Env:
    HEADLESS=true|false (forwarded to WDIO)
    WAIT_TIMEOUT_MS=120000 (optional)
*/

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const repoRoot = path.resolve(__dirname, '..', '..');
const automationDir = path.resolve(__dirname, '..');
let METRO_PORT = process.env.METRO_PORT || '8081'; // Prefer 8081; may fallback if busy
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
    req.setTimeout(5000, () => req.destroy(new Error('timeout')));
  });
}

async function waitForMetroReady(port, timeoutMs) {
  const start = Date.now();
  const base = `http://localhost:${port}`;
  while (Date.now() - start < timeoutMs) {
    try {
      // Try /status first (faster), then fall back to bundle fetch
      try {
        const status = await get(`${base}/status`);
        if (status && typeof status.body === 'string' && status.body.includes('packager-status:running')) return;
      } catch (_) {}
      const bundle = await get(`${base}/index.bundle?platform=android&dev=true&minify=false`);
      const ct = (bundle.headers && bundle.headers['content-type']) || '';
      if (bundle.status === 200 && typeof bundle.body === 'string' && (ct.includes('javascript') || bundle.body.length > 100)) return;
    } catch (_) {}
    await sleep(1500);
  }
  throw new Error(`Timed out waiting for Metro on ${base}`);
}

function startMetro(port) {
  console.log(`Starting Metro via Expo: npx expo start --dev-client --port ${port}`);
  const child = spawn('npx', ['expo', 'start', '--dev-client', '--port', String(port)], {
    cwd: repoRoot,
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

function resolveAndroidHome() {
  if (process.env.ANDROID_HOME) return process.env.ANDROID_HOME;
  if (process.env.ANDROID_SDK_ROOT) return process.env.ANDROID_SDK_ROOT;
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const candidates = [
    path.join(home, 'Library', 'Android', 'sdk'), // macOS default
    path.join(home, 'Android', 'Sdk'),            // Linux default
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch (_) {}
  }
  return undefined;
}

function withAndroidEnv(envIn = process.env) {
  const env = Object.assign({}, envIn);
  const ANDROID_HOME = resolveAndroidHome();
  if (ANDROID_HOME) {
    env.ANDROID_HOME = ANDROID_HOME;
    const plat = `${ANDROID_HOME}/platform-tools`;
    const tools = `${ANDROID_HOME}/emulator`;
    env.PATH = `${plat}:${tools}:${env.PATH}`;
  }
  return env;
}

function listAvds() {
  return new Promise((resolve) => {
    const env = withAndroidEnv();
    const p = spawn('emulator', ['-list-avds'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => (out += String(d)));
    p.on('error', () => resolve([]));
    p.on('exit', () => {
      const names = out
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      resolve(names);
    });
  });
}

async function chooseDefaultAvd() {
  // Prefer explicit env
  if (process.env.ANDROID_AVD_NAME && process.env.ANDROID_AVD_NAME.trim()) return process.env.ANDROID_AVD_NAME.trim();
  const avds = await listAvds();
  if (avds.includes('Pixel_9a')) return 'Pixel_9a';
  if (avds.length > 0) return avds[0];
  throw new Error('No Android AVDs found. Please create one in Android Studio (e.g., Pixel_9a) or set ANDROID_AVD_NAME.');
}

async function ensureEmulatorRunning(avdName, launchTimeoutMs = 180000, bootTimeoutMs = 180000) {
  const env = withAndroidEnv();
  // Check if any emulator is already running
  const anyDevice = await new Promise((resolve) => {
    const adb = spawn('adb', ['devices'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    adb.stdout.on('data', (d) => (out += String(d)));
    adb.on('error', () => resolve(false));
    adb.on('exit', () => {
      const hasEmu = out.split(/\r?\n/).some((l) => /emulator-\d+\s+device/.test(l));
      resolve(hasEmu);
    });
  });
  if (!anyDevice) {
    console.log(`No running emulator detected. Launching AVD '${avdName}'...`);
    const emu = spawn('emulator', ['-avd', avdName, '-netdelay', 'none', '-netspeed', 'full', '-no-snapshot'], {
      env,
      stdio: ['ignore', 'ignore', 'inherit']
    });
    // Don't await exit; proceed to wait for boot
    // Give the emulator time to register with adb
    const start = Date.now();
    let booted = false;
    while (Date.now() - start < launchTimeoutMs) {
      // Wait for any emulator to appear as a device
      const appeared = await new Promise((resolve) => {
        const adb = spawn('adb', ['wait-for-device'], { env, stdio: ['ignore', 'ignore', 'ignore'] });
        adb.on('error', () => resolve(false));
        adb.on('exit', () => resolve(true));
      });
      if (appeared) break;
      await sleep(1500);
    }
    // Now poll for boot completed
    const bootStart = Date.now();
    while (Date.now() - bootStart < bootTimeoutMs) {
      const ok = await new Promise((resolve) => {
        const adb = spawn('adb', ['shell', 'getprop', 'sys.boot_completed'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        adb.stdout.on('data', (d) => (out += String(d)));
        adb.on('error', () => resolve(false));
        adb.on('exit', () => resolve(out.trim() === '1'));
      });
      if (ok) { booted = true; break; }
      await sleep(2000);
    }
    if (!booted) throw new Error(`Emulator '${avdName}' failed to boot within ${bootTimeoutMs}ms`);
  } else {
    console.log('Detected running Android emulator.');
  }
}

async function ensureAdbReverse(localPort, remotePort) {
  const env = withAndroidEnv();
  return new Promise((resolve) => {
    const adb = spawn('adb', ['reverse', `tcp:${localPort}`, `tcp:${remotePort}`], { stdio: ['ignore', 'pipe', 'pipe'], env });
    adb.on('exit', () => resolve());
    adb.on('error', () => resolve()); // ignore if adb not available
  });
}

async function ensureApkBuilt() {
  const apkPath = path.resolve(repoRoot, 'android/app/build/outputs/apk/debug/app-debug.apk');
  if (fs.existsSync(apkPath)) return;
  console.log('APK not found; building debug APK via Gradle');
  await new Promise((resolve, reject) => {
    const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    const p = spawn(gradlew, ['assembleDebug'], {
      cwd: path.resolve(repoRoot, 'android'),
      env: Object.assign({}, process.env),
      stdio: 'inherit'
    });
    p.on('exit', (code) => (code === 0 ? resolve(0) : reject(new Error('Gradle assembleDebug failed'))));
    p.on('error', (err) => reject(err));
  });
}

async function run() {
  let metro;
  try {
    // Prefer to reuse an existing Metro on METRO_PORT
    await waitForMetroReady(METRO_PORT, 3000);
    console.log(`Detected existing Metro on ${METRO_PORT}; reusing.`);
  } catch (_) {
    // If primary port is busy but not serving Metro, fall back to next port
    metro = startMetro(METRO_PORT);
  }

  try {
    console.log(`Waiting for Metro on ${METRO_PORT} (timeout=${WAIT_TIMEOUT_MS}ms)`);
    try {
      await waitForMetroReady(METRO_PORT, WAIT_TIMEOUT_MS);
    } catch (probeErr) {
      // Try a fallback port if Expo refused to start due to port conflict
      const fallbackPort = String(Number(METRO_PORT) + 1);
      console.warn(`Primary port ${METRO_PORT} not ready: ${probeErr?.message || probeErr}. Trying fallback port ${fallbackPort}...`);
      if (metro) { try { metro.kill('SIGINT'); } catch (_) {} }
      METRO_PORT = fallbackPort;
      metro = startMetro(METRO_PORT);
      await waitForMetroReady(METRO_PORT, WAIT_TIMEOUT_MS);
    }

    console.log(`Configuring adb reverse device:tcp:8081 -> host:tcp:${METRO_PORT}`);
    await ensureAdbReverse('8081', METRO_PORT);

    await ensureApkBuilt();

    // Ensure an emulator is available and booted before starting WDIO
    let avdToUse;
    try {
      avdToUse = await chooseDefaultAvd();
    } catch (e) {
      console.error(e.message);
      throw e;
    }
    const avdLaunchTimeout = Number(process.env.ANDROID_AVD_LAUNCH_TIMEOUT || 180000);
    const avdReadyTimeout = Number(process.env.ANDROID_AVD_READY_TIMEOUT || 180000);
    await ensureEmulatorRunning(avdToUse, avdLaunchTimeout, avdReadyTimeout);

    console.log('Starting WDIO Android run');
    await new Promise((resolve, reject) => {
      const childEnv = withAndroidEnv();
      // Inform WDIO/Appium of the AVD and timeouts (it can attach to the running emulator)
      childEnv.ANDROID_AVD_NAME = avdToUse;
      if (!childEnv.ANDROID_AVD_LAUNCH_TIMEOUT) childEnv.ANDROID_AVD_LAUNCH_TIMEOUT = String(avdLaunchTimeout);
      if (!childEnv.ANDROID_AVD_READY_TIMEOUT) childEnv.ANDROID_AVD_READY_TIMEOUT = String(avdReadyTimeout);
      const wdio = spawn('npx', ['wdio', 'run', 'wdio.mobile.conf.ts'], {
        cwd: automationDir,
        env: Object.assign({}, childEnv, { PLATFORM: 'android', METRO_PORT: String(METRO_PORT), CI: '1' }),
        stdio: 'inherit'
      });
      wdio.on('exit', (code) => (code === 0 ? resolve(0) : reject(new Error('WDIO failed with code ' + code))));
      wdio.on('error', (err) => reject(err));
    });

    console.log('WDIO finished successfully');
    try { if (metro) metro.kill('SIGINT'); } catch (_) {}
    process.exit(0);
  } catch (err) {
    console.error('Android E2E run failed:', err && err.message ? err.message : err);
    try { if (metro) metro.kill('SIGINT'); } catch (_) {}
    process.exit(1);
  }
}

run();
