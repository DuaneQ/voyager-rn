# React Native Expo Replica Project

# TravalPass React Native (Expo) Development Guide

## Project Overview
This is a **React Native Expo** replica of the **voyager-pwa** project, maintaining **exact same functionality** for mobile platforms while implementing **improved architecture** following S.O.L.I.D principles. The app shares the same Firebase database and business logic as the PWA but with better code organization and reusability.

## 🏗️ Improved Architecture & S.O.L.I.D Principles

### Directory Structure (Enhanced from PWA)
```
src/
├── pages/                  # Main application pages
│   └── AuthPage.tsx        # Single authentication entry point
├── components/             # Pure UI components (Single Responsibility)
│   ├── common/            # Reusable UI components
│   ├── auth/              # Authentication components
│   │   ├── forms/         # Reusable form components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── ForgotPasswordForm.tsx
│   │   │   └── ResendVerificationForm.tsx
│   │   └── icons/         # Icon components
│   │       └── GoogleIcon.tsx
│   ├── chat/              # Chat-related components  
│   ├── profile/           # Profile-specific components
│   └── search/            # Search-related components
├── services/              # Business logic & external APIs (Dependency Inversion)
│   ├── auth/              # Authentication services
│   ├── chat/              # Chat-related services
│   ├── firebase/          # Firebase service abstractions
│   ├── search/            # Search & matching services
│   └── storage/           # Local storage services
├── repositories/          # Data access layer (Repository Pattern)
│   ├── UserRepository.ts  # User data operations
│   ├── ChatRepository.ts  # Chat data operations
│   └── ItineraryRepository.ts # Itinerary data operations
├── models/                # Domain models & interfaces (Interface Segregation)
│   ├── User.ts           # User domain model
│   ├── Chat.ts           # Chat domain model
│   ├── Itinerary.ts      # Itinerary domain model
│   └── common/           # Shared types
├── hooks/                 # Custom React hooks for state management
│   ├── auth/             # Authentication hooks
│   ├── chat/             # Chat hooks
│   └── search/           # Search hooks
├── context/               # React Context providers (global state)
├── navigation/            # React Navigation setup
├── utils/                 # Pure utility functions
├── constants/             # App constants and configuration
└── config/                # Environment & Firebase configuration
```

### S.O.L.I.D Implementation

#### Single Responsibility Principle
- **Screens**: Only handle UI composition and navigation
- **Services**: Handle specific business logic (auth, chat, search)
- **Repositories**: Handle data persistence operations
- **Components**: Focus on UI rendering only

#### Open/Closed Principle
- **Service Interfaces**: Abstract contracts that can be extended
- **Repository Pattern**: New data sources can be added without changing existing code
- **Component Composition**: New features added through composition, not modification

#### Liskov Substitution Principle
- **Service Implementations**: All service implementations must be interchangeable
- **Repository Implementations**: Different data sources (Firebase, local) use same interface

#### Interface Segregation Principle
- **Focused Interfaces**: Small, specific interfaces rather than large ones
- **Domain Models**: Separate models for different concerns (User, Chat, Itinerary)

#### Dependency Inversion Principle
- **Service Injection**: Screens depend on service abstractions, not concrete implementations
- **Repository Abstraction**: Services depend on repository interfaces, not Firebase directly

### Critical Files & Their Responsibilities
- `src/navigation/AppNavigator.tsx` - Navigation composition only
- `src/services/firebase/FirebaseService.ts` - Firebase abstraction layer
- `src/repositories/*Repository.ts` - Data access abstractions
- `src/models/*.ts` - Type-safe domain models
- `src/hooks/auth/useAuth.ts` - Authentication state management

### Database Integration (Unchanged)
- **Shared Firebase**: Uses identical Firebase config to voyager-pwa (both dev/prod)
- **Data Models**: Exact same interfaces and types as PWA
- **Authentication**: Firebase Auth with same user flow
- **Storage**: AsyncStorage with repository pattern abstraction

## 🔧 Development Commands
```bash
# Start development server
npm start

# Platform-specific development  
npm run android    # Android emulator/device
npm run ios        # iOS simulator/device
npm run web        # Web browser (for testing)

# Database connection testing
node test-database.js    # Verify Firebase connection
node simple-test.js      # Basic connectivity test

# Type checking
npx tsc --noEmit        # TypeScript validation

# Linting
npx eslint src/         # Code quality checks
```

## 📋 Improved Component Patterns

### Screen Component Pattern (Composition Only)
```tsx
// Screens only handle composition and navigation
import React from 'react';
import { useAuth } from '../hooks/auth/useAuth';
import { useSearchItineraries } from '../hooks/search/useSearchItineraries';
import SearchView from '../components/search/SearchView';

const SearchScreen: React.FC = () => {
  const { user } = useAuth();
  const searchHook = useSearchItineraries(user?.uid);

  return <SearchView {...searchHook} />;
};
```

### Service Pattern (Business Logic)
```tsx
// Services handle business logic and external dependencies
export interface ISearchService {
  searchItineraries(params: SearchParams): Promise<Itinerary[]>;
  likeItinerary(itineraryId: string, userId: string): Promise<void>;
}

export class SearchService implements ISearchService {
  constructor(
    private itineraryRepo: IItineraryRepository,
    private userRepo: IUserRepository
  ) {}
  
  async searchItineraries(params: SearchParams): Promise<Itinerary[]> {
    // Business logic here
  }
}
```

### Repository Pattern (Data Access)
```tsx
// Repositories abstract data access
export interface IItineraryRepository {
  findByUserId(userId: string): Promise<Itinerary[]>;
  updateLikes(id: string, likes: string[]): Promise<void>;
}

export class FirebaseItineraryRepository implements IItineraryRepository {
  constructor(private db: Firestore) {}
  
  async findByUserId(userId: string): Promise<Itinerary[]> {
    // Firebase implementation
  }
}
```

### Custom Hook Pattern (State Management)
```tsx
// Hooks manage state and coordinate services
export const useSearchItineraries = (userId?: string) => {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Use injected services
  const searchService = useService<ISearchService>('searchService');
  
  const searchItineraries = useCallback(async (params: SearchParams) => {
    setLoading(true);
    const results = await searchService.searchItineraries(params);
    setItineraries(results);
    setLoading(false);
  }, [searchService]);

  return { itineraries, loading, searchItineraries };
};
```

## 🔒 Enhanced Development Rules

### Architecture Principles
1. **Clean Architecture**: Follow dependency flow from UI → Services → Repositories → External APIs
2. **Single Source of Truth**: Each piece of state has one authoritative source
3. **Immutable Data**: Use immutable patterns for state updates
4. **Error Boundaries**: Implement proper error handling at each layer
5. **Type Safety**: Strict TypeScript throughout, no `any` types

### Code Organization Rules
1. **No Business Logic in Components**: Components only handle UI rendering
2. **Service Injection**: Use dependency injection for services in hooks
3. **Repository Pattern**: All data access goes through repository interfaces
4. **Interface First**: Define interfaces before implementations
5. **Pure Functions**: Utility functions should be pure and testable

### File Naming Conventions
- **Pages**: `PageName.tsx` (in `src/pages/`)
- **Components**: `ComponentName.tsx` (in appropriate feature folder)
- **Services**: `FeatureService.ts` (with corresponding interface)
- **Repositories**: `FeatureRepository.ts` (with corresponding interface)
- **Models**: `ModelName.ts` (domain models)
- **Hooks**: `useFeatureName.ts`

### Import Patterns
```tsx
// Domain models
import { User, Itinerary } from '../models';

// Service interfaces (dependency inversion)
import { IAuthService, IChatService } from '../services';

// Repository interfaces
import { IUserRepository } from '../repositories';

// React Navigation
import { useNavigation } from '@react-navigation/native';

// Custom hooks
import { useAuth, useChat } from '../hooks';
```

## 🧪 Testing Strategy
- **Unit Tests**: Test services and repositories in isolation
- **Integration Tests**: Test hooks with mocked services
- **Component Tests**: Test UI components with React Native Testing Library
- **E2E Tests**: Use Detox for end-to-end testing

## ⚠️ Migration Guidelines
- **Gradual Migration**: Migrate one feature at a time to new architecture
- **Backward Compatibility**: Maintain existing functionality during migration
- **Service Extraction**: Extract business logic from existing components into services
- **Interface Definition**: Define clear interfaces before refactoring implementations

## 🎯 Quality Standards
- **Code Coverage**: Maintain >80% test coverage
- **Type Safety**: Zero TypeScript errors in production builds
- **Performance**: Monitor bundle size and runtime performance
- **Accessibility**: All components must meet WCAG 2.1 AA standards

## Project Type
- Framework: React Native Expo with TypeScript
- Platforms: Android and iOS
- Build Tool: Expo CLI / Metro bundler
- Backend: Leverage existing voyager-pwa cloud functions

## Development Guidelines
- Use modern React Native patterns (hooks, functional components)
- Follow mobile app best practices
- Implement responsive design for different screen sizes
- Focus on performance and mobile UX
- Support both Android and iOS platforms

## Progress Checklist
- [x] ✅ Verify that the copilot-instructions.md file in the .github directory is created
- [x] ✅ Clarify Project Requirements - React Native Expo app with exact same functionality as voyager-pwa, leveraging existing cloud functions
- [x] ✅ Database Connection Verified - voyager-RN connects to shared Firebase database
- [x] ✅ Scaffold the Project - Starting with minimal functionality (Login screen)
- [ ] Customize the Project
- [ ] Install Required Extensions
- [ ] Compile the Project
- [ ] Create and Run Task
- [ ] Launch the Project
- [ ] Ensure Documentation is Complete

# Copilot Development Guardrails — TravalPass React Native (Expo) App

You are assisting in building the **TravalPass React Native (Expo)** mobile app.  
This app **replicates** the existing **TravalPass Progressive Web App (PWA)** functionality for mobile users.  
Your purpose is to mirror behavior and logic — **not redesign or refactor beyond necessity**.

---

## 🧭 Objective
- Create a **React Native (Expo)** app using **TypeScript** that mirrors the **TravalPass PWA**.
- Preserve **all existing business logic**, **API contracts**, and **user flows**.
- Maintain **consistency** in directory structure and component organization with the web app.

---

## ⚙️ Architectural & Coding Rules

### S.O.L.I.D Principles
You must apply **S.O.L.I.D** throughout:
- **S**ingle Responsibility: Each class/module has one responsibility.
- **O**pen/Closed: Extend functionality without modifying existing code.
- **L**iskov Substitution: Derived classes/interfaces must be substitutable.
- **I**nterface Segregation: No bloated interfaces — prefer small, purpose-driven ones.
- **D**ependency Inversion: Depend on abstractions, not concrete implementations.

---

## 📁 Directory Structure (Mirror Existing Web App)

Maintain a near-identical hierarchy:


## 🔒 Rules for Copilot

1. **Do not modify existing APIs** or data models — create mobile adapters if required.  
2. **Use dependency injection** wherever a service or repository is consumed.  
3. **Keep functions pure** where possible.  
4. **Never introduce new side effects** (e.g., hidden network or storage calls).  
5. **Always match directory naming** to the PWA for cross-reference.  
6. **Follow strict TypeScript typings** (`strict: true`, no `any`).  
7. **If uncertain about a flow or dependency — request context, don’t assume.**  
8. **All components must be functional** and use hooks; no class components.  
9. **No direct API calls inside components.** Use repositories and use-cases.  
10. **Follow accessibility and internationalization best practices.**
If Copilot is unsure

If you encounter uncertainty:

Ask for the equivalent PWA component or function before guessing.

If native modules differ, create adapters that maintain interface parity.

Document any unavoidable deviation clearly in comments.

Important:
Always consider that this codebase will target both Mobile (React Native) and Web (React Native Web / PWA).
All implementation decisions, component logic, and storage or navigation handling must explicitly support cross-platform compatibility.

Guidelines:

When choosing libraries or APIs, ensure they either:

Work for both React Native and Web, or

Can be abstracted behind a small adapter layer (e.g., storage, navigation, or platformUtils).

Use platform-specific modules (Platform.OS === 'web' or 'ios' | 'android') where behavior differs.

Example:

localStorage → use AsyncStorage or SecureStore for mobile, but localStorage for web.

Navigation: use a shared route config but platform-specific stacks if needed.

When rendering UI, always ensure responsive layouts work on both touch (mobile) and pointer (web) inputs.

Favor flex-based layouts and dynamic dimensions.

Avoid mobile-only gestures that break on web.

All Auth, Storage, and Network utilities must expose a consistent API across platforms.

Example: getItem(), setItem(), removeItem() should work identically whether on mobile or web.

When writing tests, include platform-specific mocks so both environments are covered.

Example: mock AsyncStorage for mobile and localStorage for web.

Include Platform.select or environment checks for conditional imports.

e.g.

import { Platform } from 'react-native';
const Storage = Platform.OS === 'web' ? webStorage : nativeStorage;


Keep S.O.L.I.D. principles enforced: isolate platform differences in low-level modules, not in core business logic or UI components.

Goal:
Every feature (Auth, Navigation, UI, Storage, API calls) should function seamlessly on both mobile and web targets with minimal code duplication.