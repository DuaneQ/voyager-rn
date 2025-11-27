/**
 * useTypingIndicator Hook
 * Provides debounced typing indicator functionality to reduce Firestore writes.
 * 
 * Features:
 * - 500ms debouncing to prevent excessive writes
 * - Automatic cleanup on unmount
 * - Optimized for real-time chat UX
 * 
 * Usage:
 * const { setTyping } = useTypingIndicator(connectionId, userId);
 * setTyping(true); // User starts typing
 * setTyping(false); // User stops typing
 */

import { useCallback, useRef, useEffect } from 'react';
import { getChatService } from '../../services/chat/ChatService';

interface UseTypingIndicatorResult {
  setTyping: (isTyping: boolean) => void;
}

const TYPING_DEBOUNCE_MS = 500;

/**
 * Hook for managing typing indicator state with debouncing.
 * 
 * @param connectionId - The connection document ID
 * @param userId - The current user's ID
 * @returns setTyping function to update typing status
 */
export function useTypingIndicator(
  connectionId: string | null | undefined,
  userId: string | null | undefined
): UseTypingIndicatorResult {
  const chatService = getChatService();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastValueRef = useRef<boolean | null>(null);

  /**
   * Clear any pending debounce timer.
   */
  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  /**
   * Set typing status with debouncing.
   * - Immediately sets true (user starts typing)
   * - Debounces false (user stops typing after 500ms)
   */
  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!connectionId || !userId) return;

      // If same value as last update, skip
      if (lastValueRef.current === isTyping) return;

      clearDebounce();

      if (isTyping) {
        // Immediately show typing indicator
        lastValueRef.current = true;
        chatService.setTypingStatus(connectionId, userId, true).catch((err) => {
          console.error('Error setting typing status:', err);
        });
      } else {
        // Debounce "stopped typing" to avoid rapid on/off flicker
        debounceTimerRef.current = setTimeout(() => {
          lastValueRef.current = false;
          chatService.setTypingStatus(connectionId, userId, false).catch((err) => {
            console.error('Error clearing typing status:', err);
          });
        }, TYPING_DEBOUNCE_MS);
      }
    },
    [connectionId, userId, chatService, clearDebounce]
  );

  /**
   * Cleanup on unmount: clear typing status and debounce timer.
   */
  useEffect(() => {
    return () => {
      clearDebounce();
      
      // Clear typing status on unmount if it was true
      if (connectionId && userId && lastValueRef.current) {
        chatService.setTypingStatus(connectionId, userId, false).catch((err) => {
          console.error('Error clearing typing on unmount:', err);
        });
      }
    };
  }, [connectionId, userId, chatService, clearDebounce]);

  return { setTyping };
}
