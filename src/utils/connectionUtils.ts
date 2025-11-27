/**
 * Connection utilities for React Native
 * Matches PWA implementation for adding/removing users from group chats
 * 
 * IMPORTANT: These functions mirror the PWA connectionUtils.ts to ensure
 * consistent behavior between web and mobile clients sharing the same Firestore backend.
 */

import { getFirestore, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { app } from '../../firebase-config';

/**
 * Adds a user to a connection, tracking who added them.
 * Only the user who added another user can remove them later.
 * 
 * @param connectionId - The connection document ID
 * @param userIdToAdd - The userId to add to the chat
 * @param addedByUserId - The userId who is adding them
 * @throws Error if connection not found or user already in chat
 */
export async function addUserToConnection(
  connectionId: string,
  userIdToAdd: string,
  addedByUserId: string
): Promise<boolean> {
  // All Firestore calls must be inside the function for Jest mocks to work
  const db = getFirestore(app);
  const connRef = doc(db, 'connections', connectionId);
  const connSnap = await getDoc(connRef);
  
  if (!connSnap.exists()) {
    throw new Error('Connection not found');
  }
  
  const data = connSnap.data();
  if (data.users?.includes(userIdToAdd)) {
    throw new Error('User already in chat');
  }
  
  // Add to users array and track who added them in addedUsers
  await updateDoc(connRef, {
    users: arrayUnion(userIdToAdd),
    addedUsers: arrayUnion({ userId: userIdToAdd, addedBy: addedByUserId })
  });
  
  return true;
}

/**
 * Removes a user from a connection, only if the requesting user added them.
 * Enforces the rule: only the user who added someone can remove them.
 * 
 * @param connectionId - The connection document ID
 * @param userIdToRemove - The userId to remove from the chat
 * @param requestingUserId - The userId requesting the removal
 * @throws Error if connection not found or requesting user didn't add the target user
 */
export async function removeUserFromConnection(
  connectionId: string,
  userIdToRemove: string,
  requestingUserId: string
): Promise<boolean> {
  // All Firestore calls must be inside the function for Jest mocks to work
  const db = getFirestore(app);
  const connRef = doc(db, 'connections', connectionId);
  const connSnap = await getDoc(connRef);
  
  if (!connSnap.exists()) {
    throw new Error('Connection not found');
  }
  
  const data = connSnap.data();
  
  // Find the addedUsers entry for the user to remove
  const addedEntry = (data.addedUsers || []).find(
    (entry: { userId: string; addedBy: string }) => entry.userId === userIdToRemove
  );
  
  if (!addedEntry || addedEntry.addedBy !== requestingUserId) {
    throw new Error('You can only remove users you added');
  }
  
  // Remove from both users array and addedUsers tracking
  await updateDoc(connRef, {
    users: arrayRemove(userIdToRemove),
    addedUsers: arrayRemove(addedEntry)
  });
  
  return true;
}
