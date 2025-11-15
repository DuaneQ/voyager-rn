# Scripts Guide - TravalPass React Native

Comprehensive guide to all npm scripts for development, testing, and CI/CD pipelines.

## 📱 App Launch Scripts

### Local Development

```bash
# Start Expo dev server (choose platform interactively)
npm start

# Launch on iOS simulator
npm run start:ios

# Launch on Android emulator
npm run start:android

# Launch in web browser
npm run start:web
```

**When to use:**
- `npm start` - Best for development (hot reload, choose platform)
- `npm run start:ios` - Direct iOS simulator launch
- `npm run start:android` - Direct Android emulator launch
- `npm run start:web` - Test web compatibility

---

## 🧪 Unit Tests (Jest)

```bash
# Run all unit tests once
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

**Test Location:** `src/__tests__/**/*.test.ts(x)`

**Pipeline Usage:**
```yaml
# Example: GitHub Actions / GitLab CI
- name: Run Unit Tests
  run: npm test -- --ci --coverage --maxWorkers=2
```

---

## 🤖 E2E Tests - iOS

### Headed (Visible Simulator)

```bash
# Single run - with visible simulator
npm run e2e:ios

# 3 consecutive runs - stability validation
npm run e2e:ios:3x
```

**Use Cases:**
- Debugging test failures (see what happens)
- Recording test execution videos
- Developing new test scenarios

### Headless (CI/CD)

```bash
# Single run - headless mode
npm run e2e:ios:headless

# 3 consecutive runs - headless
npm run e2e:ios:headless:3x
```

**Pipeline Usage:**
```yaml
- name: Run iOS E2E Tests
  run: npm run e2e:ios:headless
  
- name: Validate iOS Stability (3x)
  run: npm run e2e:ios:headless:3x
```

---

## 🤖 E2E Tests - Android

### Headed (Visible Emulator)

```bash
# Single run - with visible emulator
npm run e2e:android

# 3 consecutive runs - stability validation
npm run e2e:android:3x
```

**Requirements:**
- Android emulator running (default: `Pixel_9a`)
- Or set `ANDROID_AVD_NAME=YourAVD` environment variable

### Headless (CI/CD)

```bash
# Single run - headless mode
npm run e2e:android:headless

# 3 consecutive runs - headless
npm run e2e:android:headless:3x
```

**Pipeline Usage:**
```yaml
- name: Setup Android SDK
  uses: android-actions/setup-android@v2
  
- name: Run Android E2E Tests
  run: npm run e2e:android:headless
  
- name: Validate Android Stability (3x)
  run: npm run e2e:android:headless:3x
```

---

## 🚀 CI/CD Ready Scripts

### Run All E2E Tests (Both Platforms)

```bash
# Sequential: iOS → Android (headless)
npm run e2e:all:headless

# Stability validation: 3x each platform (headless)
npm run e2e:all:headless:3x
```

**Pipeline Example - Full Test Suite:**
```yaml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: macos-latest  # Required for iOS simulator
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Run Unit Tests
        run: npm test -- --ci --coverage
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
      
      - name: Setup iOS Simulator
        run: |
          xcrun simctl boot "iPhone 15" || true
      
      - name: Run E2E Tests (Both Platforms)
        run: npm run e2e:all:headless
      
      - name: Validate Stability (3x runs)
        run: npm run e2e:all:headless:3x
      
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            coverage/
            automation/logs/
```

---

## 📊 Script Reference Table

| Script | Description | Headless? | 3x Validation? | CI/CD Ready? |
|--------|-------------|-----------|----------------|--------------|
| `npm test` | Unit tests | N/A | ❌ | ✅ |
| `npm run test:watch` | Unit tests (watch mode) | N/A | ❌ | ❌ |
| `npm run e2e:ios` | iOS E2E - headed | ❌ | ❌ | ❌ |
| `npm run e2e:ios:headless` | iOS E2E - headless | ✅ | ❌ | ✅ |
| `npm run e2e:ios:3x` | iOS E2E - headed (3x) | ❌ | ✅ | ❌ |
| `npm run e2e:ios:headless:3x` | iOS E2E - headless (3x) | ✅ | ✅ | ✅ |
| `npm run e2e:android` | Android E2E - headed | ❌ | ❌ | ❌ |
| `npm run e2e:android:headless` | Android E2E - headless | ✅ | ❌ | ✅ |
| `npm run e2e:android:3x` | Android E2E - headed (3x) | ❌ | ✅ | ❌ |
| `npm run e2e:android:headless:3x` | Android E2E - headless (3x) | ✅ | ✅ | ✅ |
| `npm run e2e:all:headless` | Both platforms - headless | ✅ | ❌ | ✅ |
| `npm run e2e:all:headless:3x` | Both platforms - headless (3x) | ✅ | ✅ | ✅ |

---

## 🔧 Environment Variables

### E2E Test Configuration

```bash
# Metro bundler port (auto-fallback if busy)
METRO_PORT=8081  # Default, auto-increments if unavailable

# Platform selection
PLATFORM=ios     # or 'android'

# Headless mode (no visible UI)
HEADLESS=true    # or omit for headed mode

# Android emulator selection
ANDROID_AVD_NAME=Pixel_9a  # Default AVD

# Android SDK location (auto-detected on macOS)
ANDROID_HOME=/Users/$(whoami)/Library/Android/sdk
```

### Example: Custom Configuration

```bash
# Use specific Android emulator, headless mode
ANDROID_AVD_NAME=Pixel_8_API_34 HEADLESS=true npm run e2e:android

# Use specific Metro port
METRO_PORT=8082 npm run e2e:ios
```

---

## 📝 Test Development Workflow

### 1. Local Development (Headed)

```bash
# Start with visible UI to see what's happening
npm run e2e:ios
# or
npm run e2e:android
```

### 2. Validate Stability (3x runs)

```bash
# After tests pass once, validate non-flakiness
npm run e2e:ios:3x
npm run e2e:android:3x
```

### 3. Pre-Commit Validation (Headless)

```bash
# Run all tests in CI mode before pushing
npm test
npm run e2e:all:headless
```

### 4. CI/CD Pipeline (Full Suite)

```bash
# What runs in GitHub Actions / GitLab CI
npm test -- --ci --coverage
npm run e2e:all:headless:3x
```

---

## 🐛 Troubleshooting

### Metro Port Conflicts

**Symptom:** "Port 8081 already in use"

**Solution:** Scripts auto-detect and use next available port (8082, 8083, etc.)

### Android Emulator Not Found

**Symptom:** "No emulator running"

**Solution:**
```bash
# List available AVDs
emulator -list-avds

# Launch manually
emulator -avd Pixel_9a -no-snapshot-load &

# Or let script auto-launch (default: Pixel_9a)
npm run e2e:android
```

### iOS Simulator Not Booting

**Symptom:** Simulator doesn't start

**Solution:**
```bash
# Boot simulator manually
xcrun simctl boot "iPhone 15"

# Or let Xcode handle it
npm run start:ios
```

### Test Flakiness

**Symptom:** Tests pass sometimes, fail other times

**Solution:** Use 3x validation scripts
```bash
npm run e2e:ios:3x
npm run e2e:android:3x
```

If fails even once in 3 runs → investigate stability issue

---

## 📚 Additional Resources

- **E2E Test Files:** `automation/tests/mobile/login.test.ts`
- **Orchestration Scripts:** `automation/scripts/run-{ios|android}-e2e.js`
- **Page Objects:** `automation/src/pages/LoginPage.ts`
- **Test Logs:** `automation/logs/` (captured on failures)

---

## 🎯 Quick Reference - Most Common Commands

```bash
# Development
npm start                          # Start dev server
npm run start:ios                  # Launch iOS
npm run start:android              # Launch Android

# Testing (Local)
npm test                           # Unit tests
npm run test:watch                 # Unit tests (watch)
npm run e2e:ios                    # iOS E2E (headed)
npm run e2e:android                # Android E2E (headed)

# Testing (CI/CD)
npm test -- --ci                   # Unit tests (CI)
npm run e2e:all:headless           # All E2E (headless)
npm run e2e:all:headless:3x        # All E2E 3x (stability)
```
