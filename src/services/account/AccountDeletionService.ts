/**
 * Account Deletion Service
 * Handles complete account deletion including:
 * - Firebase Auth account
 * - User profile data
 * - User's itineraries
 * - User's connections
 * - User's videos and photos
 * - Firebase Storage files
 * 
 * Note: Usage agreement acceptance record is preserved for legal compliance
 */

import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '../../config/firebaseConfig';

export class AccountDeletionService {
  /**
   * Delete user account and all associated data
   * @param password - User's password for re-authentication
   */
  async deleteAccount(password?: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const userId = user.uid;

    try {
      // Step 1: Re-authenticate user (required by Firebase for account deletion)
      if (password && user.email) {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      }

      // Step 2: Mark account as deleted (preserve usage agreement record)
      await this.markAccountAsDeleted(userId);

      // Step 3: Delete user data in Firestore
      await this.deleteFirestoreData(userId);

      // Step 4: Delete user files in Storage
      await this.deleteStorageFiles(userId);

      // Step 5: Delete Firebase Auth account (must be last)
      await deleteUser(user);
    } catch (error) {
      console.error('[AccountDeletion] Error deleting account:', error);
      throw error;
    }
  }

  /**
   * Mark account as deleted (preserves usage agreement for legal compliance)
   */
  private async markAccountAsDeleted(userId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      deletedAt: serverTimestamp(),
      deleted: true,
      // hasAcceptedTerms is NOT removed - preserved for legal compliance
    });
  }

  /**
   * Delete all Firestore data for user
   */
  private async deleteFirestoreData(userId: string): Promise<void> {
    const batch = writeBatch(db);
    let operationCount = 0;
    const MAX_BATCH_SIZE = 500;

    // Helper to commit batch when it gets too large
    const commitBatchIfNeeded = async () => {
      if (operationCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        operationCount = 0;
      }
    };

    // Delete user's itineraries
    const itinerariesRef = collection(db, 'itineraries');
    const itinerariesQuery = query(itinerariesRef, where('userId', '==', userId));
    const itinerariesSnapshot = await getDocs(itinerariesQuery);
    
    for (const docSnapshot of itinerariesSnapshot.docs) {
      batch.delete(docSnapshot.ref);
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Delete user's connections (both where user is initiator or recipient)
    const connectionsRef = collection(db, 'connections');
    
    // Delete connections where user is the first user
    const connections1Query = query(connectionsRef, where('user1', '==', userId));
    const connections1Snapshot = await getDocs(connections1Query);
    for (const docSnapshot of connections1Snapshot.docs) {
      // Also delete chat messages subcollection
      const messagesRef = collection(docSnapshot.ref, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      for (const messageDoc of messagesSnapshot.docs) {
        batch.delete(messageDoc.ref);
        operationCount++;
        await commitBatchIfNeeded();
      }
      batch.delete(docSnapshot.ref);
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Delete connections where user is the second user
    const connections2Query = query(connectionsRef, where('user2', '==', userId));
    const connections2Snapshot = await getDocs(connections2Query);
    for (const docSnapshot of connections2Snapshot.docs) {
      const messagesRef = collection(docSnapshot.ref, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      for (const messageDoc of messagesSnapshot.docs) {
        batch.delete(messageDoc.ref);
        operationCount++;
        await commitBatchIfNeeded();
      }
      batch.delete(docSnapshot.ref);
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Delete user's videos
    const videosRef = collection(db, 'videos');
    const videosQuery = query(videosRef, where('userId', '==', userId));
    const videosSnapshot = await getDocs(videosQuery);
    for (const docSnapshot of videosSnapshot.docs) {
      batch.delete(docSnapshot.ref);
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Delete user profile (last in Firestore)
    const userRef = doc(db, 'users', userId);
    batch.delete(userRef);
    operationCount++;

    // Commit final batch
    if (operationCount > 0) {
      await batch.commit();
    }
  }

  /**
   * Delete all Storage files for user
   */
  private async deleteStorageFiles(userId: string): Promise<void> {
    // Delete all files in user's storage directory
    const userStorageRef = ref(storage, `users/${userId}`);
    
    try {
      const listResult = await listAll(userStorageRef);
      
      // Delete all files
      const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
      await Promise.all(deletePromises);
      
      // Delete all subdirectories recursively
      for (const folderRef of listResult.prefixes) {
        await this.deleteFolder(folderRef);
      }
    } catch (error) {
      // Folder might not exist, which is fine
      console.log('[AccountDeletion] No storage files found or error deleting:', error);
    }

    // Also delete profile photo if exists
    try {
      const photoRef = ref(storage, `photos/${userId}.jpg`);
      await deleteObject(photoRef);
    } catch (error) {
      // Photo might not exist
      console.log('[AccountDeletion] No profile photo found or error deleting');
    }
  }

  /**
   * Recursively delete a folder in Firebase Storage
   */
  private async deleteFolder(folderRef: any): Promise<void> {
    const listResult = await listAll(folderRef);
    
    const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
    await Promise.all(deletePromises);
    
    for (const subFolderRef of listResult.prefixes) {
      await this.deleteFolder(subFolderRef);
    }
  }
}

export const accountDeletionService = new AccountDeletionService();
