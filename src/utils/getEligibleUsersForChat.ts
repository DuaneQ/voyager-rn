/**
 * Chat eligibility utilities for React Native
 * Matches PWA implementation for finding users that can be added to a chat
 */

import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '../../firebase-config';

/**
 * Returns a deduplicated list of user IDs that the current user is connected to,
 * excluding users already in the current chat and the current user.
 * 
 * This function queries all connections where the current user is a member,
 * then collects all other users from those connections (existing 1:1 matches)
 * who are not already in the current chat.
 * 
 * @param currentUserId - The user performing the add action
 * @param currentChatUserIds - Array of user IDs already in the current chat
 * @returns Array of { userId, profile? } for eligible users
 */
export async function getEligibleUsersForChat(
  currentUserId: string,
  currentChatUserIds: string[]
): Promise<Array<{ userId: string; profile?: any }>> {
  const db = getFirestore(app);
  
  // Query all connections where currentUserId is a member
  const q = query(
    collection(db, 'connections'),
    where('users', 'array-contains', currentUserId)
  );
  
  const snapshot = await getDocs(q);
  const userIdSet = new Set<string>();
  
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    (data.users || []).forEach((uid: string) => {
      // Add user if they're not the current user and not already in the chat
      if (uid !== currentUserId && !currentChatUserIds.includes(uid)) {
        userIdSet.add(uid);
      }
    });
  });
  
  // Return as array of objects (can be extended to fetch user profiles)
  return Array.from(userIdSet).map(userId => ({ userId }));
}
