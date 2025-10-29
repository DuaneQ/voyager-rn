# CI/CD Pipeline Configuration Examples

Pipeline configurations for popular CI/CD platforms using TravalPass React Native consolidated scripts.

## GitHub Actions

### Basic CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    
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
        run: npm test -- --ci --coverage --maxWorkers=2
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/clover.xml

  e2e-ios:
    name: E2E Tests - iOS
    runs-on: macos-13  # macOS required for iOS simulator
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Setup iOS Simulator
        run: |
          xcrun simctl boot "iPhone 15" || true
          xcrun simctl list devices
      
      - name: Run iOS E2E Tests (3x for stability)
        run: npm run e2e:ios:headless:3x
      
      - name: Upload Test Logs
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: ios-test-logs
          path: automation/logs/

  e2e-android:
    name: E2E Tests - Android
    runs-on: macos-13  # macOS has better Android emulator performance
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'zulu'
          java-version: '11'
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Create Android Emulator
        run: |
          echo "y" | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --install "system-images;android-33;google_apis;x86_64"
          echo "no" | $ANDROID_HOME/cmdline-tools/latest/bin/avdmanager create avd -n Pixel_9a -k "system-images;android-33;google_apis;x86_64" --force
      
      - name: Start Android Emulator
        run: |
          $ANDROID_HOME/emulator/emulator -avd Pixel_9a -no-window -gpu swiftshader_indirect -no-snapshot -noaudio -no-boot-anim &
          adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'
      
      - name: Run Android E2E Tests (3x for stability)
        run: npm run e2e:android:headless:3x
      
      - name: Upload Test Logs
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: android-test-logs
          path: automation/logs/
```

### Full Test Suite (Sequential)

```yaml
# .github/workflows/full-test-suite.yml
name: Full Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  all-tests:
    name: Complete Test Suite
    runs-on: macos-13
    timeout-minutes: 60
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'zulu'
          java-version: '11'
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Run Unit Tests
        run: npm test -- --ci --coverage
      
      - name: Setup iOS Simulator
        run: xcrun simctl boot "iPhone 15" || true
      
      - name: Create Android Emulator
        run: |
          echo "y" | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --install "system-images;android-33;google_apis;x86_64"
          echo "no" | $ANDROID_HOME/cmdline-tools/latest/bin/avdmanager create avd -n Pixel_9a -k "system-images;android-33;google_apis;x86_64" --force
      
      - name: Start Android Emulator
        run: |
          $ANDROID_HOME/emulator/emulator -avd Pixel_9a -no-window -gpu swiftshader_indirect -no-snapshot -noaudio -no-boot-anim &
          adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'
      
      - name: Run All E2E Tests (Both Platforms, 3x)
        run: npm run e2e:all:headless:3x
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/clover.xml
      
      - name: Upload Test Logs
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-logs
          path: |
            automation/logs/
            coverage/
```

---

## GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - e2e

variables:
  NODE_VERSION: "18"

# Unit Tests
unit-tests:
  stage: test
  image: node:${NODE_VERSION}
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm test -- --ci --coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'

# iOS E2E Tests
e2e-ios:
  stage: e2e
  tags:
    - macos  # Requires macOS runner
  script:
    - npm ci
    - xcrun simctl boot "iPhone 15" || true
    - npm run e2e:ios:headless:3x
  artifacts:
    when: on_failure
    paths:
      - automation/logs/

# Android E2E Tests
e2e-android:
  stage: e2e
  tags:
    - macos  # Or use Linux with KVM support
  script:
    - npm ci
    - echo "y" | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --install "system-images;android-33;google_apis;x86_64"
    - echo "no" | $ANDROID_HOME/cmdline-tools/latest/bin/avdmanager create avd -n Pixel_9a -k "system-images;android-33;google_apis;x86_64" --force
    - $ANDROID_HOME/emulator/emulator -avd Pixel_9a -no-window -gpu swiftshader_indirect -no-snapshot -noaudio -no-boot-anim &
    - adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'
    - npm run e2e:android:headless:3x
  artifacts:
    when: on_failure
    paths:
      - automation/logs/
```

---

## CircleCI

```yaml
# .circleci/config.yml
version: 2.1

orbs:
  node: circleci/node@5.0.0
  android: circleci/android@2.0.0

jobs:
  unit-tests:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      - node/install-packages
      - run:
          name: Run Unit Tests
          command: npm test -- --ci --coverage
      - store_artifacts:
          path: coverage
      - store_test_results:
          path: coverage

  e2e-ios:
    macos:
      xcode: 14.3.0
    steps:
      - checkout
      - node/install-packages
      - run:
          name: Boot iOS Simulator
          command: xcrun simctl boot "iPhone 15" || true
      - run:
          name: Run iOS E2E Tests
          command: npm run e2e:ios:headless:3x
      - store_artifacts:
          path: automation/logs
          when: on_fail

  e2e-android:
    executor:
      name: android/android-machine
      resource-class: large
    steps:
      - checkout
      - node/install-packages
      - android/create-avd:
          avd-name: Pixel_9a
          system-image: system-images;android-33;google_apis;x86_64
          install: true
      - android/start-emulator:
          avd-name: Pixel_9a
          no-window: true
          restore-gradle-cache-prefix: v1a
      - run:
          name: Run Android E2E Tests
          command: npm run e2e:android:headless:3x
      - store_artifacts:
          path: automation/logs
          when: on_fail

workflows:
  test-all:
    jobs:
      - unit-tests
      - e2e-ios:
          requires:
            - unit-tests
      - e2e-android:
          requires:
            - unit-tests
```

---

## Azure Pipelines

```yaml
# azure-pipelines.yml
trigger:
  - main
  - develop

pool:
  vmImage: 'macos-13'

stages:
  - stage: Test
    jobs:
      - job: UnitTests
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
          
          - script: npm ci
            displayName: 'Install Dependencies'
          
          - script: npm test -- --ci --coverage
            displayName: 'Run Unit Tests'
          
          - task: PublishCodeCoverageResults@1
            inputs:
              codeCoverageTool: 'Cobertura'
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/coverage/cobertura-coverage.xml'

      - job: E2E_iOS
        dependsOn: UnitTests
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
          
          - script: npm ci
            displayName: 'Install Dependencies'
          
          - script: xcrun simctl boot "iPhone 15" || true
            displayName: 'Boot iOS Simulator'
          
          - script: npm run e2e:ios:headless:3x
            displayName: 'Run iOS E2E Tests (3x)'
          
          - task: PublishTestResults@2
            condition: always()
            inputs:
              testResultsFiles: 'automation/logs/*.xml'

      - job: E2E_Android
        dependsOn: UnitTests
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
          
          - script: npm ci
            displayName: 'Install Dependencies'
          
          - script: |
              echo "y" | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --install "system-images;android-33;google_apis;x86_64"
              echo "no" | $ANDROID_HOME/cmdline-tools/latest/bin/avdmanager create avd -n Pixel_9a -k "system-images;android-33;google_apis;x86_64" --force
            displayName: 'Create Android Emulator'
          
          - script: |
              $ANDROID_HOME/emulator/emulator -avd Pixel_9a -no-window -gpu swiftshader_indirect -no-snapshot -noaudio -no-boot-anim &
              adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'
            displayName: 'Start Android Emulator'
          
          - script: npm run e2e:android:headless:3x
            displayName: 'Run Android E2E Tests (3x)'
          
          - task: PublishTestResults@2
            condition: always()
            inputs:
              testResultsFiles: 'automation/logs/*.xml'
```

---

## Key Points for All Pipelines

### Required Environment

- **Node.js**: v18 or higher
- **macOS runner**: Required for iOS tests (Xcode + iOS Simulator)
- **Android SDK**: Required for Android tests
- **Java 11**: Required for Android builds

### Script Usage

```bash
# Always use these consolidated scripts:
npm test                     # Unit tests (CI mode with --ci flag)
npm run e2e:ios:headless     # iOS E2E (headless)
npm run e2e:android:headless # Android E2E (headless)
npm run e2e:all:headless:3x  # Both platforms, 3x validation
```

### Artifacts to Collect

- **Coverage Reports**: `coverage/`
- **Test Logs**: `automation/logs/` (on failure)
- **Screenshots**: `automation/screenshots/` (if implemented)
- **Video Recordings**: `automation/videos/` (if implemented)

### Timeout Recommendations

- **Unit Tests**: 5 minutes
- **iOS E2E (single run)**: 10 minutes
- **Android E2E (single run)**: 15 minutes (includes emulator boot)
- **3x Validation**: 3x the single run time
- **Full Suite**: 60 minutes max

---

## Local Testing Before CI

Always test your pipeline scripts locally:

```bash
# Exactly what CI will run
npm test -- --ci --coverage
npm run e2e:all:headless:3x

# Check exit codes
echo $?  # Should be 0 on success
```
