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

### 2. `pr-review.yml` - Automated Pull Request Review ⭐
**Triggers:** Pull Requests (opened, synchronized, reopened)  
**Purpose:** Automated code review and quality checks on every PR.

#### Review Checks:
- **TypeScript Type Checking**: Ensures no type errors
- **Code Quality Analysis**: Detects console.log statements and TODO comments
- **Change Analysis**: Summarizes files changed by type
- **Test Coverage Reminder**: Warns if code changes lack test updates
- **Automated Comment**: Posts comprehensive review summary on PR

**Default Behavior:** ✅ **Reviews are performed automatically on all pull requests**

### 3. `security.yml` - Security Monitoring
**Triggers:** Scheduled (daily), Package changes, Manual dispatch  
**Purpose:** Security auditing and dependency monitoring.

- npm audit for vulnerabilities  
- Outdated dependency checking
- Audit report generation

## How It Works

### 🤖 **Automatic Pull Request Reviews**
**YES - Pull requests are reviewed automatically by default!**

Every PR automatically receives:
- 🔍 Code quality analysis
- ✅ TypeScript type checking
- 📊 Change summary and statistics
- ⚠️ Warnings for console.log, missing tests, etc.
- 💬 Automated review comment with findings

**Automatic Reviewer Assignment:**
- CODEOWNERS file ensures the repository owner is automatically assigned as reviewer
- Specific file paths have designated reviewers for sensitive areas (auth, config, etc.)

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
Push/PR → Automated Review → Unit Tests → (if main branch) → E2E Tests → ✅ Pass/❌ Fail
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

### GitHub Repository Settings
To enable automatic PR reviews, ensure:
- ✅ **Actions are enabled** in repository settings
- ✅ **Branch protection rules** (recommended): Require PR reviews before merging
- ✅ **CODEOWNERS** file is recognized (automatically assigns reviewers)

### Secrets (Optional)
- `CODECOV_TOKEN`: For coverage reporting

### Repository Settings
- Enable Actions in repository settings
- macOS runners available (GitHub-hosted)

## Notes

- **✅ Automated PR Reviews**: All pull requests receive automated code quality reviews by default
- **👤 Auto-Assign Reviewers**: CODEOWNERS file automatically assigns reviewers based on changed files
- **Automatic E2E**: No manual triggers needed - runs on main branch activity
- **Cost Efficient**: E2E tests only when necessary (main branch changes)
- **Fast Feedback**: Unit tests run on all branches for quick feedback
- **iOS Focus**: Currently configured for iOS e2e tests (can expand to Android)