/**
 * LandingPage.web.tsx - Web-only landing page
 * 
 * CRO-optimized landing page matching the travalpass-redesign.html mockup exactly.
 * Uses CSS-in-JS via injected <style> for proper responsive media queries.
 * Only rendered when Platform.OS === 'web' and user is not authenticated.
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  View,
  Text,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { PrivacyPolicyModal } from '../components/modals/legal/PrivacyPolicyModal';
import { TermsOfServiceModal } from '../components/modals/legal/TermsOfServiceModal';
import { SafetyGuidelinesModal } from '../components/modals/legal/SafetyGuidelinesModal';
import { CookiePolicyModal } from '../components/modals/legal/CookiePolicyModal';

// Base URL for meta tags
const BASE_URL = 'https://travalpass.com';

// ── SEO meta tags injection ─────────────────────────────────────────────
const injectSEOMetaTags = () => {
  if (typeof document === 'undefined') return;
  document.title = 'TravalPass — Planning a Trip Solo? Find Your Travel Match';

  const setMetaTag = (name: string, content: string, useProperty?: boolean) => {
    const selector = useProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let meta = document.querySelector(selector) as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      if (useProperty) meta.setAttribute('property', name);
      else meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }
    meta.content = content;
  };

  setMetaTag('description', 'Planning a trip solo? TravalPass matches you with travelers going to the same destination, on the same dates. Not a dating app — a real travel companion platform.');
  setMetaTag('keywords', 'travel companions, travel buddies, vacation buddy, vacation companions, trip companion, trip partner, travel partner, adventure companions, solo traveler, solo travel, travel match, travel matching, AI itinerary, travel planning, travel tips, find travel companions, trip planner, vacation planning');
  setMetaTag('og:type', 'website', true);
  setMetaTag('og:url', `${BASE_URL}/`, true);
  setMetaTag('og:title', 'Planning a Trip Solo? Find Your Travel Match | TravalPass', true);
  setMetaTag('og:description', 'Match with travelers by destination and dates. Create AI itineraries. Chat safely. Free to start.', true);
  setMetaTag('og:image', `${BASE_URL}/assets/icon.png`, true);
  setMetaTag('og:site_name', 'TravalPass', true);
  setMetaTag('twitter:card', 'summary_large_image');
  setMetaTag('twitter:url', `${BASE_URL}/`);
  setMetaTag('twitter:title', 'Planning a Trip Solo? Find Your Travel Match | TravalPass');
  setMetaTag('twitter:description', 'Match with travelers by destination and dates. Create AI itineraries. Chat safely. Free to start.');
  setMetaTag('twitter:image', `${BASE_URL}/assets/icon.png`);

  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = `${BASE_URL}/`;
};

// ── CSS injection (proper media queries for responsiveness) ─────────────
const LANDING_CSS = `
/* ═══ RESET & VARIABLES ═══ */
.lp-root {
  --navy: #0d1b35;
  --navy-light: #162444;
  --blue: #1565c0;
  --blue-hover: #1976d2;
  --blue-light: #e3f2fd;
  --blue-mid: #bbdefb;
  --green: #43a047;
  --green-light: #e8f5e9;
  --green-border: #a5d6a7;
  --text: #212121;
  --text-2: #5f6368;
  --text-3: #9aa0a6;
  --border: #e0e0e0;
  --bg-gray: #f5f7fa;
  --white: #ffffff;

  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--text);
  background: var(--white);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  font-size: 16px;
  /* Portal renders this directly into body - take full viewport */
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  min-height: 100%;
  overflow-x: hidden;
}
.lp-root *, .lp-root *::before, .lp-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

.lp-container { max-width: 1600px; margin: 0 auto; padding: 0 clamp(0.5rem, 1.2vw, 1rem); }

/* ─── TOP MARQUEE ─── */
.lp-top-marquee {
  background: var(--blue);
  padding: 10px 0;
  overflow: hidden;
  white-space: nowrap;
}
.lp-top-marquee-track {
  display: inline-flex;
  align-items: center;
  animation: lp-marquee 22s linear infinite;
}
.lp-top-marquee-track:hover { animation-play-state: paused; }
.lp-top-marquee-item {
  font-size: 15px;
  font-weight: 500;
  color: #e3f2fd;
  letter-spacing: 0.4px;
  padding: 0 8px;
}
.lp-top-marquee-item strong { color: #fff; font-weight: 700; }
.lp-top-marquee-sep { color: rgba(255,255,255,0.35); font-size: 14px; padding: 0 12px; }

@keyframes lp-marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

/* ─── NAV ─── */
.lp-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--white);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.lp-nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 76px;
}
.lp-nav-logo {
  font-size: 28px;
  font-weight: 800;
  color: var(--navy);
  text-decoration: none;
  letter-spacing: -0.3px;
}
.lp-nav-logo span { color: var(--blue); }
.lp-nav-links {
  display: flex;
  gap: 28px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.lp-nav-links a {
  font-size: 17px;
  color: var(--text-2);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s;
}
.lp-nav-links a:hover { color: var(--text); }
.lp-nav-cta { display: flex; align-items: center; gap: 12px; }
.lp-nav-signin {
  font-size: 17px;
  color: var(--blue);
  font-weight: 600;
  text-decoration: none;
  padding: 10px 0;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}
.lp-nav-signin:hover { text-decoration: underline; }
.lp-nav-btn {
  background: var(--blue);
  color: var(--white);
  padding: 14px 28px;
  font-size: 17px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  transition: background 0.15s, box-shadow 0.15s;
}
.lp-nav-btn:hover { background: var(--blue-hover); box-shadow: 0 4px 14px rgba(21,101,192,0.35); }
.lp-nav-btn:active { transform: scale(0.98); }

/* ─── PROOF TICKER ─── */
.lp-proof-ticker {
  background: var(--green-light);
  border-bottom: 1px solid var(--green-border);
  padding: 12px 0;
}
.lp-proof-ticker-inner {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}
.lp-ticker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  color: #2e7d32;
  font-weight: 500;
}
.lp-ticker-dot {
  width: 10px;
  height: 10px;
  background: var(--green);
  border-radius: 50%;
  flex-shrink: 0;
  animation: lp-pulse 2s infinite;
}
@keyframes lp-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}
.lp-ticker-sep { color: #a5d6a7; margin: 0 12px; font-size: 18px; }

/* ─── HERO ─── */
.lp-hero {
  background: var(--white);
  padding: 80px 0 72px;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
}
.lp-hero::before {
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 60%;
  height: 100%;
  background: radial-gradient(ellipse at top right, rgba(21,101,192,0.06) 0%, transparent 65%);
  pointer-events: none;
}
.lp-hero-grid {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 56px;
  align-items: center;
  position: relative;
}
.lp-hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--green-light);
  border: 1px solid var(--green-border);
  border-radius: 100px;
  padding: 10px 20px;
  font-size: 16px;
  color: #2e7d32;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 26px;
}
.lp-hero-eyebrow-dot { width: 6px; height: 6px; background: var(--green); border-radius: 50%; }
.lp-hero-h1 {
  font-size: 56px;
  font-weight: 800;
  color: var(--navy);
  line-height: 1.15;
  margin: 0 0 22px;
  letter-spacing: -0.5px;
}
.lp-hero-h1 .accent { color: var(--blue); }
.lp-hero-sub {
  font-size: 21px;
  color: var(--text-2);
  line-height: 1.7;
  margin: 0 0 32px;
  max-width: 540px;
}
.lp-hero-steps {
  list-style: none;
  margin: 0 0 32px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.lp-hero-steps li {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 20px;
  color: var(--text);
}
.lp-step-badge {
  width: 36px;
  height: 36px;
  background: var(--blue);
  color: var(--white);
  border-radius: 50%;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Avatar cluster */
.lp-avatar-cluster {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.lp-avatars { display: flex; align-items: center; }
.lp-av {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid var(--white);
  margin-left: -10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  flex-shrink: 0;
}
.lp-av:first-child { margin-left: 0; }
.lp-av-a { background: #ffd54f; color: #5d4037; }
.lp-av-b { background: #80cbc4; color: #004d40; }
.lp-av-c { background: #ef9a9a; color: #b71c1c; }
.lp-av-d { background: #ce93d8; color: #4a148c; }
.lp-av-e { background: #90caf9; color: #0d47a1; }
.lp-cluster-text { font-size: 17px; color: var(--text-2); line-height: 1.5; }
.lp-cluster-text strong { color: var(--text); }

/* Hero CTA */
.lp-hero-cta-group { display: flex; flex-direction: column; gap: 10px; }
.lp-hero-cta-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.lp-btn-primary-lg {
  background: var(--blue);
  color: var(--white);
  padding: 22px 44px;
  font-size: 21px;
  border-radius: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
}
.lp-btn-primary-lg:hover { background: var(--blue-hover); box-shadow: 0 6px 20px rgba(21,101,192,0.4); }
.lp-btn-primary-lg:active { transform: scale(0.98); }
.lp-hero-microcopy { display: flex; gap: 18px; flex-wrap: wrap; }
.lp-hero-microcopy span {
  font-size: 16px;
  color: var(--text-2);
  display: flex;
  align-items: center;
  gap: 6px;
}
.lp-hero-microcopy .check { color: var(--green); font-size: 17px; }

/* ─── UGC VIDEO ─── */
.lp-ugc-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.lp-ugc-phone {
  width: 260px;
  background: #111;
  border-radius: 38px;
  border: 3px solid #2a2a2a;
  box-shadow: 0 32px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08);
  overflow: hidden;
  position: relative;
}
.lp-ugc-notch {
  width: 80px;
  height: 10px;
  background: #111;
  border-radius: 0 0 12px 12px;
  margin: 10px auto 0;
  position: relative;
  z-index: 2;
}
.lp-ugc-screen {
  width: 100%;
  aspect-ratio: 9/16;
  position: relative;
  overflow: hidden;
  background: #000;
}
.lp-ugc-screen video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.lp-ugc-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px 14px 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
  z-index: 3;
}
.lp-ugc-user-row { display: flex; align-items: center; gap: 8px; }
.lp-ugc-av {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--blue);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid rgba(255,255,255,0.4);
  flex-shrink: 0;
}
.lp-ugc-username { font-size: 12px; font-weight: 700; color: #fff; }
.lp-ugc-dest-tag { font-size: 11px; color: rgba(255,255,255,0.75); margin-top: 1px; }
.lp-mute-toggle {
  position: absolute;
  top: 20px;
  right: 10px;
  z-index: 4;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.25);
  color: #fff;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  padding: 0;
  line-height: 1;
}
.lp-mute-toggle:hover {
  background: rgba(0,0,0,0.7);
}
.lp-ugc-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
}
.lp-active-dot {
  width: 6px;
  height: 6px;
  background: var(--green);
  border-radius: 50%;
  flex-shrink: 0;
}

/* ─── ACTIVE USERS STRIP ─── */
.lp-users-strip { padding: 48px 0; background: var(--white); }
.lp-users-strip-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 8px;
}
.lp-users-strip-header h2 { font-size: 28px; font-weight: 700; color: var(--text); margin: 0; }
.lp-see-all {
  font-size: 16px;
  color: var(--blue);
  font-weight: 600;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}
.lp-see-all:hover { text-decoration: underline; }
.lp-user-cards {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.lp-user-card {
  flex-shrink: 0;
  width: 200px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 22px 20px;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.lp-user-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.09); border-color: #bdbdbd; }
.lp-uc-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
}
.lp-uc-name { font-size: 18px; font-weight: 600; color: var(--text); margin: 0; }
.lp-uc-dest { font-size: 15px; color: var(--text-2); margin: 3px 0 0; }
.lp-uc-active {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: var(--green);
  font-weight: 500;
  margin-top: 10px;
}
.lp-uc-more {
  border-style: dashed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--bg-gray);
  cursor: pointer;
}
.lp-uc-more:hover { background: var(--blue-light); border-color: var(--blue-mid); }
.lp-uc-more-count { font-size: 28px; font-weight: 800; color: var(--blue); margin: 0; }
.lp-uc-more-label { font-size: 14px; color: var(--text-2); text-align: center; line-height: 1.4; margin: 0; }

/* ─── TESTIMONIAL ─── */
.lp-testimonial-section { padding: 64px 0; background: var(--bg-gray); text-align: center; }
.lp-section-eyebrow {
  font-size: 15px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--blue);
  margin: 0 0 10px;
}
.lp-section-h2 {
  font-size: 40px;
  font-weight: 800;
  color: var(--text);
  margin: 0 0 14px;
  letter-spacing: -0.3px;
  line-height: 1.2;
}
.lp-testimonial-wrap { display: flex; justify-content: center; margin-top: 40px; }
.lp-testimonial {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 40px;
  max-width: 640px;
  width: 100%;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  text-align: left;
}
.lp-test-stars { color: #f9a825; font-size: 28px; margin: 0 0 16px; letter-spacing: 4px; }
.lp-test-quote {
  font-size: 21px;
  color: var(--text);
  line-height: 1.75;
  font-style: italic;
  margin: 0 0 24px;
}
.lp-test-author { display: flex; align-items: center; gap: 12px; }
.lp-test-av {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--blue-light);
  color: var(--blue);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 20px;
  flex-shrink: 0;
}
.lp-test-name { font-size: 18px; font-weight: 700; color: var(--text); margin: 0; }
.lp-test-meta { font-size: 15px; color: var(--text-3); margin: 3px 0 0; }
.lp-verified-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--green-light);
  color: #2e7d32;
  font-size: 14px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 100px;
  margin-top: 3px;
}

/* ─── HOW IT WORKS ─── */
.lp-how-section { padding: 64px 0; }
.lp-how-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  margin-top: 40px;
}
.lp-how-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 36px 28px;
  text-align: center;
}
.lp-how-num {
  width: 40px;
  height: 40px;
  background: var(--blue);
  color: var(--white);
  border-radius: 50%;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
}
.lp-how-title { font-size: 22px; font-weight: 700; color: var(--text); margin: 0 0 10px; }
.lp-how-desc { font-size: 18px; color: var(--text-2); line-height: 1.65; margin: 0; }

/* ─── CTA BLOCK ─── */
.lp-cta-block {
  background: var(--blue);
  padding: 72px 0;
  text-align: center;
}
.lp-cta-block h2 {
  font-size: 42px;
  font-weight: 800;
  color: var(--white);
  margin: 0 0 14px;
  letter-spacing: -0.3px;
}
.lp-cta-block .lp-cta-sub {
  font-size: 21px;
  color: #bbdefb;
  margin: 0 0 32px;
}
.lp-cta-block .lp-cta-label {
  font-size: 14px;
  color: #90caf9;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin: 0 0 8px;
}
.lp-cta-btn-white {
  background: var(--white);
  color: var(--blue);
  padding: 22px 44px;
  font-size: 21px;
  border-radius: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
}
.lp-cta-btn-white:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
.lp-cta-btn-white:active { transform: scale(0.98); }
.lp-cta-microcopy {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.lp-cta-microcopy span {
  font-size: 16px;
  color: #bbdefb;
  display: flex;
  align-items: center;
  gap: 5px;
}
.lp-cta-microcopy .check { color: #a5d6a7; font-size: 17px; }

/* ─── FAQ ─── */
.lp-faq-section { padding: 64px 0; text-align: center; }
.lp-faq-list {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
  text-align: left;
}
.lp-faq-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--white);
}
.lp-faq-q {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px 24px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  user-select: none;
  gap: 12px;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  font-family: inherit;
  line-height: 1.4;
}
.lp-faq-q:hover { background: var(--bg-gray); }
.lp-faq-chevron {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  color: var(--text-2);
  transition: transform 0.2s;
}
.lp-faq-item.open .lp-faq-chevron { transform: rotate(180deg); }
.lp-faq-a {
  display: none;
  padding: 0 24px 22px;
  font-size: 18px;
  color: var(--text-2);
  line-height: 1.7;
  border-top: 1px solid var(--border);
}
.lp-faq-item.open .lp-faq-a { display: block; }

/* ─── FOOTER ─── */
.lp-footer {
  background: var(--navy);
  padding: 48px 0;
  text-align: center;
}
.lp-footer-logo {
  font-size: 30px;
  font-weight: 800;
  color: var(--white);
  letter-spacing: -0.3px;
  margin: 0 0 12px;
}
.lp-footer-logo span { color: #64b5f6; }
.lp-footer-links {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.lp-footer-links button {
  font-size: 16px;
  color: #78909c;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}
.lp-footer-links button:hover { color: #b0bec5; }
.lp-footer-copy { font-size: 15px; color: #455a64; margin: 0; }

/* ─── STICKY BAR ─── */
.lp-sticky-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(21, 101, 192, 0.97);
  backdrop-filter: blur(8px);
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 50;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
}
.lp-sticky-bar span {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}
.lp-sticky-bar-btn {
  background: #fff;
  color: var(--blue);
  border: none;
  padding: 14px 28px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 17px;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}
.lp-sticky-bar-close {
  background: none;
  border: none;
  color: rgba(255,255,255,0.7);
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
}

/* ─── RESPONSIVE ─── */
/* Desktop: zoom up to match mockup */
@media (min-width: 769px) {
  .lp-root { zoom: 1.5; }
}
/* Tablet */
@media (max-width: 768px) {
  .lp-root { zoom: 1; }
  .lp-hero-grid { grid-template-columns: 1fr; gap: 32px; }
  .lp-hero { padding: 36px 0 32px; }
  .lp-hero::before { display: none; }
  .lp-hero-h1 { font-size: 32px; }
  .lp-hero-sub { font-size: 16px; max-width: 100%; }
  .lp-section-h2 { font-size: 26px; }
  .lp-cta-block h2 { font-size: 26px; }
  .lp-nav-links { display: none; }
  .lp-nav-btn { display: none; }
  .lp-nav-logo { font-size: 22px; }
  .lp-nav-inner { height: 56px; }
  .lp-nav-signin { font-size: 15px; }
  .lp-how-grid { grid-template-columns: 1fr; }
  .lp-ugc-phone { width: 240px; }
  .lp-ugc-wrap { margin-top: 8px; }
  .lp-hero-cta-row { justify-content: center; }
  .lp-hero-microcopy { justify-content: center; }
  .lp-avatar-cluster { justify-content: center; }
  .lp-hero-eyebrow { margin-left: auto; margin-right: auto; font-size: 12px; padding: 6px 14px; }
  .lp-hero-h1, .lp-hero-sub { text-align: center; }
  .lp-hero-steps { align-items: center; }
  .lp-hero-steps li { font-size: 15px; }
  .lp-step-badge { width: 26px; height: 26px; font-size: 12px; }
  .lp-cluster-text { text-align: center; font-size: 13px; }
  .lp-av { width: 32px; height: 32px; font-size: 11px; }
  .lp-btn-primary-lg { padding: 16px 28px; font-size: 16px; }
  .lp-hero-microcopy span { font-size: 12px; }
  .lp-hero-microcopy .check { font-size: 13px; }
  .lp-sticky-bar { padding: 10px 12px; gap: 8px; flex-wrap: nowrap; }
  .lp-sticky-bar span { font-size: 13px; flex: 1; }
  .lp-sticky-bar-btn { padding: 8px 16px; font-size: 13px; }
  .lp-container { padding: 0 16px; }
  .lp-user-card { width: 140px; padding: 14px 12px; }
  .lp-uc-avatar { width: 44px; height: 44px; font-size: 18px; }
  .lp-uc-name { font-size: 14px; }
  .lp-uc-dest { font-size: 12px; }
  .lp-uc-active { font-size: 10px; }
  .lp-users-strip-header h2 { font-size: 20px; }
  .lp-see-all { font-size: 13px; }
  .lp-testimonial { padding: 24px 20px; }
  .lp-test-stars { font-size: 18px; }
  .lp-test-quote { font-size: 15px; }
  .lp-test-av { width: 40px; height: 40px; font-size: 14px; }
  .lp-test-name { font-size: 14px; }
  .lp-test-meta { font-size: 11px; }
  .lp-section-eyebrow { font-size: 11px; }
  .lp-how-card { padding: 24px 20px; }
  .lp-how-num { width: 28px; height: 28px; font-size: 13px; }
  .lp-how-title { font-size: 16px; }
  .lp-how-desc { font-size: 14px; }
  .lp-cta-block { padding: 48px 0; }
  .lp-cta-block .lp-cta-sub { font-size: 15px; }
  .lp-cta-btn-white { padding: 16px 28px; font-size: 16px; }
  .lp-cta-microcopy span { font-size: 12px; }
  .lp-faq-q { font-size: 15px; padding: 16px 18px; }
  .lp-faq-a { font-size: 14px; padding: 0 18px 16px; }
  .lp-footer-logo { font-size: 22px; }
  .lp-footer-links button { font-size: 13px; }
  .lp-footer-copy { font-size: 11px; }
  .lp-top-marquee-item { font-size: 12px; }
  .lp-ticker-item { font-size: 13px; }
  .lp-ticker-sep { font-size: 14px; margin: 0 6px; }
  .lp-proof-ticker { padding: 8px 0; }
}
/* Small phone */
@media (max-width: 480px) {
  .lp-hero-h1 { font-size: 26px; }
  .lp-hero-sub { font-size: 15px; }
  .lp-section-h2 { font-size: 22px; }
  .lp-cta-block h2 { font-size: 22px; }
  .lp-btn-primary-lg { padding: 14px 24px; font-size: 15px; }
  .lp-ugc-phone { width: 200px; }
  .lp-user-card { width: 130px; padding: 12px 10px; }
  .lp-uc-avatar { width: 38px; height: 38px; font-size: 16px; }
  .lp-container { padding: 0 12px; }
  .lp-hero { padding: 28px 0 24px; }
  .lp-sticky-bar span { font-size: 12px; }
  .lp-sticky-bar-btn { padding: 8px 14px; font-size: 12px; }
}
`;

const injectCSS = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('lp-styles')) return;
  const style = document.createElement('style');
  style.id = 'lp-styles';
  style.textContent = LANDING_CSS;
  document.head.appendChild(style);
};

// ── Data ────────────────────────────────────────────────────────────────

const TRAVELERS = [
  { initial: 'S', name: 'Sara K.', dest: 'Tokyo · May 15–22', active: 'Active 4 min ago', bg: '#e3f2fd', color: '#1565c0' },
  { initial: 'M', name: 'Marco L.', dest: 'Bali · Jun 1–14', active: 'Active 11 min ago', bg: '#fff8e1', color: '#f57f17' },
  { initial: 'K', name: 'Kenji T.', dest: 'Lisbon · May 20–27', active: 'Active 28 min ago', bg: '#e8f5e9', color: '#2e7d32' },
  { initial: 'A', name: 'Aisha R.', dest: 'Barcelona · Jun 3–10', active: 'Active 1 hr ago', bg: '#fce4ec', color: '#c62828' },
  { initial: 'P', name: 'Priya S.', dest: 'Paris · May 25–Jun 2', active: 'Active 2 hr ago', bg: '#f3e5f5', color: '#7b1fa2' },
];

const FAQ_ITEMS = [
  { q: 'Is it really free?', a: 'Yes. Matching, messaging, and viewing itineraries is free forever. We offer premium features for travelers who want extra tools, but you can find a companion without spending a cent.' },
  { q: 'Are these real people or bots?', a: 'All profiles are verified by email. We review every account before it can send a match request. The "active X min ago" timestamps are real — we show them so you know who\'s actually here right now.' },
  { q: 'Is it safe to travel with someone I met online?', a: 'We let you see each other\'s full itinerary, read travel history, and chat before agreeing to anything. You\'re never locked in. Most travelers start with just a shared day trip before committing to anything longer.' },
  { q: 'What if no one matches my dates yet?', a: 'We notify you by email the moment a matching traveler signs up. Some matches happen instantly, others take a few days. You don\'t need to check the app — we alert you when someone matches your itinerary.' },
  { q: 'Do I need to download an app?', a: 'TravalPass works in your browser on any device. iOS and Android apps are also available on the App Store and Google Play.' },
];

// ── Component ───────────────────────────────────────────────────────────

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const { logEvent } = useAnalytics();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);

  const toggleMute = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const next = !vid.muted;
    vid.muted = next;
    setIsMuted(next);
    if (!next) vid.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    injectCSS();
    injectSEOMetaTags();
    logEvent('landing_page_view');
    const timer = setTimeout(() => setShowStickyBar(true), 10000);

    // Create portal container and override body styles
    const portal = document.createElement('div');
    portal.id = 'lp-portal';
    document.body.appendChild(portal);

    // Override expo-reset body styles so portal can scroll
    const prevOverflow = document.body.style.overflow;
    const prevHeight = document.body.style.height;
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    // Hide the RN Web root so only the portal shows
    const rnRoot = document.getElementById('root');
    if (rnRoot) rnRoot.style.display = 'none';

    // Trigger re-render to use portal
    setPortalContainer(portal);

    return () => {
      clearTimeout(timer);
      if (typeof document !== 'undefined') document.title = 'TravalPass';
      // Clean up portal
      if (portal.parentNode) portal.parentNode.removeChild(portal);
      setPortalContainer(null);
      // Restore body styles
      document.body.style.overflow = prevOverflow;
      document.body.style.height = prevHeight;
      if (rnRoot) rnRoot.style.display = '';
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGetStarted = useCallback((cta?: string) => {
    logEvent('landing_cta_click', { cta: cta ?? 'hero' });
    if (typeof window !== 'undefined') window.location.href = '/auth?mode=register';
  }, [logEvent]);

  const handleSignIn = useCallback(() => {
    logEvent('landing_cta_click', { cta: 'sign_in' });
    if (typeof window !== 'undefined') window.location.href = '/auth?mode=login';
  }, [logEvent]);

  const handleFaqToggle = useCallback((idx: number) => {
    setOpenFaq(prev => {
      const newIdx = prev === idx ? null : idx;
      if (newIdx !== null) logEvent('landing_faq_toggle', { question: FAQ_ITEMS[newIdx].q });
      return newIdx;
    });
  }, [logEvent]);

  if (Platform.OS !== 'web') return null;

  const landingContent = (
    <>
      <div className="lp-root" ref={rootRef}>
        {/* ════ TOP MARQUEE ════ */}
        <div className="lp-top-marquee">
          <div className="lp-top-marquee-track">
            {[1, 2, 3, 4].map(n => (
              <React.Fragment key={n}>
                <span className="lp-top-marquee-item"><strong>80+ Travellers Matched</strong></span>
                <span className="lp-top-marquee-sep">·</span>
                <span className="lp-top-marquee-item">Never Travel Alone</span>
                <span className="lp-top-marquee-sep">·</span>
                <span className="lp-top-marquee-item"><strong>Early Access to Perks</strong></span>
                <span className="lp-top-marquee-sep">·</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ════ NAV ════ */}
        <nav className="lp-nav">
          <div className="lp-container lp-nav-inner">
            <span className="lp-nav-logo">Traval<span>Pass</span></span>
            <ul className="lp-nav-links">
              <li><a href="#how">How it works</a></li>
              <li><a href="#destinations">Destinations</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
            <div className="lp-nav-cta">
              <button className="lp-nav-signin" onClick={handleSignIn}>Sign in</button>
              <button className="lp-nav-btn" onClick={() => handleGetStarted('nav')}>Match My Trip</button>
            </div>
          </div>
        </nav>

        {/* ════ PROOF TICKER ════ */}
        <div className="lp-proof-ticker">
          <div className="lp-proof-ticker-inner lp-container">
            <div className="lp-ticker-item">
              <div className="lp-ticker-dot" />
              <span><strong>80+</strong> travelers matched</span>
            </div>
            <span className="lp-ticker-sep">·</span>
            <div className="lp-ticker-item">
              <div className="lp-ticker-dot" />
              <span>Active now in <strong>Tokyo, Bali, Lisbon</strong></span>
            </div>
            <span className="lp-ticker-sep">·</span>
            <div className="lp-ticker-item">
              <div className="lp-ticker-dot" />
              <span>Avg match time: <strong>under 1 hr</strong></span>
            </div>
          </div>
        </div>

        {/* ════ HERO ════ */}
        <section className="lp-hero">
          <div className="lp-container lp-hero-grid">
            {/* Left: copy + CTA */}
            <div>
              <div className="lp-hero-eyebrow">
                <span className="lp-hero-eyebrow-dot" />
                Free forever · No card required
              </div>

              <h1 className="lp-hero-h1">
                Find your travel companion —<br />
                <span className="accent">same destination, same dates.</span>
              </h1>

              <p className="lp-hero-sub">
                We match solo travelers by itinerary, not just interest.
                See who's going to your destination before you even book.
              </p>

              <ul className="lp-hero-steps">
                <li><span className="lp-step-badge">1</span> Enter your destination + travel dates</li>
                <li><span className="lp-step-badge">2</span> See travelers with matching itineraries</li>
                <li><span className="lp-step-badge">3</span> Chat, plan, and travel together</li>
              </ul>

              {/* Avatar cluster */}
              <div className="lp-avatar-cluster">
                <div className="lp-avatars">
                  <div className="lp-av lp-av-a">S</div>
                  <div className="lp-av lp-av-b">M</div>
                  <div className="lp-av lp-av-c">K</div>
                  <div className="lp-av lp-av-d">A</div>
                  <div className="lp-av lp-av-e">R</div>
                </div>
                <div className="lp-cluster-text">
                  <strong>Sara, Marco, Kenji + 77 others</strong><br />
                  found travel companions on TravalPass
                </div>
              </div>

              <div className="lp-hero-cta-group">
                <div className="lp-hero-cta-row">
                  <button
                    className="lp-btn-primary-lg"
                    onClick={() => handleGetStarted('hero')}
                    aria-label="Match My Trip — Free Forever"
                  >
                    Match My Trip — Free Forever
                  </button>
                </div>
                <div className="lp-hero-microcopy">
                  <span><span className="check">✓</span> Free forever</span>
                  <span><span className="check">✓</span> No card required</span>
                  <span><span className="check">✓</span> Just your email</span>
                </div>
              </div>
            </div>

            {/* Right: UGC video */}
            <div>
              <div className="lp-ugc-wrap">
                <div className="lp-ugc-phone">
                  <div className="lp-ugc-notch" />
                  <div className="lp-ugc-screen">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      loop
                      playsInline
                      aria-label="TravalPass matching demo video"
                    >
                      <source src="/MatchingPromo.mp4" type="video/mp4" />
                    </video>
                    <button
                      className="lp-mute-toggle"
                      onClick={toggleMute}
                      aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                    >
                      {isMuted ? '🔇' : '🔊'}
                    </button>
                    <div className="lp-ugc-caption">
                      <div className="lp-ugc-user-row">
                        <div className="lp-ugc-av">M</div>
                        <div>
                          <div className="lp-ugc-username">@marco_travels</div>
                          <div className="lp-ugc-dest-tag">Tokyo with a stranger 🇯🇵</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lp-ugc-badge">
                  <div className="lp-active-dot" />
                  <span>Matched via TravalPass · Puerto Rico</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════ ACTIVE USERS ════ */}
        <section className="lp-users-strip" id="destinations">
          <div className="lp-container">
            <div className="lp-users-strip-header">
              <h2>Travelers looking for companions right now</h2>
              <button className="lp-see-all" onClick={() => handleGetStarted('see_all')}>See all →</button>
            </div>
            <div className="lp-user-cards">
              {TRAVELERS.map(t => (
                <div className="lp-user-card" key={t.name}>
                  <div className="lp-uc-avatar" style={{ background: t.bg, color: t.color }}>{t.initial}</div>
                  <p className="lp-uc-name">{t.name}</p>
                  <p className="lp-uc-dest">{t.dest}</p>
                  <div className="lp-uc-active">
                    <div className="lp-active-dot" />
                    {t.active}
                  </div>
                </div>
              ))}
              <div className="lp-user-card lp-uc-more" onClick={() => handleGetStarted('traveler_overflow')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleGetStarted('traveler_overflow'); }}>
                <p className="lp-uc-more-count">+76</p>
                <p className="lp-uc-more-label">more travelers<br />waiting for a match</p>
              </div>
            </div>
          </div>
        </section>

        {/* ════ TESTIMONIAL ════ */}
        <section className="lp-testimonial-section">
          <div className="lp-container">
            <p className="lp-section-eyebrow">What travelers say</p>
            <h2 className="lp-section-h2">Real matches. Real trips.</h2>
            <div className="lp-testimonial-wrap">
              <div className="lp-testimonial">
                <p className="lp-test-stars">★★★★★</p>
                <p className="lp-test-quote">
                  &ldquo;I was nervous about traveling to Tokyo alone. TravalPass matched me with Sara — we had the exact same dates and both wanted to visit Kyoto. We ended up spending 5 days together. It felt completely safe because we could see each other&rsquo;s full itinerary before saying yes.&rdquo;
                </p>
                <div className="lp-test-author">
                  <div className="lp-test-av">M</div>
                  <div>
                    <p className="lp-test-name">Marco L.</p>
                    <p className="lp-test-meta">Tokyo, Japan · March 2026</p>
                    <div className="lp-verified-badge">
                      <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor"><path d="M10 0l2.5 7.5H20l-6 4.5 2.5 7.5L10 15l-6.5 4.5 2.5-7.5L0 7.5h7.5z" /></svg>
                      Verified match
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════ HOW IT WORKS ════ */}
        <section className="lp-how-section" id="how">
          <div className="lp-container" style={{ textAlign: 'center' }}>
            <p className="lp-section-eyebrow">How it works</p>
            <h2 className="lp-section-h2">Match in minutes, not months</h2>
            <p style={{ fontSize: 16, color: '#5f6368', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
              No algorithm guessing. We match you by destination and dates — the only two things that actually matter for finding a travel companion.
            </p>
            <div className="lp-how-grid">
              <div className="lp-how-card">
                <div className="lp-how-num">1</div>
                <p className="lp-how-title">Enter your trip</p>
                <p className="lp-how-desc">Add your destination and travel dates. Takes 30 seconds. Free forever, no card required.</p>
              </div>
              <div className="lp-how-card">
                <div className="lp-how-num">2</div>
                <p className="lp-how-title">See your matches</p>
                <p className="lp-how-desc">We show you travelers going to the same place at the same time. See their full itinerary before deciding.</p>
              </div>
              <div className="lp-how-card">
                <div className="lp-how-num">3</div>
                <p className="lp-how-title">Chat and plan</p>
                <p className="lp-how-desc">Message matches directly. Plan shared days, split costs, or just have someone to explore with. You're in control.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ════ CTA BLOCK ════ */}
        <div className="lp-cta-block">
          <div className="lp-container">
            <p className="lp-cta-label">FREE FOREVER · NO CARD REQUIRED · 30 SECONDS</p>
            <h2>Ready to find your travel companion?</h2>
            <p className="lp-cta-sub">80+ travelers are already waiting. Enter your email and see who's going where you're going.</p>
            <button className="lp-cta-btn-white" onClick={() => handleGetStarted('footer_cta')}>
              Match My Trip — Free Forever
            </button>
            <div className="lp-cta-microcopy">
              <span><span className="check">✓</span> Free forever</span>
              <span><span className="check">✓</span> Cancel anytime</span>
              <span><span className="check">✓</span> No card required</span>
            </div>
          </div>
        </div>

        {/* ════ FAQ ════ */}
        <section className="lp-faq-section" id="faq">
          <div className="lp-container">
            <p className="lp-section-eyebrow">Frequently asked questions</p>
            <h2 className="lp-section-h2">Everything you need to know</h2>
            <div className="lp-faq-list">
              {FAQ_ITEMS.map((item, idx) => (
                <div className={`lp-faq-item${openFaq === idx ? ' open' : ''}`} key={idx}>
                  <button className="lp-faq-q" onClick={() => handleFaqToggle(idx)} aria-expanded={openFaq === idx}>
                    {item.q}
                    <svg className="lp-faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  <div className="lp-faq-a">{item.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════ FOOTER ════ */}
        <footer className="lp-footer">
          <div className="lp-container">
            <p className="lp-footer-logo">Traval<span>Pass</span></p>
            <div className="lp-footer-links">
              <button onClick={() => { const el = document.getElementById('how'); el?.scrollIntoView({ behavior: 'smooth' }); }}>How it works</button>
              <button onClick={() => { const el = document.getElementById('destinations'); el?.scrollIntoView({ behavior: 'smooth' }); }}>Destinations</button>
              <button onClick={() => setShowPrivacyModal(true)}>Privacy Policy</button>
              <button onClick={() => setShowTermsModal(true)}>Terms of Service</button>
              <button onClick={() => setShowSafetyModal(true)}>Safety Guidelines</button>
              <button onClick={() => setShowCookieModal(true)}>Cookie Policy</button>
            </div>
            <p className="lp-footer-copy">© 2026 TravalPass. All rights reserved.</p>
          </div>
        </footer>

        {/* ════ STICKY BAR ════ */}
        {showStickyBar && (
          <div className="lp-sticky-bar" role="complementary" aria-label="Sign up prompt">
            <span>Still deciding? Create a free trip plan in 60 seconds.</span>
            <button className="lp-sticky-bar-btn" onClick={() => handleGetStarted('sticky_bar')}>Get Started Free</button>
            <button className="lp-sticky-bar-close" onClick={() => setShowStickyBar(false)} aria-label="Dismiss">×</button>
          </div>
        )}
      </div>

      {/* Legal Modals */}
      <PrivacyPolicyModal visible={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
      <TermsOfServiceModal visible={showTermsModal} onClose={() => setShowTermsModal(false)} />
      <SafetyGuidelinesModal visible={showSafetyModal} onClose={() => setShowSafetyModal(false)} />
      <CookiePolicyModal visible={showCookieModal} onClose={() => setShowCookieModal(false)} />
    </>
  );

  // Render via portal directly into document.body to bypass RN Web's
  // constrained DOM tree (flex containers, overflow:hidden, etc.)
  if (portalContainer) {
    return ReactDOM.createPortal(landingContent, portalContainer);
  }

  // Fallback: render inline (first render before useEffect, or in tests)
  return landingContent;
};

export default LandingPage;
