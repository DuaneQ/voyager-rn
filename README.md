# TravalPass React Native (Expo)

A React Native Expo replica of the **voyager-pwa** project with improved architecture following S.O.L.I.D principles. This mobile app maintains exact same functionality as the PWA while implementing better code organization, reusability, and maintainability.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (you can use the global CLI or the local binary: `npm install -g expo-cli` or use `npx expo start`)
- Xcode (for iOS simulator) — install from the Mac App Store
- Android Studio / Android Emulator (for Android development)
- For Firebase Auth persistence on React Native install `@react-native-async-storage/async-storage` (recommended)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd voyager-RN
npm install
```

2. **Verify Firebase connection:**
```bash
node test-database.js
```

3. **Start development server:**
```bash
npm start
# or
expo start
```

4. **Run on specific platforms:**
```bash
# Start Metro/Expo first
npm start           # or `npx expo start`

# Then open a platform (or run directly):
npm run ios         # Start iOS simulator (equivalent to `expo start --ios`)
npm run android     # Start Android emulator (equivalent to `expo start --android`)
npm run web         # Open in web browser

# While `npm start`/Metro is running you can also press keys shown in the terminal:
#  - a : open Android
#  - i : open iOS
#  - w : open web
```

### Development Environment Setup

1. **iOS Development:**
   - Install Xcode from the App Store
   - Open Xcode once and accept the license prompts
   - Open the Simulator app (Xcode → Open Developer Tool → Simulator) and boot a device (or use `open -a Simulator`)
   - To run the app from your project root:
     ```bash
     npm run ios
     # or
     npx expo start --ios
     ```

2. **Android Development:**
    - Install Android Studio and open SDK Manager
    - Ensure you have installed at least one SDK Platform (API 33+) and the following SDK Tools: Android SDK Platform-Tools, Android Emulator, Command-line Tools
    - Create an Android Virtual Device (AVD) in Device Manager (Tools → Device Manager)
    - Add the following to your `~/.zshrc` (adjust if your SDK path differs):
       ```bash
       export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
       export PATH="$PATH:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin"
       ```
    - Reload your shell and verify:
       ```bash
       source ~/.zshrc
       adb --version
       emulator -list-avds
       ```
    - Boot an AVD from Android Studio Device Manager or run:
       ```bash
       emulator -avd <AVD_NAME>
       npm run android
       ```

3. **Physical Device Testing:**
   - Install Expo Go app on your device
   - Scan QR code from `expo start` command

## 🏗️ Architecture Overview

This project improves upon the original PWA architecture by implementing clean code principles and better separation of concerns.

### Directory Structure

```
src/
├── components/              # Pure UI components (Single Responsibility)
│   ├── common/             # Reusable UI components
│   ├── auth/               # Authentication-specific components
│   ├── chat/               # Chat-related components  
│   ├── profile/            # Profile-specific components
│   └── search/             # Search-related components
├── pages/                  # Page components (composition only)
│   ├── AuthPage.tsx        # Single orchestrator for authentication
│   ├── MainPages/          # Primary app pages
│   └── index.ts            # Page exports
├── services/               # Business logic & external APIs
│   ├── auth/               # Authentication services
│   ├── chat/               # Chat-related services
│   ├── firebase/           # Firebase service abstractions
│   ├── search/             # Search & matching services
│   └── storage/            # Local storage services
├── repositories/           # Data access layer (Repository Pattern)
│   ├── UserRepository.ts   # User data operations
│   ├── ChatRepository.ts   # Chat data operations
│   └── ItineraryRepository.ts # Itinerary data operations
├── models/                 # Domain models & interfaces
│   ├── User.ts            # User domain model
│   ├── Chat.ts            # Chat domain model
│   ├── Itinerary.ts       # Itinerary domain model
│   └── common/            # Shared types
├── hooks/                  # Custom React hooks
│   ├── auth/              # Authentication hooks
│   ├── chat/              # Chat hooks
│   └── search/            # Search hooks
├── context/                # React Context providers
├── navigation/             # React Navigation setup
├── utils/                  # Pure utility functions
├── constants/              # App constants
└── config/                 # Environment & Firebase config
```

### Key Architecture Principles

#### S.O.L.I.D Principles Implementation

1. **Single Responsibility Principle**
   - Screens only handle UI composition and navigation
   - Services handle specific business logic
   - Repositories handle data persistence
   - Components focus solely on UI rendering

2. **Open/Closed Principle**
   - Service interfaces allow extension without modification
   - Repository pattern enables new data sources
   - Component composition over inheritance

3. **Liskov Substitution Principle**
   - All service implementations are interchangeable
   - Repository implementations use consistent interfaces

4. **Interface Segregation Principle**
   - Small, focused interfaces over large ones
   - Separate models for different concerns

5. **Dependency Inversion Principle**
   - Screens depend on service abstractions
   - Services depend on repository interfaces
   - No direct external dependencies in UI layer

## 🔧 Development Workflow

### Running the App

```bash
# Start development server with full options
expo start

# Quick platform starts
npm run ios        # Start iOS simulator
npm run android    # Start Android emulator
npm run web        # Start web browser

# Production builds
expo build:ios     # iOS build
expo build:android # Android build
```

### Database Testing

```bash
# Verify Firebase connectivity
node test-database.js

# Simple connection test
node simple-test.js
```

### Code Quality

```bash
# TypeScript type checking
npx tsc --noEmit

# Linting (when configured)
npx eslint src/

# Format code (when configured)
npx prettier --write src/
```

## 📱 Features

This React Native app replicates all voyager-pwa functionality:

### Core Features
- **User Authentication** - Firebase Auth with email/password and Google Sign-In
- **Travel Matching** - Swipe-based itinerary matching system
- **Real-time Chat** - Messaging between matched travelers
- **Video Feed** - TikTok-style travel video sharing
- **Profile Management** - User profiles with photos and preferences
- **Search & Filters** - Advanced itinerary search with filters

### Technical Features
- **Cross-platform** - iOS, Android, and Web support
- **Offline Support** - AsyncStorage for local data caching
- **Real-time Updates** - Firebase real-time database integration
- **Push Notifications** - Expo push notification system
- **Deep Linking** - Custom URL scheme support

## 🔄 Migration from Current Structure

The project is designed to gradually migrate from the current structure to the improved architecture:

### Current Issues Being Addressed
1. **Component Duplication** - Removing `*Working.tsx` vs regular component duplication
2. **Mixed Responsibilities** - Separating UI, business logic, and data access
3. **Direct Firebase Calls** - Abstracting through repository pattern
4. **No Service Layer** - Adding proper business logic abstraction
5. **Missing Domain Models** - Creating typed domain models

### Migration Strategy
1. **Extract Services** - Move business logic from components to services
2. **Create Repositories** - Abstract Firebase calls through repository interfaces
3. **Define Domain Models** - Create proper TypeScript models
4. **Refactor Components** - Make components pure UI with no business logic
5. **Implement Dependency Injection** - Use service injection pattern

## 🔗 Integration with voyager-pwa

### Shared Resources
- **Firebase Database** - Identical database structure and configuration
- **Authentication** - Same Firebase Auth setup
- **Data Models** - Compatible interfaces and types
- **Business Logic** - Equivalent functionality and user flows

### Key Differences
- **UI Framework** - React Native vs React web components
- **Navigation** - React Navigation vs React Router
- **Storage** - AsyncStorage vs localStorage
- **Platform APIs** - Native mobile APIs vs web APIs

## 🚀 Deployment

### Development Builds
```bash
# Create development build
expo build:ios --type simulator
expo build:android --type apk
```

### Production Builds
```bash
# iOS App Store
expo build:ios --type archive

# Android Play Store
expo build:android --type app-bundle
```

### Environment Configuration
- **Development** - Uses `mundo1-dev` Firebase project
- **Production** - Uses `mundo1-1` Firebase project
- **Configuration** - Managed in `src/config/firebaseConfig.ts`

## 🧪 Testing

### Testing Strategy
- **Unit Tests** - Service and repository testing in isolation
- **Integration Tests** - Hook testing with mocked services
- **Component Tests** - React Native Testing Library for UI components
- **E2E Tests** - Detox for full end-to-end testing

### Running Tests
```bash
# Unit tests (when configured)
npm test

# E2E tests (when configured)
npx detox test
```

## 📚 Additional Resources

### Documentation
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [Firebase React Native](https://rnfirebase.io/)
- [TypeScript React Native](https://reactnative.dev/docs/typescript)

### Development Tools
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [Flipper](https://fbflipper.com/) - Desktop debugging platform
- [Reactotron](https://github.com/infinitered/reactotron) - Desktop app for inspecting React Native

## 🤝 Contributing

1. Follow the S.O.L.I.D principles outlined in the architecture
2. Maintain exact functional parity with voyager-pwa
3. Use TypeScript with strict typing (no `any` types)
4. Implement proper error handling and logging
5. Write unit tests for services and repositories
6. Follow the established file naming conventions

## 📄 License

This project is a replica of voyager-pwa for mobile platforms and follows the same licensing terms.

---

**Note**: This app shares the same Firebase database as voyager-pwa. Ensure proper environment configuration before development to avoid conflicts with production data.