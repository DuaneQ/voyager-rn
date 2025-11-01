# E2E (iOS) — Local and CI guide

This document explains how to reliably run the iOS E2E (WDIO/Appium) tests locally and in CI.

Recommended local workflow (fast iteration)

1. Install deps once:

```bash
npm ci
```

2. Build & install the Expo development client onto the simulator (run once, or when native code changes):

```bash
npx expo run:ios
```

This creates a development build (dev-client) that WDIO can exercise. Keep the simulator app installed between runs.

3. Start Metro in a dedicated terminal:

```bash
npx expo start --dev-client --port 8081
```

4. In another terminal, run WDIO tests:

```bash
cd automation
npx wdio run wdio.mobile.conf.ts
```

Or use the convenience npm scripts from repo root:

```bash
# local (does not force CI mode)
npm run e2e:ios:local

# CI (forces non-interactive mode)
npm run e2e:ios:ci
```

Troubleshooting tips

- If Metro fails to bind to port 8081, try a different port or free the port:

```bash
lsof -i :8081
kill -9 <PID>
```

- If Metro exits immediately, inspect `automation/logs/metro-<port>.out.log` and `automation/logs/metro-<port>.err.log` for the full Expo/Metro output.
- Keep Metro running between WDIO runs to avoid re-spawning delays.

CI notes / sample workflow

- CI runners need macOS to run iOS simulators.
- Install Node 18+, CocoaPods, and Xcode command line tools on the runner.
- Set `CI=true` in the environment for non-interactive execution (the provided `e2e:ios:ci` script does this).
- Cache node modules to speed up runs.
- Make sure your CI has permissions and resources to run the iOS Simulator and the Expo build process.

Files created by the run script

- `automation/logs/metro-<port>.out.log` and `automation/logs/metro-<port>.err.log` — Metro logs useful for CI debugging.

If you want, I can also add a helper script that starts Metro, opens the simulator, and tails logs in a single terminal for developer convenience.