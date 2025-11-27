/**
 * Hook for removing a connection (unmatching)
 * Matches PWA implementation for deleting connection documents
 */

import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
import { app } from '../../firebase-config';

/**
 * Hook that provides a function to remove/delete a connection.
 * This permanently deletes the connection document and all its messages.
 * 
 * @returns Function that accepts connectionId and deletes the connection
 */
export function useRemoveConnection() {
  const db = getFirestore(app);

  const removeConnection = async (connectionId: string) => {
    try {
      await deleteDoc(doc(db, 'connections', connectionId));
      return { success: true };
    } catch (error) {
      console.error('Failed to remove connection:', error);
      return { success: false, error };
    }
  };

  return removeConnection;
}
