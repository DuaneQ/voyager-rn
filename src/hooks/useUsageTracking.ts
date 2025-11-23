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
  useEffect(() => {
    const loadUserProfile = async () => {
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
    };

    loadUserProfile();
  }, []);

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
    if (!userIdNow || !userProfile) {
      console.error('No user ID or profile found');
      return false;
    }

    if (hasReachedLimit()) {
      
      return false;
    }

    setIsLoading(true);
    try {
      const today = getTodayString();
      const currentUsage = userProfile.dailyUsage;
      
      let newViewCount = 1;
      
      // If usage exists and is for today, increment it
      if (currentUsage && currentUsage.date === today) {
        newViewCount = (currentUsage.viewCount || 0) + 1;
      }

      const updatedUsage = {
        date: today,
        viewCount: newViewCount
      };

      // Update Firestore (same as PWA)
  const userRef = doc((firebaseCfg as any).db, 'users', userIdNow);
      await updateDoc(userRef, {
        dailyUsage: updatedUsage
      });

      // Update local state
      setUserProfile(prev => ({
        ...prev,
        dailyUsage: updatedUsage
      }));

      return true;

    } catch (error) {
      console.error('Error tracking view:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, hasReachedLimit]);

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
    if (!userIdNow || !userProfile) {
      console.error('No user ID or profile found');
      return false;
    }

    if (hasReachedAILimit()) {
      
      return false;
    }

    setIsLoading(true);
    try {
      const today = getTodayString();
      const aiLimit = hasPremium() ? PREMIUM_DAILY_AI_LIMIT : FREE_DAILY_AI_LIMIT;
      const currentAIUsage = userProfile.dailyUsage?.aiItineraries;
      
      let newCount = 1;
      
      if (currentAIUsage && currentAIUsage.date === today) {
        newCount = (currentAIUsage.count || 0) + 1;
      }

      const updatedAIUsage = {
        date: today,
        count: newCount
      };

      // Update the daily usage structure
      const updatedDailyUsage = {
        ...userProfile.dailyUsage,
        aiItineraries: updatedAIUsage
      };

  const userRef = doc((firebaseCfg as any).db, 'users', userIdNow);
      await updateDoc(userRef, {
        dailyUsage: updatedDailyUsage
      });

      setUserProfile(prev => ({
        ...prev,
        dailyUsage: updatedDailyUsage
      }));

      return true;

    } catch (error) {
      console.error('Error tracking AI creation:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, hasPremium, hasReachedAILimit]);

  return {
    hasReachedLimit,
    trackView,
    hasPremium,
    isLoading,
    userProfile,
    // AI-specific methods
    hasReachedAILimit,
    getRemainingAICreations,
    trackAICreation,
    // Usage stats
    dailyViewCount: userProfile?.dailyUsage?.viewCount || 0,
    dailyAICount: userProfile?.dailyUsage?.aiItineraries?.count || 0,
  };
};