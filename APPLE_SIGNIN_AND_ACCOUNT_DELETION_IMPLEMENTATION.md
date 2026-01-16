# Apple Sign-In & Account Deletion Implementation Guide

## Overview
This document provides the complete implementation for:
1. **Sign in with Apple** (Apple App Store requirement 4.8)
2. **Account Deletion** (Apple App Store requirement 5.1.1(v))

## Part 1: Apple Sign-In Implementation

### Step 1: Apple Developer Console Setup (COMPLETED ✅)
- Bundle ID: `com.travalpass.app` - Sign in with Apple enabled
- Firebase Authentication: Apple provider enabled

### Step 2: Update app.json Configuration

Add the Apple Sign-In entitlement to your iOS configuration:

```json
{
  "expo": {
    "ios": {
      "entitlements": {
        "com.apple.developer.applesignin": ["Default"]
      }
    }
  }
}
```

### Step 3: Implement Apple Sign-In in AuthContext

**File:** `src/context/AuthContext.tsx`

Add imports:
```typescript
import * as AppleAuthentication from 'expo-apple-authentication';
import { OAuthProvider } from 'firebase/auth';
```

Add Apple Sign-In methods to AuthContext interface:
```typescript
interface AuthContextType {
  // ... existing methods
  signInWithApple: () => Promise<void>;
  signUpWithApple: () => Promise<void>;
}
```

Add implementation inside AuthProvider:
```typescript
/**
 * Apple Sign-In
 * Scenario 1: New user tries to sign in → redirect to sign up
 * Scenario 4: Existing user signs in → success
 */
const signInWithApple = async () => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Create Firebase OAuth credential
    const provider = new OAuthProvider('apple.com');
    const oauthCredential = provider.credential({
      idToken: credential.identityToken!,
      rawNonce: credential.realUserStatus ? 'nonce' : undefined,
    });

    // Sign in with Firebase
    const result = await signInWithCredential(auth, oauthCredential);
    
    // Check if user profile exists in Firestore
    const userRef = doc(db, 'users', result.user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // New user trying to sign in - need to sign up first
      await signOut(auth);
      throw new Error('ACCOUNT_NOT_FOUND');
    }
    
    // Existing user - success
    console.log('[AuthContext] Apple sign-in successful');
    
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      // User canceled - don't throw error
      console.log('[AuthContext] Apple sign-in canceled by user');
      return;
    }
    console.error('[AuthContext] Apple sign-in failed:', error);
    throw error;
  }
};

/**
 * Apple Sign-Up
 * Scenario 2: Existing user tries to sign up → sign them in
 * Scenario 3: New user signs up → create profile and sign in
 */
const signUpWithApple = async () => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Create Firebase OAuth credential
    const provider = new OAuthProvider('apple.com');
    const oauthCredential = provider.credential({
      idToken: credential.identityToken!,
      rawNonce: credential.realUserStatus ? 'nonce' : undefined,
    });

    // Sign in with Firebase
    const result = await signInWithCredential(auth, oauthCredential);
    
    // Check if user profile exists
    const userRef = doc(db, 'users', result.user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      // Existing user trying to sign up - just sign them in
      console.log('[AuthContext] Apple user already exists, signing in');
      return;
    }
    
    // New user - create profile
    const displayName = credential.fullName 
      ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
      : result.user.email?.split('@')[0] || 'Apple User';
    
    const userProfile = {
      uid: result.user.uid,
      email: result.user.email || credential.email || '',
      username: displayName,
      displayName: displayName,
      photoURL: result.user.photoURL || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      emailVerified: true, // Apple sign-in is always verified
      hasAcceptedTerms: false,
      provider: 'apple',
    };

    await setDoc(userRef, userProfile);
    console.log('[AuthContext] Apple sign-up successful, profile created');
    
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      console.log('[AuthContext] Apple sign-up canceled by user');
      return;
    }
    console.error('[AuthContext] Apple sign-up failed:', error);
    throw error;
  }
};
```

Add to context value:
```typescript
return (
  <AuthContext.Provider value={{
    // ... existing values
    signInWithApple,
    signUpWithApple,
  }}>
    {children}
  </AuthContext.Provider>
);
```

### Step 4: Create Apple Sign-In Button Component

**File:** `src/components/auth/buttons/AppleSignInButton.tsx`

```typescript
import React from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

interface AppleSignInButtonProps {
  onPress: () => void;
  buttonType?: 'sign-in' | 'sign-up';
  isLoading?: boolean;
}

const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({
  onPress,
  buttonType = 'sign-in',
  isLoading = false,
}) => {
  // Only show on iOS
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={
        buttonType === 'sign-up'
          ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
          : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
      }
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={4}
      style={{ width: '100%', height: 48 }}
      onPress={onPress}
      disabled={isLoading}
    />
  );
};

export default AppleSignInButton;
```

### Step 5: Add Apple Button to LoginForm

**File:** `src/components/auth/forms/LoginForm.tsx`

Add import:
```typescript
import AppleSignInButton from '../buttons/AppleSignInButton';
```

Add prop:
```typescript
interface LoginFormProps {
  // ... existing props
  onAppleSignIn: () => void;
}
```

Add button after Google button (around line 130):
```typescript
{/* Apple Sign-In Button - iOS Only */}
<AppleSignInButton 
  onPress={onAppleSignIn}
  buttonType="sign-in"
  isLoading={isLoading}
/>
```

### Step 6: Add Apple Button to RegisterForm

**File:** `src/components/auth/forms/RegisterForm.tsx`

Add import:
```typescript
import AppleSignInButton from '../buttons/AppleSignInButton';
```

Add prop:
```typescript
interface RegisterFormProps {
  // ... existing props
  onAppleSignUp: () => void;
}
```

Add button after Google button:
```typescript
{/* Apple Sign-Up Button - iOS Only */}
<AppleSignInButton 
  onPress={onAppleSignUp}
  buttonType="sign-up"
  isLoading={isLoading}
/>
```

### Step 7: Wire Up Apple Handlers in AuthPage

**File:** `src/pages/AuthPage.tsx`

Add handlers:
```typescript
/**
 * Apple Sign-In Handler
 */
const handleAppleSignIn = async () => {
  setIsSubmitting(true);
  try {
    await signInWithApple();
    if (Platform.OS === 'web') {
      showAlert('success', 'Login successful! Welcome back.');
    }
  } catch (error: any) {
    if (error.message === 'ACCOUNT_NOT_FOUND') {
      showAlert(
        'error',
        'No account found for this Apple ID. Please sign up first.'
      );
      setMode('register');
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Apple sign-in failed';
      showAlert('error', errorMessage);
    }
  } finally {
    setIsSubmitting(false);
  }
};

/**
 * Apple Sign-Up Handler
 */
const handleAppleSignUp = async () => {
  setIsSubmitting(true);
  try {
    await signUpWithApple();
    showAlert('success', 'Successfully signed up with Apple! Welcome to TravalPass.');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Apple sign-up failed';
    showAlert('error', errorMessage);
  } finally {
    setIsSubmitting(false);
  }
};
```

Pass to forms:
```typescript
// In renderForm() switch statement
case 'login':
  return (
    <LoginForm
      // ... existing props
      onAppleSignIn={handleAppleSignIn}
    />
  );

case 'register':
  return (
    <RegisterForm
      // ... existing props
      onAppleSignUp={handleAppleSignUp}
    />
  );
```

---

## Part 2: Account Deletion Implementation

### Step 1: Create Account Deletion Service

**File:** `src/services/account/AccountDeletionService.ts`

```typescript
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

      console.log('[AccountDeletion] Account successfully deleted:', userId);
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
```

### Step 2: Add Account Deletion UI to ProfilePage

**File:** `src/pages/ProfilePage.tsx`

Add imports:
```typescript
import { accountDeletionService } from '../services/account/AccountDeletionService';
import { useNavigation } from '@react-navigation/native';
```

Add state and handler:
```typescript
const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
const [deletePassword, setDeletePassword] = useState('');
const [isDeleting, setIsDeleting] = useState(false);
const navigation = useNavigation();

const handleDeleteAccount = async () => {
  if (!deletePassword) {
    showAlert('error', 'Please enter your password to confirm account deletion');
    return;
  }

  setIsDeleting(true);
  try {
    await accountDeletionService.deleteAccount(deletePassword);
    showAlert('success', 'Your account has been deleted. We hope to see you again!');
    // User will be automatically logged out and redirected to auth page
  } catch (error: any) {
    console.error('[ProfilePage] Delete account error:', error);
    if (error.code === 'auth/wrong-password') {
      showAlert('error', 'Incorrect password. Please try again.');
    } else if (error.code === 'auth/requires-recent-login') {
      showAlert('error', 'For security, please log out and log back in before deleting your account.');
    } else {
      showAlert('error', 'Failed to delete account. Please try again or contact support.');
    }
  } finally {
    setIsDeleting(false);
    setShowDeleteConfirmation(false);
    setDeletePassword('');
  }
};
```

Add UI components (add this section before the closing ScrollView):
```typescript
{/* Account Deletion Section */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Danger Zone</Text>
  
  <TouchableOpacity
    style={styles.deleteAccountButton}
    onPress={() => setShowDeleteConfirmation(true)}
    disabled={isDeleting}
  >
    <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
  </TouchableOpacity>
</View>

{/* Delete Confirmation Modal */}
{showDeleteConfirmation && (
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Delete Account?</Text>
      <Text style={styles.modalText}>
        This action cannot be undone. All your data will be permanently deleted,
        including your profile, itineraries, connections, and messages.
      </Text>
      <Text style={styles.modalWarning}>
        Your usage agreement acceptance will be preserved for legal compliance.
      </Text>
      
      <TextInput
        style={styles.passwordInput}
        placeholder="Enter your password to confirm"
        secureTextEntry
        value={deletePassword}
        onChangeText={setDeletePassword}
        autoCapitalize="none"
      />
      
      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={() => {
            setShowDeleteConfirmation(false);
            setDeletePassword('');
          }}
          disabled={isDeleting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modalButton, styles.confirmDeleteButton]}
          onPress={handleDeleteAccount}
          disabled={isDeleting || !deletePassword}
        >
          <Text style={styles.confirmDeleteButtonText}>
            {isDeleting ? 'Deleting...' : 'Delete Forever'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}
```

Add styles:
```typescript
section: {
  marginBottom: 24,
},
sectionTitle: {
  fontSize: 18,
  fontWeight: '600',
  marginBottom: 12,
  color: '#333',
},
deleteAccountButton: {
  backgroundColor: '#dc3545',
  padding: 14,
  borderRadius: 8,
  alignItems: 'center',
},
deleteAccountButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: '600',
},
modalOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},
modalContent: {
  backgroundColor: 'white',
  borderRadius: 12,
  padding: 24,
  width: '100%',
  maxWidth: 400,
},
modalTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  marginBottom: 12,
  color: '#dc3545',
},
modalText: {
  fontSize: 14,
  marginBottom: 12,
  color: '#666',
  lineHeight: 20,
},
modalWarning: {
  fontSize: 12,
  marginBottom: 16,
  color: '#999',
  fontStyle: 'italic',
},
passwordInput: {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  padding: 12,
  marginBottom: 16,
  fontSize: 14,
},
modalButtons: {
  flexDirection: 'row',
  gap: 12,
},
modalButton: {
  flex: 1,
  padding: 14,
  borderRadius: 8,
  alignItems: 'center',
},
cancelButton: {
  backgroundColor: '#f0f0f0',
},
cancelButtonText: {
  color: '#333',
  fontWeight: '600',
},
confirmDeleteButton: {
  backgroundColor: '#dc3545',
},
confirmDeleteButtonText: {
  color: 'white',
  fontWeight: '600',
},
```

---

## Testing Instructions

### Test Apple Sign-In (iOS Only)
1. Build the app: `eas build --platform ios --profile preview`
2. Install on physical iOS device (simulators don't support Apple Sign-In)
3. Test sign-in flow: Try logging in with Apple ID
4. Test sign-up flow: Try creating account with Apple ID
5. Verify profile creation in Firebase Console

### Test Account Deletion
1. Create a test account
2. Add some data (profile, itinerary, connection)
3. Go to Profile page → Scroll to "Danger Zone"
4. Click "Delete Account"
5. Enter password → Confirm
6. Verify in Firebase Console:
   - User auth account deleted
   - User Firestore documents deleted
   - Storage files deleted
   - Usage agreement record preserved

---

## Next Steps for Apple Review

1. **Build new iOS version** with Apple Sign-In and Account Deletion
2. **Test thoroughly** on physical iOS device
3. **Update app screenshots** to show new Apple Sign-In button
4. **Submit to App Store** with note:
   - "Apple Sign-In implemented (requirement 4.8)"
   - "Account deletion feature added in Profile > Danger Zone (requirement 5.1.1(v))"
5. **Reply to App Review** explaining where to find account deletion feature

---

## Important Notes

- **Apple Sign-In only works on iOS** - gracefully hidden on Android
- **Google Sign-In still available** - gives users choice
- **Account deletion is immediate** - no grace period
- **Usage agreement preserved** - for legal compliance
- **Re-authentication required** - for security
