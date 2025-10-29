# GitHub Actions Workflows

This directory contains the CI/CD workflows for the Voyager React Native project.

## Workflows

### 1. `ci.yml` - Main CI Pipeline ⭐ 
**Triggers:** Push to main/develop, Pull Requests  
**Purpose:** Complete automated testing pipeline with unit tests and e2e tests.

#### What runs when:
- **All branches/PRs**: Unit tests, TypeScript checking, security audit
- **Main branch + PRs to main**: Above + iOS E2E tests

#### Jobs:
- **Unit Tests** (Ubuntu): TypeScript check, Jest tests with coverage, security audit
- **E2E Tests** (macOS): iOS Simulator + Appium tests (only for main branch activity)

### 2. `security.yml` - Security Monitoring
**Triggers:** Scheduled (daily), Package changes, Manual dispatch  
**Purpose:** Security auditing and dependency monitoring.

- npm audit for vulnerabilities  
- Outdated dependency checking
- Audit report generation

## How It Works

### 🔄 **Automatic E2E Testing**
E2E tests **automatically run** when:
- Pushing to main branch
- Creating/updating PRs targeting main branch  
- **No manual triggering needed!**

### 💡 **Smart Resource Management**
- **Feature branches**: Only unit tests (fast, Ubuntu runners)
- **Main branch activity**: Full test suite including e2e (macOS runners)
- Prevents unnecessary e2e test runs on feature work

### 📊 **Test Flow**
```
Push/PR → Unit Tests → (if main branch) → E2E Tests → ✅ Pass/❌ Fail
```

## Local Test Commands
```bash
# Unit tests
npm test
npm run test:coverage

# E2E tests  
npm run e2e:ios:headless
npm run e2e:android:headless
```

## Requirements

### Secrets (Optional)
- `CODECOV_TOKEN`: For coverage reporting

### Repository Settings
- Enable Actions in repository settings
- macOS runners available (GitHub-hosted)

## Notes

- **Automatic E2E**: No manual triggers needed - runs on main branch activity
- **Cost Efficient**: E2E tests only when necessary (main branch changes)
- **Fast Feedback**: Unit tests run on all branches for quick feedback
- **iOS Focus**: Currently configured for iOS e2e tests (can expand to Android)