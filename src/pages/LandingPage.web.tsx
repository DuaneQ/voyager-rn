/**
 * LandingPage.web.tsx - Web-only landing page
 * 
 * This is a web-specific version of the PWA landing page, adapted for React Native Web.
 * Only rendered when Platform.OS === 'web' and user is not authenticated.
 * 
 * Key differences from PWA version:
 * - Uses React Native components that render to web
 * - Simplified video handling for RN Web compatibility
 * - Uses inline styles instead of Material-UI sx prop
 * - SEO meta tags injected directly into document.head on mount
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { PrivacyPolicyModal } from '../components/modals/legal/PrivacyPolicyModal';
import { TermsOfServiceModal } from '../components/modals/legal/TermsOfServiceModal';
import { SafetyGuidelinesModal } from '../components/modals/legal/SafetyGuidelinesModal';
import { CookiePolicyModal } from '../components/modals/legal/CookiePolicyModal';

// Platform-safe useNavigation
const useNavigation = () => ({
  navigate: (screen: string, mode?: 'login' | 'register') => {
    if (screen === 'Auth') {
      window.location.href = mode ? `/auth?mode=${mode}` : '/auth';
    }
  }
});

const { width } = Dimensions.get('window');

// Base URL for meta tags — single source of truth for share/SEO URLs
const BASE_URL = 'https://travalpass.com';

// SEO meta tags injection helper for web
const injectSEOMetaTags = () => {
  if (typeof document === 'undefined') return;

  // Set page title
  document.title = 'TravalPass — Planning a Trip Solo? Find Your Travel Match';

  // Helper to set/update meta tag
  const setMetaTag = (name: string, content: string, useProperty?: boolean) => {
    const selector = useProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let meta = document.querySelector(selector) as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      if (useProperty) {
        meta.setAttribute('property', name);
      } else {
        meta.setAttribute('name', name);
      }
      document.head.appendChild(meta);
    }
    meta.content = content;
  };

  // Primary Meta Tags
  setMetaTag('description', 'Planning a trip solo? TravalPass matches you with travelers going to the same destination, on the same dates. Not a dating app — a real travel companion platform.');
  setMetaTag('keywords', 'travel companions, travel buddies, vacation buddy, vacation companions, trip companion, trip partner, travel partner, adventure companions, solo traveler, solo travel, travel match, travel matching, AI itinerary, travel planning, travel tips, find travel companions, trip planner, vacation planning');

  // Open Graph / Facebook (use property attribute)
  setMetaTag('og:type', 'website', true);
  setMetaTag('og:url', `${BASE_URL}/`, true);
  setMetaTag('og:title', 'Planning a Trip Solo? Find Your Travel Match | TravalPass', true);
  setMetaTag('og:description', 'Match with travelers by destination and dates. Create AI itineraries. Chat safely. Free to start.', true);
  setMetaTag('og:image', `${BASE_URL}/assets/icon.png`, true);
  setMetaTag('og:site_name', 'TravalPass', true);

  // Twitter (use name attribute, not property)
  setMetaTag('twitter:card', 'summary_large_image');
  setMetaTag('twitter:url', `${BASE_URL}/`);
  setMetaTag('twitter:title', 'Planning a Trip Solo? Find Your Travel Match | TravalPass');
  setMetaTag('twitter:description', 'Match with travelers by destination and dates. Create AI itineraries. Chat safely. Free to start.');
  setMetaTag('twitter:image', `${BASE_URL}/assets/icon.png`);

  // Canonical URL
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = `${BASE_URL}/`;
};



// ── App Screen Mockup ────────────────────────────────────────────────────
// CSS-only visual simulating the TravalPass search/match screen (replaces stock photo)
const AppScreenMockup: React.FC = () => (
  <View
    style={appMockStyles.phone}
    accessibilityLabel="Mockup of the TravalPass app showing search results with matched travelers"
  >
    {/* Status bar */}
    <View style={appMockStyles.statusBar}>
      <Text style={appMockStyles.statusTime}>9:41</Text>
      <Text style={appMockStyles.statusIcons}>📶 🔋</Text>
    </View>

    {/* App header */}
    <View style={appMockStyles.appHeader}>
      <Text style={appMockStyles.appLogo}>TravalPass</Text>
      <Text style={appMockStyles.searchLabel}>📍 Paris · Jun 1–7</Text>
    </View>

    {/* Results */}
    <View style={appMockStyles.resultCard}>
      <View style={appMockStyles.resultTop}>
        <View style={appMockStyles.avatar}>
          <Text style={appMockStyles.avatarText}>A</Text>
        </View>
        <View style={appMockStyles.resultInfo}>
          <Text style={appMockStyles.resultName}>Alex, 28</Text>
          <Text style={appMockStyles.resultDates}>Jun 2 – 8 · Museums, Cafés</Text>
        </View>
        <View style={appMockStyles.matchPill}>
          <Text style={appMockStyles.matchPillText}>92%</Text>
        </View>
      </View>
    </View>

    <View style={appMockStyles.resultCard}>
      <View style={appMockStyles.resultTop}>
        <View style={[appMockStyles.avatar, { backgroundColor: '#f59e0b' }]}>
          <Text style={appMockStyles.avatarText}>M</Text>
        </View>
        <View style={appMockStyles.resultInfo}>
          <Text style={appMockStyles.resultName}>Maria, 31</Text>
          <Text style={appMockStyles.resultDates}>Jun 3 – 9 · Art, Walking</Text>
        </View>
        <View style={[appMockStyles.matchPill, { backgroundColor: '#e8f5e9' }]}>
          <Text style={[appMockStyles.matchPillText, { color: '#2e7d32' }]}>87%</Text>
        </View>
      </View>
    </View>

    <View style={appMockStyles.resultCard}>
      <View style={appMockStyles.resultTop}>
        <View style={[appMockStyles.avatar, { backgroundColor: '#8b5cf6' }]}>
          <Text style={appMockStyles.avatarText}>J</Text>
        </View>
        <View style={appMockStyles.resultInfo}>
          <Text style={appMockStyles.resultName}>James, 25</Text>
          <Text style={appMockStyles.resultDates}>Jun 1 – 6 · Food, Nightlife</Text>
        </View>
        <View style={[appMockStyles.matchPill, { backgroundColor: '#fff3e0' }]}>
          <Text style={[appMockStyles.matchPillText, { color: '#e65100' }]}>74%</Text>
        </View>
      </View>
    </View>
  </View>
);

const appMockStyles = StyleSheet.create({
  phone: {
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#1a1a1a',
    width: '100%',
    maxWidth: 300,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    alignSelf: 'center',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#1976d2',
  },
  statusTime: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusIcons: {
    fontSize: 10,
  },
  appHeader: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  appLogo: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  searchLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
  },
  resultCard: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  resultDates: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  matchPill: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1565c0',
  },
});

export const LandingPage: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Show sticky CTA bar after 10 seconds
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const timer = setTimeout(() => setShowStickyBar(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  // Inject SEO meta tags on component mount (web only)
  useEffect(() => {
    if (Platform.OS === 'web') {
      injectSEOMetaTags();
    }

    // Cleanup function to reset title when component unmounts
    return () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.title = 'TravalPass';
      }
    };
  }, []);

  // Note: Auth redirect is handled by AppNavigator's RootNavigator
  // The landing page should only render when user is not authenticated
  // No need for useEffect redirect here - let the navigator handle it

  // Only render on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  const handleGetStarted = () => {
    navigation.navigate('Auth', 'register');
  };

  const handleSignIn = () => {
    navigation.navigate('Auth', 'login');
  };

  const scrollViewContent = (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header Navigation */}
      <View style={styles.header}>
        <View style={styles.headerContainer}>
          <Text style={styles.logo}>TravalPass</Text>
          <TouchableOpacity onPress={handleSignIn}>
            <Text style={styles.headerSignIn}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #1a365d 50%, #1e4e8c 100%)',
        paddingTop: 100,
        paddingBottom: 60,
      }}>
        <View style={styles.heroContent}>
          <View style={styles.heroTextSide}>
            <Text style={styles.heroTitle}>
              Planning a trip solo?
            </Text>
            <Text style={styles.heroSubtitle}>
              We match you with travelers going to the same place, on the same dates, with the same interests. Not just a profile — a real travel partner.
            </Text>

            <TouchableOpacity
              style={styles.heroCta}
              onPress={handleGetStarted}
              accessibilityLabel="Create your trip plan on TravalPass"
            >
              <Text style={styles.heroCtaText}>Create My Trip Plan</Text>
            </TouchableOpacity>

            <Text style={styles.microIncentive}>✨ Free · No credit card · Under 60 seconds</Text>

            {/* App Store Download Buttons */}
            {Platform.OS === 'web' && (
              <View style={styles.appStoreContainer}>
                <a
                  href="https://apps.apple.com/us/app/travalpass-traval-together/id6756789856"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download TravalPass on the App Store"
                  style={{ textDecoration: 'none', marginRight: 16 }}
                >
                  <Image
                    source={{ uri: 'https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg' }}
                    style={styles.appStoreBadge}
                    accessibilityLabel="Download on the App Store"
                  />
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.travalpass.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Get TravalPass on Google Play"
                  style={{ textDecoration: 'none' }}
                >
                  <Image
                    source={{ uri: 'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png' }}
                    style={styles.playStoreBadge}
                    accessibilityLabel="Get it on Google Play"
                  />
                </a>
              </View>
            )}
          </View>

          <View style={styles.heroVisualSide}>
            <Image 
              source={{ uri: '/Matching.png' }}
              style={styles.heroImage}
              accessibilityLabel="Example showing two travelers matched because their Paris itineraries overlap"
              resizeMode="contain"
            />
          </View>
        </View>
      </div>

      {/* Demo Videos — 3 focused tutorials */}
      <View style={[styles.section, styles.demoSection]}>
        <View style={styles.sectionContainer}>
          <Text style={styles.mainTitle}>See TravalPass in Action</Text>
          <Text style={styles.demoSubtitle}>
            Short demos. Real features. See exactly how it works.
          </Text>

          {Platform.OS === 'web' && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '32px',
              marginTop: '32px',
            }}>
              {/* Video 1 — Matching */}
              <div style={{ textAlign: 'center', maxWidth: '300px', flex: '1 1 280px' }}>
                <video
                  controls
                  preload="metadata"
                  playsInline
                  poster="/Matching-poster.jpg"
                  style={{
                    width: '100%',
                    maxWidth: '300px',
                    height: '534px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    backgroundColor: '#000',
                    objectFit: 'cover',
                  }}
                  aria-label="Demo: How to find your travel match on TravalPass"
                >
                  <source src="/Matching.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <p style={{ marginTop: '12px', fontWeight: 700, fontSize: '16px', color: '#1a1a1a' }}>Find Your Match</p>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>See how we connect you with travelers going to the same place.</p>
              </div>

              {/* Video 2 — AI Itinerary */}
              <div style={{ textAlign: 'center', maxWidth: '300px', flex: '1 1 280px' }}>
                <video
                  controls
                  preload="metadata"
                  playsInline
                  poster="/AIItineraryCreation-poster.jpg"
                  style={{
                    width: '100%',
                    maxWidth: '300px',
                    height: '534px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    backgroundColor: '#000',
                    objectFit: 'cover',
                  }}
                  aria-label="Demo: AI-powered itinerary creation on TravalPass"
                >
                  <source src="/AIItineraryCreation.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <p style={{ marginTop: '12px', fontWeight: 700, fontSize: '16px', color: '#1a1a1a' }}>AI Plans Your Trip</p>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Create a personalized itinerary in seconds with AI.</p>
              </div>

              {/* Video 3 — Manual Itinerary */}
              <div style={{ textAlign: 'center', maxWidth: '300px', flex: '1 1 280px' }}>
                <video
                  controls
                  preload="metadata"
                  playsInline
                  poster="/ManuallyItinerary-poster.jpg"
                  style={{
                    width: '100%',
                    maxWidth: '300px',
                    height: '534px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    backgroundColor: '#000',
                    objectFit: 'cover',
                  }}
                  aria-label="Demo: Manually creating an itinerary on TravalPass"
                >
                  <source src="/ManuallyItinerary.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <p style={{ marginTop: '12px', fontWeight: 700, fontSize: '16px', color: '#1a1a1a' }}>Build It Your Way</p>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Prefer full control? Create your own itinerary step by step.</p>
              </div>
            </div>
          )}
        </View>
      </View>

      {/* Problem → Solution Section */}
      <View style={styles.section} nativeID="how-it-works">
        <View style={styles.sectionContainer}>
          <View style={styles.twoColumnLayout}>
            <View style={styles.column}>
              <AppScreenMockup />
            </View>

            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Stop Planning Alone. Find Your Vacation Companion.</Text>
              <Text style={styles.sectionText}>
                Whether you're a solo traveler seeking a travel buddy or planning a group adventure, TravalPass connects you with compatible vacation companions. Share travel tips, build collaborative itineraries with your travel partner, and explore destinations together safely.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
                <Text style={styles.primaryButtonText}>Create Your Free Travel Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Feature Highlights */}
      <View style={[styles.section, styles.featuresSection]}>
        <View style={styles.sectionContainer}>
          <Text style={styles.mainTitle}>Your Complete Travel Companion Platform</Text>

          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>✈️</Text>
              <Text style={styles.featureTitle}>AI Travel Itineraries</Text>
              <Text style={styles.featureText}>
                Get personalized travel itineraries with destinations, activities, and tips powered by AI.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>👥</Text>
              <Text style={styles.featureTitle}>Find Travel Buddies</Text>
              <Text style={styles.featureText}>
                Connect with travel companions headed to the same destination during your travel dates.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🏨</Text>
              <Text style={styles.featureTitle}>Smart Search</Text>
              <Text style={styles.featureText}>
                Find and compare flights, stays, and attractions in one place.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>💬</Text>
              <Text style={styles.featureTitle}>Connect & Chat</Text>
              <Text style={styles.featureText}>
                Talk to your matches before your trip and plan together.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* FAQ Section */}
      <View style={[styles.section, styles.faqSection]}>
        <View style={styles.sectionContainer}>
          <Text style={styles.mainTitle}>Frequently Asked Questions</Text>

          <View style={styles.faqGrid}>
            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Is this a dating app?</Text>
              <Text style={styles.faqAnswer}>
                No. TravalPass matches you by itinerary — same destination, overlapping dates, and shared travel interests. There are no swipe mechanics or romance features. It's built for people who want a travel companion, not a date.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Is it safe to travel with someone I met online?</Text>
              <Text style={styles.faqAnswer}>
                Safety is our top priority. You chat inside the app before sharing any personal info. You choose who to connect with and when to meet. We also provide safety guidelines and encourage video calls before any trip. Many solo female travelers use TravalPass specifically because the matching is trip-based, not profile-based.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>How is this different from Facebook travel groups?</Text>
              <Text style={styles.faqAnswer}>
                Facebook groups are noisy — spam, scams, people who say they're interested but never follow through. TravalPass matches you with travelers who have actual trip plans with real dates and destinations. No posting into the void. No fake profiles promoting WhatsApp links.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>What does it cost?</Text>
              <Text style={styles.faqAnswer}>
                Creating an account, building itineraries, and matching with travelers is completely free. Premium features like AI-generated itineraries and unlimited matches are available through affordable subscription plans. No surprises — you can see pricing before you pay anything.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>What if my match doesn't follow through?</Text>
              <Text style={styles.faqAnswer}>
                We hear you — that's the #1 frustration in travel groups. TravalPass only matches you with people who've entered specific dates and destinations, so they have real plans. You can also see their match score and chat before committing to anything.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Can I use it for solo travel too?</Text>
              <Text style={styles.faqAnswer}>
                Absolutely. Many users travel solo and use TravalPass to optionally meet up with compatible travelers at their destination. You're never obligated to travel together — it's about having the option when you want it.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* CTA Footer */}
      <View style={styles.ctaSection}>
        <View style={styles.sectionContainer}>
          <Text style={styles.ctaTitle}>
            Join thousands of travelers planning their next adventure.
          </Text>

          <TouchableOpacity style={styles.ctaButton} onPress={handleGetStarted}>
            <Text style={styles.ctaButtonText}>Sign Up Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signInLink} onPress={handleSignIn}>
            <Text style={styles.signInLinkText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => setShowPrivacyModal(true)} style={styles.legalLink}>
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>•</Text>
            <TouchableOpacity onPress={() => setShowTermsModal(true)} style={styles.legalLink}>
              <Text style={styles.legalLinkText}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>•</Text>
            <TouchableOpacity onPress={() => setShowSafetyModal(true)} style={styles.legalLink}>
              <Text style={styles.legalLinkText}>Safety Guidelines</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>•</Text>
            <TouchableOpacity onPress={() => setShowCookieModal(true)} style={styles.legalLink}>
              <Text style={styles.legalLinkText}>Cookie Policy</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerText}>© 2026 TravalPass. All rights reserved.</Text>
        </View>
      </View>
    </ScrollView>
    </>
  );

  // On web, wrap in a div with proper height to enable scrolling
  if (Platform.OS === 'web') {
    return (
      <>
        <div style={{ 
          height: '100vh', 
          overflow: 'auto', 
          position: 'relative',
          width: '100%',
          maxWidth: '100vw',
          overflowX: 'hidden'
        }}>
          {scrollViewContent}
        </div>

        {/* Sticky bottom CTA bar — appears after 10s */}
        {showStickyBar && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(25, 118, 210, 0.97)',
              backdropFilter: 'blur(8px)',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              zIndex: 50,
              boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            }}
            role="complementary"
            aria-label="Sign up prompt"
          >
            <span style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>
              Still deciding? Create a free trip plan in 60 seconds.
            </span>
            <button
              onClick={() => navigation.navigate('Auth', 'register')}
              style={{
                backgroundColor: '#fff',
                color: '#1976d2',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              aria-label="Create your free trip plan"
            >
              Get Started Free
            </button>
            <button
              onClick={() => setShowStickyBar(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
                lineHeight: 1,
              }}
              aria-label="Dismiss sign up prompt"
            >
              ×
            </button>
          </div>
        )}

        {/* Legal Modals */}
        <PrivacyPolicyModal visible={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
        <TermsOfServiceModal visible={showTermsModal} onClose={() => setShowTermsModal(false)} />
        <SafetyGuidelinesModal visible={showSafetyModal} onClose={() => setShowSafetyModal(false)} />
        <CookiePolicyModal visible={showCookieModal} onClose={() => setShowCookieModal(false)} />
      </>
    );
  }

  return scrollViewContent;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
    paddingVertical: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSignIn: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  heroSection: {
    minHeight: 600,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    paddingHorizontal: 20,
    maxWidth: 1200,
    width: '100%',
    marginHorizontal: 'auto',
    flexDirection: width < 768 ? 'column' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 40,
    zIndex: 2,
  },
  heroTextSide: {
    flex: 1,
    maxWidth: width < 768 ? '100%' : 560,
    alignItems: width < 768 ? 'center' : 'flex-start',
  },
  heroVisualSide: {
    flex: 1,
    maxWidth: 480,
    alignItems: 'center',
  },
  heroImage: {
    width: '100%',
    maxWidth: 460,
    height: 'auto',
    aspectRatio: 1,
  },
  heroTitle: {
    fontSize: width < 768 ? 28 : width < 1024 ? 36 : 46,
    fontWeight: '800',
    color: '#fff',
    textAlign: width < 768 ? 'center' : 'left',
    marginBottom: 16,
    lineHeight: width < 768 ? 36 : width < 1024 ? 46 : 58,
  },
  heroSubtitle: {
    fontSize: width < 768 ? 16 : 18,
    color: 'rgba(255,255,255,0.85)',
    textAlign: width < 768 ? 'center' : 'left',
    marginBottom: 24,
    lineHeight: 28,
    maxWidth: 520,
  },
  heroCta: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  heroCtaText: {
    color: '#1976d2',
    fontSize: 20,
    fontWeight: '700',
  },
  microIncentive: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 12,
    textAlign: width < 768 ? 'center' : 'left',
  },
  buttonContainer: {
    flexDirection: width < 768 ? 'column' : 'row',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '100%',
  },
  primaryButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 5,
    maxWidth: '100%',
    flexShrink: 1,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  appStoreContainer: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  appStoreBadge: {
    height: 50,
    width: 150,
    resizeMode: 'contain',
  },
  playStoreBadge: {
    height: 74,
    width: 200,
    resizeMode: 'contain',
  },
  section: {
    paddingVertical: 80,
    backgroundColor: 'rgba(245, 245, 245, 0.95)',
  },
  sectionContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  twoColumnLayout: {
    flexDirection: width < 768 ? 'column' : 'row',
    gap: 32,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 16,
  },
  sectionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: width < 768 ? 24 : 40,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 48,
    width: '100%',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  featuresSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
  },
  featureCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: width < 768 ? '100%' : width < 1024 ? '48%' : '23%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: 16,
    textAlign: 'center',
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  demoSection: {
    backgroundColor: 'rgba(245, 245, 245, 0.95)',
  },
  demoSubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  faqSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  faqGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
  },
  faqCard: {
    backgroundColor: '#f9f9f9',
    padding: 24,
    borderRadius: 12,
    width: width < 768 ? '100%' : '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  faqQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    lineHeight: 24,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  ctaSection: {
    paddingVertical: 80,
    backgroundColor: 'rgba(25, 118, 210, 0.95)',
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: width < 768 ? 20 : 36,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
    width: '100%',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  ctaButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 16,
    alignSelf: 'center',
    minWidth: 200,
    maxWidth: 400,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#1976d2',
    fontSize: 18,
    fontWeight: '600',
  },
  signInLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
  },
  signInLinkText: {
    color: '#fff',
    fontSize: 16,
  },
  footer: {
    paddingVertical: 32,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    alignItems: 'center',
  },
  footerContent: {
    alignItems: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  legalLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  legalLinkText: {
    color: '#1976d2',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
});

export default LandingPage;
