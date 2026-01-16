/**
 * Usage Tracking Hook - Exact replica of voyager-pwa useUsageTracking.ts
 * Handles daily usage limits for free users and premium subscription validation
 */

import { useState, useCallback, useEffect } from 'react';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import * as firebaseCfg from '../config/firebaseConfig';

const FREE_DAILY_LIMIT = 10;
const FREE_DAILY_AI_LIMIT = 5;
const PREMIUM_DAILY_AI_LIMIT = 20;

export const useUsageTracking = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  // Resolve the current user ID lazily so tests can alter the mocked
  // getAuthInstance/auth at runtime and the hook picks up the change.
  const getCurrentUserId = () => {
    const tentative = typeof (firebaseCfg as any).getAuthInstance === 'function'
      ? (firebaseCfg as any).getAuthInstance()
      : (firebaseCfg as any).auth;
    const effective = tentative && tentative.currentUser ? tentative : (firebaseCfg as any).auth;
    return effective?.currentUser?.uid;
  };

  // Get today's date in YYYY-MM-DD format (same as PWA)
  const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Load user profile from Firestore
  const loadUserProfile = useCallback(async () => {
    const userIdNow = getCurrentUserId();
    if (!userIdNow) return;

    try {
const docRef = doc((firebaseCfg as any).db, 'users', userIdNow);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }, []);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // Check if user is premium (same logic as PWA)
  const hasPremium = useCallback(() => {
    if (!userProfile) return false;
    if (userProfile.subscriptionType !== 'premium') return false;
    if (!userProfile.subscriptionEndDate) return false;
    
    // Handle Firestore Timestamp (same logic as PWA)
    const s: any = userProfile.subscriptionEndDate;
    let endDate: Date;
    if (s && typeof s.toDate === 'function') {
      endDate = s.toDate();
    } else if (s && typeof s.seconds === 'number') {
      endDate = new Date(s.seconds * 1000 + Math.floor((s.nanoseconds || 0) / 1e6));
    } else {
      endDate = new Date(s);
    }
    if (isNaN(endDate.getTime())) return false;
    return new Date() <= endDate;
  }, [userProfile]);

  // Check if daily limit reached (same logic as PWA)
  const hasReachedLimit = useCallback(() => {
    if (!userProfile) return false;
    if (hasPremium()) return false; // Premium users have unlimited views
    
    const today = getTodayString();
    const dailyUsage = userProfile.dailyUsage;
    
    if (!dailyUsage || dailyUsage.date !== today) return false;
    return dailyUsage.viewCount >= FREE_DAILY_LIMIT;
  }, [userProfile, hasPremium]);

  // Track a view (same logic as PWA)
  const trackView = useCallback(async (): Promise<boolean> => {
    const userIdNow = getCurrentUserId();
    if (!userIdNow) {
      console.error('No user ID or profile found');
      return false;
    }

    // Fetch fresh data from Firestore before checking limit
    try {
      const docRef = doc((firebaseCfg as any).db, 'users', userIdNow);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const freshProfile = docSnap.data();
        
        // Check if premium with fresh data (same logic as hasPremium())
        const s: any = freshProfile.subscriptionEndDate;
        let isPremium = false;
        if (freshProfile.subscriptionType === 'premium' && s) {
          let endDate: Date;
          if (typeof s.toDate === 'function') {
            endDate = s.toDate();
          } else if (typeof s.seconds === 'number') {
            endDate = new Date(s.seconds * 1000 + Math.floor((s.nanoseconds || 0) / 1e6));
          } else {
            endDate = new Date(s);
          }
          if (!isNaN(endDate.getTime()) && new Date() <= endDate) {
            isPremium = true;
          }
        }
        
        if (isPremium) return true; // Premium users unlimited
        
        // Check limit with fresh data
        const today = getTodayString();
        const dailyUsage = freshProfile.dailyUsage;
        if (dailyUsage && dailyUsage.date === today && dailyUsage.viewCount >= FREE_DAILY_LIMIT) {
          return false;
        }
        
        // Update view count
        let newViewCount = 1;
        if (dailyUsage && dailyUsage.date === today) {
          newViewCount = (dailyUsage.viewCount || 0) + 1;
        }

        const updatedUsage = {
          date: today,
          viewCount: newViewCount
        };

        setIsLoading(true);
        
        // Update Firestore (reuse docRef from above)
        await updateDoc(docRef, {
          dailyUsage: updatedUsage
        });

        // Update local state
        setUserProfile(prev => ({
          ...prev,
          dailyUsage: updatedUsage
        }));

        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error tracking view:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // AI-specific tracking (same logic as PWA)
  const hasReachedAILimit = useCallback(() => {
    if (!userProfile) return false;
    const today = getTodayString();
    const aiLimit = hasPremium() ? PREMIUM_DAILY_AI_LIMIT : FREE_DAILY_AI_LIMIT;
    const aiUsage = userProfile.dailyUsage?.aiItineraries;
    if (!aiUsage || aiUsage.date !== today) return false;
    return aiUsage.count >= aiLimit;
  }, [userProfile, hasPremium]);

  const getRemainingAICreations = useCallback(() => {
    if (!userProfile) return 0;
    const today = getTodayString();
    const aiLimit = hasPremium() ? PREMIUM_DAILY_AI_LIMIT : FREE_DAILY_AI_LIMIT;
    const aiUsage = userProfile.dailyUsage?.aiItineraries;
    if (!aiUsage || aiUsage.date !== today) return aiLimit;
    return Math.max(0, aiLimit - aiUsage.count);
  }, [userProfile, hasPremium]);

  const trackAICreation = useCallback(async (): Promise<boolean> => {
    const userIdNow = getCurrentUserId();
    if (!userIdNow) {
      console.error('No user ID or profile found');
      return false;
    }

    // Determine today's date and limits
    const today = getTodayString();
    const aiLimit = hasPremium() ? PREMIUM_DAILY_AI_LIMIT : FREE_DAILY_AI_LIMIT;

    // Start with any available authoritative usage (profile first)
    let currentAIUsage: any = userProfile?.dailyUsage?.aiItineraries;
    
    // Fetch latest from Firestore to avoid race conditions
    try {
      const userRef = doc((firebaseCfg as any).db, 'users', userIdNow);
      const snap = await getDoc(userRef);
      if (snap && snap.exists()) {
        const data = snap.data();
        currentAIUsage = data?.dailyUsage?.aiItineraries || currentAIUsage;
      }
    } catch (e) {
      // Non-fatal: fall back to any available local profile
      console.warn('[useUsageTracking] failed to fetch latest AI usage before increment', e);
    }
    
    let newCount = 1;
    if (currentAIUsage && currentAIUsage.date === today) {
      if (currentAIUsage.count >= aiLimit) {
        // Already reached or exceeded
        return false;
      }
      newCount = currentAIUsage.count + 1;
    }

    const updatedAIUsage = {
      date: today,
      count: newCount,
    };

    setIsLoading(true);
    try {
      const userRef = doc((firebaseCfg as any).db, 'users', userIdNow);
      // Use dot-path to update nested field (matching PWA)
      await updateDoc(userRef, {
        ['dailyUsage.aiItineraries']: updatedAIUsage,
      });

      // Update local state
      const updatedProfile = {
        ...userProfile,
        dailyUsage: {
          ...(userProfile?.dailyUsage || { date: today, viewCount: 0 }),
          aiItineraries: updatedAIUsage,
        },
      };
      setUserProfile(updatedProfile);

      return true;
    } catch (error) {
      console.error('Error tracking AI creation:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, hasPremium]);

  return {
    hasReachedLimit,
    trackView,
    hasPremium,
    isLoading,
    userProfile,
    refreshProfile: loadUserProfile, // Add refresh function
    // AI-specific methods
    hasReachedAILimit,
    getRemainingAICreations,
    trackAICreation,
    // Usage stats
    dailyViewCount: userProfile?.dailyUsage?.viewCount || 0,
    dailyAICount: userProfile?.dailyUsage?.aiItineraries?.count || 0,
  };
};