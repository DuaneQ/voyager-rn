/**
 * Web App Navigation (React Router)
 * 
 * This file is automatically selected by Metro/Webpack bundler for web platform
 * via the .web.tsx extension.
 * 
 * ARCHITECTURE:
 * - Uses React Router for web-native routing (no React Navigation bridge issues)
 * - Lazy loading for optimal Lighthouse performance score
 * - Same screens/components as native - only navigation is different
 * 
 * WHY SEPARATE WEB NAVIGATION:
 * React Navigation + React Native Web + Context providers causes infinite render
 * loops on iOS mobile browsers (Safari, Chrome on iOS). After 9 failed attempts
 * to fix this, we determined it's an architectural incompatibility.
 * 
 * React Router is designed for web and doesn't have these issues.
 * See: docs/web/WEB_NAVIGATION_ISSUE.md
 */

import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Navigate, 
  useParams,
  useLocation,
  useNavigate
} from 'react-router-dom';

// Context Providers (AlertProvider is provided by App.tsx)
import { useUserProfile } from '../context/UserProfileContext';
import { useAuth } from '../context/AuthContext';

// Guards
import { TermsGuard } from '../components/auth/TermsGuard';

// Validation utility
import { validateProfileForItinerary } from '../utils/profileValidation';

// ============================================================================
// LAZY LOADED PAGES (Web Performance Optimization)
// WHY: Lazy loading on web improves Lighthouse score to 90+
// These pages have heavy dependencies (expo-av, etc.) that shouldn't block initial load
// ============================================================================
const VideoFeedPage = lazy(() => import('../pages/VideoFeedPage'));
const ChatThreadScreen = lazy(() => import('../pages/ChatThreadScreen'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const SearchPage = lazy(() => import('../pages/SearchPage'));

// Pages without heavy dependencies - can be imported directly
import AuthPage from '../pages/AuthPage';
import ChatPage from '../pages/ChatPage';
import LandingPage from '../pages/LandingPage.web';

// ============================================================================
// LOADING FALLBACK
// ============================================================================
const LazyLoadFallback: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
  </View>
);

// ============================================================================
// WRAPPER COMPONENTS FOR LAZY-LOADED PAGES
// ============================================================================
const VideoFeedPageWrapper: React.FC = () => (
  <Suspense fallback={<LazyLoadFallback />}>
    <VideoFeedPage />
  </Suspense>
);

const ProfilePageWrapper: React.FC = () => (
  <Suspense fallback={<LazyLoadFallback />}>
    <ProfilePage />
  </Suspense>
);

const SearchPageWrapper: React.FC = () => (
  <Suspense fallback={<LazyLoadFallback />}>
    <SearchPage />
  </Suspense>
);

// ChatThread wrapper extracts connectionId from URL params (React Router)
// and passes it as a prop to ChatThreadScreen (which also supports useRoute for native)
const ChatThreadWrapper: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>();
  
  return (
    <Suspense fallback={<LazyLoadFallback />}>
      <ChatThreadScreen connectionId={connectionId || ''} />
    </Suspense>
  );
};

// ============================================================================
// WEB BOTTOM TAB BAR
// Replicates native tab bar for visual consistency
// ============================================================================
const WebBottomTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const tabs = [
    { name: 'Search', path: '/app/search', icon: '🔍', label: 'TravalMatch' },
    { name: 'Videos', path: '/app/videos', icon: '▶️', label: 'Travals' },
    { name: 'Chat', path: '/app/chat', icon: '💬', label: 'Chat' },
    { name: 'Profile', path: '/app/profile', icon: '👤', label: 'Profile' },
  ];
  
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path || 
                        location.pathname.startsWith(tab.path + '/');
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => navigate(tab.path)}
          >
            <span style={{ 
              fontSize: 24, 
              opacity: isActive ? 1 : 0.5,
              cursor: 'pointer'
            }}>
              {tab.icon}
            </span>
            <span style={{ 
              fontSize: 10, 
              color: isActive ? '#1976d2' : 'gray',
              marginTop: 2,
              cursor: 'pointer'
            }}>
              {tab.label}
            </span>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ============================================================================
// MAIN APP LAYOUT (with bottom tabs)
// ============================================================================
const MainAppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <View style={styles.mainAppContainer}>
      <View style={styles.contentContainer}>
        {children}
      </View>
      <WebBottomTabBar />
    </View>
  );
};

// ============================================================================
// AUTH GUARD - Redirects unauthenticated users
// ============================================================================
interface RequireAuthProps {
  children: React.ReactNode;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { user, isInitializing, status } = useAuth();
  const location = useLocation();
  
  // Show nothing while checking auth state
  const isLoading = status === 'loading' || isInitializing;
  if (isLoading) {
    return <LazyLoadFallback />;
  }
  
  // Check if user is authenticated AND email verified
  const isAuthenticated = user && user.emailVerified;
  
  if (!isAuthenticated) {
    // Redirect to auth page, preserving the intended destination
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  
  // User is authenticated - wrap with TermsGuard
  return (
    <TermsGuard>
      {children}
    </TermsGuard>
  );
};

// ============================================================================
// PROFILE VALIDATION - Checks profile completeness after login
// ============================================================================
const ProfileValidationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, isLoading } = useUserProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasPromptedUser = useRef(false);

  useEffect(() => {
    // Reset flag when user changes (logout/login)
    if (!user) {
      hasPromptedUser.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && userProfile && user) {
      const validationResult = validateProfileForItinerary(userProfile);
      
      // Only show prompt ONCE per session when profile is invalid
      if (!validationResult.isValid && !hasPromptedUser.current) {
        hasPromptedUser.current = true;
        
        // Navigate to profile with edit modal flag
        setTimeout(() => {
          navigate('/app/profile?edit=true&incomplete=true');
        }, 100);
      }
    }
  }, [isLoading, userProfile, user, navigate]);

  return <>{children}</>;
};

// ============================================================================
// ROOT NAVIGATOR - Handles auth state routing
// ============================================================================
const RootNavigator: React.FC = () => {
  const { user, status, isInitializing } = useAuth();
  
  // Show loading state while checking authentication
  const isLoading = status === 'loading' || isInitializing;
  
  if (isLoading) {
    return <LazyLoadFallback />;
  }

  // Check if user is authenticated with verified email
  const isAuthenticated = user && user.emailVerified;

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/" 
        element={
          isAuthenticated ? (
            <Navigate to="/app/search" replace />
          ) : (
            <LandingPage />
          )
        } 
      />
      
      <Route 
        path="/auth" 
        element={
          isAuthenticated ? (
            <Navigate to="/app/search" replace />
          ) : (
            <AuthPage />
          )
        } 
      />

      {/* Protected routes - Main App with tabs */}
      <Route 
        path="/app/search" 
        element={
          <RequireAuth>
            <ProfileValidationWrapper>
              <MainAppLayout>
                <SearchPageWrapper />
              </MainAppLayout>
            </ProfileValidationWrapper>
          </RequireAuth>
        } 
      />
      
      <Route 
        path="/app/videos" 
        element={
          <RequireAuth>
            <MainAppLayout>
              <VideoFeedPageWrapper />
            </MainAppLayout>
          </RequireAuth>
        } 
      />
      
      <Route 
        path="/app/chat" 
        element={
          <RequireAuth>
            <MainAppLayout>
              <ChatPage />
            </MainAppLayout>
          </RequireAuth>
        } 
      />
      
      <Route 
        path="/app/profile" 
        element={
          <RequireAuth>
            <MainAppLayout>
              <ProfilePageWrapper />
            </MainAppLayout>
          </RequireAuth>
        } 
      />

      {/* Chat thread (no bottom tabs) */}
      <Route 
        path="/app/chat/:connectionId" 
        element={
          <RequireAuth>
            <ChatThreadWrapper />
          </RequireAuth>
        } 
      />

      {/* Default redirect for /app */}
      <Route 
        path="/app" 
        element={<Navigate to="/app/search" replace />} 
      />

      {/* Catch-all redirect */}
      <Route 
        path="*" 
        element={
          isAuthenticated ? (
            <Navigate to="/app/search" replace />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />
    </Routes>
  );
};

// ============================================================================
// MAIN APP NAVIGATOR (Web Entry Point)
// NOTE: AlertProvider is already provided by App.tsx - do not add here
// ============================================================================
const AppNavigator: React.FC = () => {
  return (
    <BrowserRouter>
      <RootNavigator />
    </BrowserRouter>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  mainAppContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingBottom: 20, // Safe area for mobile browsers
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
});

export default AppNavigator;
