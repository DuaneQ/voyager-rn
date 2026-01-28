# Firebase Hosting Deployment Setup - GitHub Secrets Required

## Overview
The voyager-RN React Native Web app will deploy to Firebase Hosting on every merge to `main`, with preview deploys for pull requests (similar to the PWA workflow).

## Required GitHub Secrets

### Production Deployment (main branch → mundo1-1)
Add these secrets to your GitHub repository settings:

1. **FIREBASE_SERVICE_ACCOUNT_MUNDO1_1**
   - Firebase service account JSON for production project
   - Get from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key
   - Project: `mundo1-1`

2. **EXPO_PUBLIC_FIREBASE_API_KEY** (production)
3. **EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN** (production)
4. **EXPO_PUBLIC_FIREBASE_PROJECT_ID** = `mundo1-1`
5. **EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET** (production)
6. **EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID** (production)
7. **EXPO_PUBLIC_FIREBASE_APP_ID** (production)
8. **EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID** (production)

### Preview Deployment (PRs → mundo1-dev)
9. **FIREBASE_SERVICE_ACCOUNT_DEV**
   - Firebase service account JSON for dev project
   - Project: `mundo1-dev`

10. **EXPO_PUBLIC_FIREBASE_API_KEY_DEV** (dev)
11. **EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN_DEV** (dev)
12. **EXPO_PUBLIC_FIREBASE_PROJECT_ID_DEV** = `mundo1-dev`
13. **EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET_DEV** (dev)
14. **EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_DEV** (dev)
15. **EXPO_PUBLIC_FIREBASE_APP_ID_DEV** (dev)
16. **EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID_DEV** (dev)

### Shared Secrets (same for prod and dev)
17. **EXPO_PUBLIC_GOOGLE_PLACES_API_KEY**
    - Google Places API key for location autocomplete

18. **EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID**
    - Google OAuth Web Client ID for Google Sign-In
    - Get from: Google Cloud Console → Credentials

19. **CODECOV_TOKEN** (optional)
    - For code coverage reporting
    - Get from: codecov.io

## Workflow Files Created

### 1. `.github/workflows/firebase-hosting-merge.yml`
**Triggers:** Push to `main` branch
**Actions:**
- Install dependencies
- Run security audit
- Run unit tests
- Run integration tests
- Build React Native Web (`expo export:web`)
- Deploy to Firebase Hosting production (`mundo1-1`)

### 2. `.github/workflows/firebase-hosting-pull-request.yml`
**Triggers:** Pull requests
**Actions:**
- Build preview with dev Firebase config
- Deploy to Firebase Hosting preview channel (`mundo1-dev`)
- Run unit tests with coverage
- Run integration tests
- Upload coverage to Codecov

## Other Changes Made

1. **firebase.json**
   - Added hosting configuration pointing to `web-build/` directory
   - Configured cache headers for static assets
   - Added SPA rewrite rules

2. **package.json**
   - Added `build:web` script: `expo export:web`

3. **.gitignore**
   - Added `web-build/` to prevent committing build artifacts

## Testing the Setup

### Local Testing
```bash
# Test the web build locally
npm run build:web

# Serve locally with Firebase
firebase serve --only hosting
```

### After Push to GitHub
1. Push to a feature branch
2. Open a pull request
3. GitHub Actions will:
   - Build the app
   - Deploy preview to mundo1-dev
   - Comment preview URL on PR
4. Merge to main → deploys to production (mundo1-1)

## Firebase Projects Setup

Ensure both Firebase projects have hosting enabled:

```bash
# Production
firebase use mundo1-1
firebase hosting:channel:list

# Development
firebase use mundo1-dev
firebase hosting:channel:list
```

## Important Notes

- **React Native Web vs PWA**: This uses `expo export:web` instead of `npm run build`
- **Environment Variables**: Expo uses `EXPO_PUBLIC_*` prefix (not `REACT_APP_*`)
- **Build Output**: Web build goes to `web-build/` (not `build/`)
- **Tests**: Both unit tests (`npm test`) and integration tests (`npm run test:integration`) run in CI
- **Preview URLs**: Firebase automatically comments preview URLs on PRs

## Next Steps

1. Add all required GitHub secrets
2. Ensure Firebase projects have hosting enabled
3. Push to a test branch and open PR to verify preview deployment
4. Merge to main to verify production deployment

## Monitoring

- **GitHub Actions**: https://github.com/YOUR_ORG/voyager-RN/actions
- **Firebase Hosting (Prod)**: https://console.firebase.google.com/project/mundo1-1/hosting
- **Firebase Hosting (Dev)**: https://console.firebase.google.com/project/mundo1-dev/hosting
