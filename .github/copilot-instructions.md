# React Native Expo Replica Project

# TravalPass React Native (Expo) Development Guide

## ⚠️ CRITICAL TESTING RULES - READ FIRST ⚠️

### 🚨 ALWAYS VERIFY CODE BEFORE CLAIMING COMPLETION 🚨

**ABSOLUTE RULE**: You MUST verify your code compiles and passes tests BEFORE telling the user you're done.

**Required verification steps for EVERY code change**:
1. ✅ **TypeScript compilation**: Run `npx tsc --noEmit` to verify no type errors
2. ✅ **Unit tests**: Run `npm test` to ensure all tests pass
3. ✅ **Syntax check**: Verify the code actually runs without syntax errors
4. ✅ **Review changes**: Double-check your edits for logical errors

**NEVER claim completion without running these checks. The user should not discover compilation or test failures - you should.**

**This applies to**:
- All new features
- All bug fixes
- All refactoring
- All code modifications

**If you violate this rule, you waste the user's time and erode trust. NO EXCEPTIONS.**

---

### 🚨 ALWAYS CONSIDER COST IMPLICATIONS 🚨

**ABSOLUTE RULE**: Before recommending any new solution, refactor, or library, you MUST consider cost implications.

**Cost considerations include**:
- **External API costs**: Google Places, Maps, OpenAI, etc. - calculate per-call costs and estimate monthly usage
- **Cloud function execution**: Firebase Functions billing (invocations, compute time, egress)
- **Third-party services**: Stripe fees, push notification services, analytics platforms
- **Build/CI costs**: EAS builds, GitHub Actions minutes, testing infrastructure
- **New library dependencies**: Do they introduce paid services? Do they increase bundle size affecting CDN costs?

**Before proposing solutions**:
1. ✅ **Research pricing**: Look up actual API pricing tiers and calculate projected costs
2. ✅ **Estimate usage**: How many calls per user? Per day? Per month?
3. ✅ **Compare alternatives**: Is there a cheaper way to achieve the same result?
4. ✅ **Present cost analysis**: Show the user projected costs BEFORE implementing
5. ✅ **Get explicit consent**: Do NOT implement cost-impacting changes without user approval

**Examples of cost-aware decisions**:
- Prefer AI-generated data over expensive API enrichment when quality is acceptable
- Use caching to reduce repeated API calls
- Batch operations when possible to reduce invocation counts
- Consider free tiers and rate limits in architecture decisions

**If you recommend a solution without cost analysis, you may cause unexpected bills. NO EXCEPTIONS.**

---

### 🚨 EAS BUILD WARNING - COSTS MONEY 🚨

**ABSOLUTE RULE**: EAS Builds count against billing quota. **Test thoroughly BEFORE building.**

**Before running `eas build`**:
- ✅ Test locally with `npx expo run:ios` or `npx expo run:android`
- ✅ Test in **Release mode** with `npx expo run:ios --configuration Release`
- ✅ Verify ALL features work locally (Google Sign-In, Apple Sign-In, Firebase, etc.)
- ✅ **ALWAYS increment `buildNumber` in app.json** before building again
- ❌ **NEVER** run `eas build` without testing locally first
- ❌ **NEVER** forget to increment build number (causes wasted builds)

**Build number management**:
```json
// app.json
"ios": {
  "buildNumber": "14"  // ← INCREMENT THIS before each build!
},
"android": {
  "versionCode": 14    // ← INCREMENT THIS before each build!
}
```

**Each successful EAS build counts against quota, even if:**
- Submission to App Store fails
- You find bugs after building
- Build number wasn't incremented

**If you violate this rule, you waste money and quota. NO EXCEPTIONS.**

---

### 🚨 NEVER MODIFY PRODUCTION CODE FOR TESTS 🚨

**ABSOLUTE RULE**: You are **STRICTLY FORBIDDEN** from modifying any production code to make tests work.

**Production code includes (but not limited to)**:
- `firebase-config.js` / `firebaseConfig.ts` - **NEVER TOUCH FOR TESTS**
- Any files in `src/` that are used by the actual app
- `App.tsx`, navigation files, context providers
- Component files, hooks, services, utilities
- Configuration files used by the running app

**If tests need special configuration**:
- ✅ Modify test setup files: `jest.setup.js`, `jest.integration.setup.js`
- ✅ Create test-specific config files in `__tests__/` or `testUtils/`
- ✅ Use mocks in `__mocks__/` directory
- ✅ Add test utilities in `src/testUtils/` or `src/__tests__/helpers/`
- ❌ **NEVER** add try/catch, conditional logic, or environment checks to production code
- ❌ **NEVER** modify exports in production files to accommodate tests

**If you violate this rule, you will break the production app. NO EXCEPTIONS.**

### 🚨 NEVER CREATE DUPLICATE DIRECTORIES 🚨

**ABSOLUTE RULE**: Do NOT create duplicate or similar-named directories.

**Examples of violations**:
- ❌ Creating both `src/__tests__/integration/` AND `src/__tests__/integrations/`
- ❌ Creating both `src/components/auth/` AND `src/components/authentication/`
- ❌ Creating both `src/utils/` AND `src/utilities/`

**Before creating ANY new directory**:
- ✅ Check if a similar directory already exists (singular/plural variations, abbreviations)
- ✅ Use existing directory structure patterns
- ✅ If unsure, ask the user which directory structure to use
- ❌ **NEVER** create a new directory without checking for existing similar ones first

**Canonical test directory structure**:
- `src/__tests__/components/` - Component tests
- `src/__tests__/integrations/` - Integration tests (plural - matches jest.integration.config.js)
- `src/__tests__/hooks/` - Hook tests
- `src/__mocks__/` - Mock files

**If you violate this rule, you create confusion and technical debt. NO EXCEPTIONS.**

---

### 🚨 ALWAYS DELETE TESTS WHEN REMOVING CODE 🚨

**ABSOLUTE RULE**: When you remove or delete any function, module, or file, you MUST also remove ALL tests associated with it.

**This includes**:
- Unit test files that import or test the removed code
- Integration tests that call the removed function (even indirectly)
- Test helpers, fixtures, or mock data created solely for the removed code

**How to find associated tests before removing code**:
1. ✅ Search for the function/module name across all test files: `grep -r "functionName" src/__tests__/ functions/src/__tests__/`
2. ✅ Check for import statements referencing the file being removed
3. ✅ Remove test files that exclusively test the removed code
4. ✅ Remove individual test cases from shared files that reference the removed code

**Why this matters**:
- Tests for removed code provide false confidence — they pass without testing anything real
- Dead test code calling live APIs (e.g., cloud functions) can silently run up API costs in CI
- Leaving orphaned tests is how `searchActivities` cost $335 in 2 months: the function was deprecated in production but its integration tests kept running on every CI push, making real Google Places API calls

**If you violate this rule, you leave behind tests that waste money and mislead developers. NO EXCEPTIONS.**

---

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

## AI Playbook — Structured Prompts & Guardrails

These short rules help get consistent, reviewable outputs from AI assistants. Follow them when using AI to generate code or design artifacts.

- **Instruct the Agent:** Always begin prompts by assigning a clear role and expected output. Example: "You are: Senior React Native Engineer (TypeScript + Expo). Output: design notes, unified patch, and tests." Require the agent to produce a short plan before generating code.
- **Provide Guardrails:** List allowed vs disallowed libraries, coding-style constraints, test strategy, performance budgets, and any data/security rules. Example: "Do not add libraries not already listed in package.json; follow existing folder and naming conventions; include unit tests where applicable."
- **Provide Just-Enough Context:** Supply only relevant file paths, interfaces, and API contracts. Use structured context packs: description → inputs → outputs → constraints. Prefer concise summaries over full repo dumps.
- **Optimize for Reuse:** Ask the agent to produce modular components with explicit interfaces and short usage examples. Tag generated assets with an intended scope (prototype | reusable | experimental).
- **Plan First:** Require a brief step-by-step plan before code generation. Metric: measure reduction in post-generation rework time.

### Agent Behavior & Acceptance Criteria

- The agent should state assumptions and ask clarifying questions when uncertain.
- Generated code should follow the project's coding rules and include inline tests or test hints when changing logic.
- Always include a one-line summary of changes and list files the agent will modify.
- Reference ADRs or existing specs for architectural decisions; if none exist, include a short proposed pattern and rationale.

### Operational Rules

- Do not modify production configuration or secret-management files via AI-generated code.
- Require human review before merging any AI-generated patch. Tag PRs with `ai-generated` and paste the prompt used.
- Record estimated prompt-to-commit rework in the PR description (short note).

---

## 🛡️ Critical Rules to Prevent Breaking Existing Functionality

### Before Making ANY Code Changes

1. **Verify Backend Contracts First**
   - **Always read the cloud function signature** before modifying RPC payloads
   - Check what fields the function expects vs what you're sending
   - Example: `searchFlights` expects `departureDate`/`returnDate`, NOT `startDate`/`endDate`
   - Location: Check `functions/src/` for function definitions or use existing working calls as reference

2. **Check Existing Usage Patterns**
   - Search the codebase for how similar functionality is currently implemented
   - Use `grep_search` or `semantic_search` to find existing patterns before creating new ones
   - Example: Before adding date formatting, search for existing date handling utilities
   - **Do not reinvent the wheel** - reuse existing patterns and utilities

3. **Add Defensive Programming from the Start**
   - **All external data must be validated** before use (null checks, type validation, range checks)
   - Never assume data exists or is in the expected format
   - Example: Always check `if (date && !isNaN(new Date(date).getTime()))` before using dates
   - Add validation at component boundaries (props, API responses, user inputs)

4. **Test on Both Platforms Before Committing**
   - Changes must work on **both iOS and Android**
   - Platform-specific bugs (timezone handling, date formatting, etc.) must be caught before commit
   - Use emulators/simulators for both platforms during development
   - Example: Timezone bugs that only appear on Android must be caught in testing phase

5. **Understand Side Effects Before Modifying Shared Code**
   - Files used by multiple features (hooks, utilities, contexts) require extra scrutiny
   - Search for all usages of a function/hook before modifying it
   - Use `list_code_usages` tool to find all references
   - Consider: "What else might break if I change this?"

6. **Preserve Existing Functionality While Adding Features**
   - New features should be **additive**, not replacing existing behavior
   - Use optional parameters, feature flags, or separate code paths for new functionality
   - Example: Don't replace working date logic - add new timezone-safe helper alongside it
   - Test that old code paths still work after adding new ones

7. **Read Related Tests Before Changing Logic**
   - Check `src/__tests__/` for existing tests covering the code you're modifying
   - Understand what behavior is already tested and must be preserved
   - Update tests when changing behavior (don't just delete failing tests)
   - Add new tests for new functionality

8. **Use Type Safety as First Line of Defense**
   - Leverage TypeScript strict mode - no `any` types
   - Define interfaces for all external data (API responses, Firebase documents)
   - Use discriminated unions for state machines and multi-type data
   - Let the compiler catch errors before runtime

9. **Question Assumptions and Ask for Context**
   - **If uncertain about a flow, dependency, or contract - ASK before implementing**
   - Don't assume field names, data types, or function signatures
   - Don't assume timezone handling, date formats, or platform behaviors
   - Better to ask than to break production

10. **Implement Changes Incrementally with Verification**
    - Make one logical change at a time
    - Verify each change works before moving to the next
    - Commit working code frequently (atomic commits)
    - If something breaks, you can pinpoint exactly which change caused it

### Specific Technical Guardrails

#### Date and Time Handling
- **Always use local timezone** for user-facing dates (YYYY-MM-DD format)
- **Never use `toISOString()`** for date formatting (converts to UTC, shifts dates)
- Use `formatDateLocal()` helper or equivalent:
  ```typescript
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  ```
- Validate dates before converting to timestamps: `!isNaN(new Date(dateString).getTime())`

#### Firebase Cloud Functions
- All functions use `httpsCallable` with payload wrapped in `{ data: {...} }`
- **Verify expected payload structure** before calling (check function implementation or existing calls)
- Always handle errors: functions return `{ success: boolean, error?: string, ...data }`
- Example:
  ```typescript
  const result = await searchFlights({ 
    data: {
      departureDate: '2025-08-01',  // Not startDate!
      returnDate: '2025-08-07'       // Not endDate!
    }
  });
  ```

#### React Native Navigation
- Use `useFocusEffect` for data refresh on tab/screen focus
- Don't rely only on `useEffect` with empty deps for data loading
- Example:
  ```typescript
  useFocusEffect(
    React.useCallback(() => {
      refreshData();
    }, [refreshData])
  );
  ```

#### State Management
- Validate all data before setting state
- Use functional updates when new state depends on old: `setState(prev => ...)`
- Clean up listeners/subscriptions in useEffect cleanup functions

#### Error Handling
- Never silently swallow errors - log or display them
- Provide user-friendly error messages (not raw error objects)
- Use try/catch for async operations
- Gracefully degrade when features fail (don't crash the app)

### When You Realize You've Broken Something

1. **Stop immediately** - don't compound the error with more changes
2. **Identify the regression** - what worked before that's broken now?
3. **Review your changes** - use git diff to see exactly what changed
4. **Fix the regression first** - before continuing with new features
5. **Add a test** - to prevent the same regression in the future
6. **Document the lesson** - update this guide if needed

### Quality Checklist Before Committing

- [ ] Verified backend contract matches my payload
- [ ] Searched for existing patterns and reused them
- [ ] Added null/undefined/NaN validation for all external data
- [ ] Tested on both iOS and Android (or checked platform-specific code)
- [ ] Found all usages of modified code and verified they still work
- [ ] New features are additive, not replacing existing functionality
- [ ] Read related tests and updated/added tests for changes
- [ ] No TypeScript `any` types, all types are explicit
- [ ] Asked for clarification when uncertain
- [ ] Changes are incremental and each step was verified

**Remember: The cost of fixing a bug in production is 100x the cost of preventing it during development.**

---

## 🚨 NEVER MAKE UNINFORMED CLAIMS — READ THE CODE FIRST 🚨

**ABSOLUTE RULE**: Do NOT make any claim about what code does, what a file contains, what a feature supports, or what is missing UNTIL you have actually read the relevant source files.

**This includes**:
- Claiming a feature "isn't implemented" without checking the source
- Describing how something works based on memory or assumptions from earlier in a conversation
- Summarising what a phase/branch/PRD contains without reading it
- Asserting a bug exists or doesn't exist without reading the code
- Describing what a function, component, hook, or service does without reading it

**Required behaviour**:
1. ✅ **Read first, claim second.** Use `grep_search`, `read_file`, or `semantic_search` to verify before stating facts about the codebase.
2. ✅ **If unsure, say so and ask.** "I'm not sure — let me check" is always better than a confident wrong answer.
3. ✅ **Qualify uncertain statements.** If you haven't read the code, say "I haven't verified this yet" rather than stating it as fact.
4. ✅ **When corrected, don't just apologise — immediately read the code** to understand what's actually there before responding further.
5. ✅ **Cross-project awareness**: This workspace has multiple projects (voyager-RN, voyager-ads, voyager-pwa/functions). Never assume a feature is missing in one project because you haven't looked at the others.

**Examples of violations that have caused wasted time**:
- Claiming `voyager-ads` didn't support video creative uploads without reading `StepCreative.tsx` or `CampaignAssetService.ts`
- Claiming Phase 3 was needed for Mux video ads without reading `VideoFeedPage.tsx`
- Describing a cloud function as PostgreSQL/Prisma-based without reading `itinerariesRpc.ts`

**If you violate this rule, you waste the user's time and erode trust. Read the code. NO EXCEPTIONS.**