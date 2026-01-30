# Quick Reference Card - TravalPass RN Scripts

## 🚀 Most Common Commands

```bash
# 📱 Development
npm start                 # Start Expo dev server
npm run start:ios         # Launch iOS simulator  
npm run start:android     # Launch Android emulator

# 🧪 Testing
npm test                  # Run unit tests
npm run test:watch        # Unit tests (watch mode)
npm run e2e:ios           # iOS E2E (headed)
npm run e2e:android       # Android E2E (headed)

# 🤖 CI/CD
npm run e2e:all:headless:3x   # Full E2E suite (both platforms, 3x)
```

---

## 📊 All Available Scripts

### App Launch
| Command | Description |
|---------|-------------|
| `npm start` | Expo dev server (choose platform) |
| `npm run start:ios` | iOS simulator |
| `npm run start:android` | Android emulator |
| `npm run start:web` | Web browser |

### Unit Tests
| Command | Description |
|---------|-------------|
| `npm test` | Run once |
| `npm run test:watch` | Watch mode (auto-rerun) |
| `npm run test:coverage` | With coverage report |

### E2E Tests - iOS
| Command | Mode | Runs | CI/CD Ready |
|---------|------|------|-------------|
| `npm run e2e:ios` | Headed | 1x | ❌ |
| `npm run e2e:ios:headless` | Headless | 1x | ✅ |
| `npm run e2e:ios:3x` | Headed | 3x | ❌ |
| `npm run e2e:ios:headless:3x` | Headless | 3x | ✅ |

### E2E Tests - Android
| Command | Mode | Runs | CI/CD Ready |
|---------|------|------|-------------|
| `npm run e2e:android` | Headed | 1x | ❌ |
| `npm run e2e:android:headless` | Headless | 1x | ✅ |
| `npm run e2e:android:3x` | Headed | 3x | ❌ |
| `npm run e2e:android:headless:3x` | Headless | 3x | ✅ |

### E2E Tests - Combined
| Command | Platforms | Mode | CI/CD Ready |
|---------|-----------|------|-------------|
| `npm run e2e:all:headless` | iOS + Android | Headless | ✅ |
| `npm run e2e:all:headless:3x` | iOS + Android | Headless 3x | ✅ |

---

## 🎯 Use Cases

### Local Development
```bash
npm start                  # Start dev server
npm run start:ios          # Launch app
npm run test:watch         # Run tests in background
```

### Debugging Failed Tests
```bash
npm run e2e:ios            # Run with visible UI
# Watch what happens, fix issue
npm run e2e:ios:3x         # Validate fix (3x)
```

### Before Committing
```bash
npm test                   # Unit tests
npm run e2e:ios:headless   # iOS E2E
npm run e2e:android:headless # Android E2E
```

### CI/CD Pipeline
```bash
npm test -- --ci --coverage        # Unit tests with coverage
npm run e2e:all:headless:3x        # Full E2E validation
```

---

## 🔧 Environment Variables

```bash
# Headless mode
HEADLESS=true npm run e2e:ios

# Custom Android emulator
ANDROID_AVD_NAME=Pixel_8 npm run e2e:android

# Custom Metro port
METRO_PORT=8082 npm run e2e:ios
```

---

## 📚 Full Documentation

- **Complete Guide:** [docs/SCRIPTS_GUIDE.md](docs/SCRIPTS_GUIDE.md)
- **CI/CD Examples:** [docs/CI_CD_EXAMPLES.md](docs/CI_CD_EXAMPLES.md)
- **Summary:** [docs/SCRIPTS_CONSOLIDATION_SUMMARY.md](docs/SCRIPTS_CONSOLIDATION_SUMMARY.md)

---

## 🆘 Troubleshooting

### Port 8081 already in use
**Solution:** Scripts auto-detect and use next available port

### Android emulator not found
```bash
emulator -list-avds              # List available
ANDROID_AVD_NAME=YourAVD npm run e2e:android
```

### iOS simulator not booting
```bash
xcrun simctl boot "iPhone 15"    # Boot manually
npm run start:ios                # Or let Xcode handle it
```

### Tests flaky?
```bash
npm run e2e:ios:3x               # Run 3x to validate
npm run e2e:android:3x           # If fails even once → investigate
```

---

## 🚨 Known Issues

### Web Platform (January 30, 2026)

**RangeError: Maximum call stack size exceeded** 🔴 CRITICAL
- Occurs on iOS Safari web builds after authentication
- App remains functional but indicates underlying instability
- **Debugging in progress** - See [docs/web/KNOWN_ISSUES_WEB.md](docs/web/KNOWN_ISSUES_WEB.md)

**OAuth Domain Warning** 🟡 HIGH PRIORITY
- Preview deployments need domains added to Firebase Console
- Blocks Google/Apple Sign-In on preview builds
- Email/password auth works fine
- **Fix:** Add domain in Firebase Console → Authentication → Authorized domains

**Firestore Connection Failures** 🟢 SELF-HEALING
- Intermittent at startup, automatically recovers
- Causes ~1-2 second delay in profile loading
- No user action required

See [docs/web/KNOWN_ISSUES_WEB.md](docs/web/KNOWN_ISSUES_WEB.md) for full details.

---

**💡 Tip:** Bookmark this page for quick reference!

**Last Updated:** January 30, 2026
