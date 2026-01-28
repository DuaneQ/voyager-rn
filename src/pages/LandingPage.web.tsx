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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { PrivacyPolicyModal } from '../components/modals/legal/PrivacyPolicyModal';
import { TermsOfServiceModal } from '../components/modals/legal/TermsOfServiceModal';
import { SafetyGuidelinesModal } from '../components/modals/legal/SafetyGuidelinesModal';
import { CookiePolicyModal } from '../components/modals/legal/CookiePolicyModal';

const { width } = Dimensions.get('window');

// SEO meta tags injection helper for web
const injectSEOMetaTags = () => {
  if (typeof document === 'undefined') return;

  // Set page title
  document.title = 'TravalPass – Find Your Perfect Travel Companion | Travel Buddies & Itineraries';

  // Helper to set/update meta tag
  const setMetaTag = (name: string, content: string, property?: string) => {
    const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let meta = document.querySelector(selector) as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      if (property) {
        meta.setAttribute('property', name);
      } else {
        meta.setAttribute('name', name);
      }
      document.head.appendChild(meta);
    }
    meta.content = content;
  };

  // Primary Meta Tags
  setMetaTag('description', 'Find your perfect travel companion, vacation buddy, or trip partner on TravalPass. Connect with like-minded travelers, share itineraries, discover travel tips, and explore the world together safely. Join our community of travel companions today!');
  setMetaTag('keywords', 'travel companions, travel buddies, vacation buddy, vacation companions, trip companion, trip partner, travel partner, adventure companions, solo traveler, solo travel, travel match, travel matching, AI itinerary, travel planning, travel tips, find travel companions, trip planner, vacation planning');

  // Open Graph / Facebook
  setMetaTag('og:type', 'website', true);
  setMetaTag('og:url', 'https://app.travalpass.com/', true);
  setMetaTag('og:title', 'TravalPass - Find Travel Companions & Vacation Buddies | Travel Match Platform', true);
  setMetaTag('og:description', 'Find your perfect travel companion or vacation buddy. Travel match platform connecting adventure companions worldwide. Share itineraries, get travel tips, and explore together safely.', true);
  setMetaTag('og:image', 'https://app.travalpass.com/assets/icon.png', true);
  setMetaTag('og:site_name', 'TravalPass', true);

  // Twitter
  setMetaTag('twitter:card', 'summary_large_image', true);
  setMetaTag('twitter:url', 'https://app.travalpass.com/', true);
  setMetaTag('twitter:title', 'TravalPass - Find Travel Companions & Vacation Buddies | Travel Match Platform', true);
  setMetaTag('twitter:description', 'Find your perfect travel companion or vacation buddy. Travel match platform connecting adventure companions worldwide. Share itineraries, get travel tips, and explore together safely.', true);
  setMetaTag('twitter:image', 'https://app.travalpass.com/assets/icon.png', true);

  // Canonical URL
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = 'https://app.travalpass.com/';
};

export const LandingPage: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [videoError, setVideoError] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showCookieModal, setShowCookieModal] = useState(false);

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
    // @ts-ignore - Navigation types are complex, but this works at runtime
    navigation.navigate('Auth');
  };

  const handleSignIn = () => {
    // @ts-ignore - Navigation types are complex, but this works at runtime
    navigation.navigate('Auth');
  };

  const scrollToSection = (sectionId: string) => {
    if (typeof document !== 'undefined') {
      const element = document.getElementById(sectionId);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollViewContent = (
    <>
      {/* Video Background - matching PWA implementation */}
      {!videoError && Platform.OS === 'web' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          overflow: 'hidden',
        }}>
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            src="/TravalPass.mp4"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              minWidth: '100%',
              minHeight: '100%',
              width: 'auto',
              height: 'auto',
              transform: 'translate(-50%, -50%)',
              objectFit: 'cover',
            }}
            onError={(e) => {
              console.error('[LandingPage] Video error:', e);
              setVideoError(true);
            }}
          >
            <source src="/TravalPass.mp4" type="video/mp4" />
          </video>
        </div>
      )}
      
      {/* Fallback static background if video fails */}
      {videoError && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -2,
          overflow: 'hidden',
        }}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&auto=format&fit=crop&q=80',
            }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
              minWidth: '100%',
              minHeight: '100%',
              width: 'auto',
              height: 'auto',
            }}
          />
        </div>
      )}

      {/* Gradient overlay */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6))',
        zIndex: 0,
        pointerEvents: 'none',
      }} />

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
      <View style={styles.heroSection}>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Find Your Perfect Travel Companion</Text>
          <Text style={styles.heroSubtitle}>
            Connect with travel buddies and vacation companions headed to the same destination.
            Build AI-powered itineraries in seconds. Get expert travel tips. Find your perfect
            travel partner and explore the world together safely.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGetStarted}
              accessibilityLabel="Sign up for TravalPass"
            >
              <Text style={styles.primaryButtonText}>Get Started Free</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => scrollToSection('how-it-works')}
            >
              <Text style={styles.secondaryButtonText}>See How It Works</Text>
            </TouchableOpacity>
          </View>

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
      </View>

      {/* Problem → Solution Section */}
      <View style={styles.section} nativeID="how-it-works">
        <View style={styles.sectionContainer}>
          <View style={styles.twoColumnLayout}>
            <View style={styles.column}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop',
                }}
                style={styles.sectionImage}
                accessibilityLabel="Diverse group of friends planning travel together"
              />
            </View>

            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Stop Planning Alone. Find Your Vacation Companion.</Text>
              <Text style={styles.sectionText}>
                Whether you're a solo traveler seeking a travel buddy or planning a group adventure, TravalPass connects you with compatible vacation companions. Share travel tips, build collaborative itineraries with your travel partner, and explore destinations together safely. Join thousands who've found their perfect trip companion.
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

      {/* Demo Video Section */}
      <View style={[styles.section, styles.demoSection]}>
        <View style={styles.sectionContainer}>
          <Text style={styles.mainTitle}>See TravalPass in Action</Text>
          <Text style={styles.demoSubtitle}>
            Watch how easy it is to plan, match, and travel together.
          </Text>

          {Platform.OS === 'web' && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
              <iframe
                src="https://www.youtube.com/embed/hyRvN9cHtRM"
                title="TravalPass Tutorial - How to Find Travel Companions"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{
                  width: '100%',
                  maxWidth: '340px',
                  height: '600px',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  border: 0,
                }}
              />
            </div>
          )}
        </View>
      </View>

      {/* FAQ Section */}
      <View style={[styles.section, styles.faqSection]}>
        <View style={styles.sectionContainer}>
          <Text style={styles.mainTitle}>Frequently Asked Questions</Text>

          <View style={styles.faqGrid}>
            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>How do I find a travel companion on TravalPass?</Text>
              <Text style={styles.faqAnswer}>
                Simply create your free profile, enter your travel destination and dates, and our matching algorithm will connect you with compatible vacation companions heading to the same place. You can browse profiles, chat safely, and plan your adventure together.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Can I find a travel partner for international trips?</Text>
              <Text style={styles.faqAnswer}>
                Yes! TravalPass connects travelers worldwide. Whether you're planning a European backpacking adventure, an Asian cultural tour, or a South American expedition, you can find compatible travel partners who share your destination and travel dates.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Is TravalPass safe for solo travelers looking for travel buddies?</Text>
              <Text style={styles.faqAnswer}>
                Our secure chat system keeps your personal information private until you're ready to share. We also provide travel safety tips and best practices for meeting your trip companion.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>How does the AI itinerary planner work with my travel buddy?</Text>
              <Text style={styles.faqAnswer}>
                Our AI creates personalized itineraries based on both travelers' preferences. Share the itinerary with your vacation companion, collaborate on activities, and make real-time adjustments together. It's the perfect way to plan your trip with your travel partner.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>What's the difference between a travel companion and a vacation buddy?</Text>
              <Text style={styles.faqAnswer}>
                They're essentially the same! Whether you call them travel companions, vacation buddies, trip partners, or adventure companions, TravalPass helps you find like-minded travelers to share experiences with. Our platform matches you based on travel style, interests, and destination preferences.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Is TravalPass free for finding travel companions?</Text>
              <Text style={styles.faqAnswer}>
                Yes! Basic features including profile creation, travel companion matching, and secure messaging are completely free. Premium features like AI-powered itinerary generation and unlimited matches are available with our affordable subscription plans.
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
          <Text style={styles.footerText}>© 2025 TravalPass. All rights reserved.</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
    alignItems: 'center',
    zIndex: 2,
  },
  heroTitle: {
    fontSize: width < 768 ? 28 : width < 1024 ? 42 : 56,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    width: '100%',
    flexWrap: 'wrap',
  },
  heroSubtitle: {
    fontSize: width < 768 ? 16 : 20,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: width < 768 ? '100%' : 800,
    lineHeight: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    width: '100%',
    flexWrap: 'wrap',
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
  sectionImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  } as const,
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
